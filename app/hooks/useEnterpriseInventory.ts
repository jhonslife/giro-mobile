/**
 * Hook para gerenciar inventário Enterprise com suporte offline
 */

import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { useEnterpriseInventoryStore } from '@/stores/enterpriseInventoryStore';
import { useWebSocket } from './useWebSocket';
import type {
  EnterpriseInventory,
  EnterpriseInventoryItem,
  EnterpriseInventorySummary,
  AvailableLocation,
  EnterpriseInventoryStartPayload,
  EnterpriseInventoryStartResponse,
  InventoryCountSync,
  PendingCount,
} from '@/types/enterprise-inventory';

// Get a unique device identifier
async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    return Application.getAndroidId() || 'android-unknown';
  } else if (Platform.OS === 'ios') {
    return (await Application.getIosIdForVendorAsync()) || 'ios-unknown';
  }
  return 'unknown-device';
}

interface UseEnterpriseInventoryResult {
  // State
  currentInventory: EnterpriseInventory | null;
  items: EnterpriseInventoryItem[];
  availableLocations: AvailableLocation[];
  selectedLocationId: string | null;
  summary: EnterpriseInventorySummary;
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCountsCount: number;
  error: string | null;

  // Location actions
  loadAvailableLocations: () => Promise<void>;
  selectLocation: (locationId: string) => void;

  // Inventory actions
  startInventory: (locationId: string, name?: string, notes?: string) => Promise<void>;
  countProduct: (productId: string, quantity: number, notes?: string) => Promise<void>;
  skipProduct: (productId: string) => void;
  finishInventory: (applyAdjustments: boolean) => Promise<void>;
  cancelInventory: () => Promise<void>;

  // Offline actions
  syncPendingCounts: () => Promise<void>;

  // Getters
  getNextPendingItem: () => EnterpriseInventoryItem | undefined;
  getItemByBarcode: (barcode: string) => EnterpriseInventoryItem | undefined;
}

export function useEnterpriseInventory(): UseEnterpriseInventoryResult {
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const {
    currentInventory,
    items,
    availableLocations,
    selectedLocationId,
    isLoading,
    isSyncing,
    pendingCounts,
    setCurrentInventory,
    setItems,
    updateItem,
    setAvailableLocations,
    setSelectedLocationId,
    setIsLoading,
    addPendingCount,
    markCountSynced,
    markCountFailed,
    clearSyncedCounts,
    setIsSyncing,
    setLastSyncAt,
    getSummary,
    getPendingItems,
    getPendingCountsForSync,
    reset,
  } = useEnterpriseInventoryStore();

  const { send, isConnected } = useWebSocket();

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && isConnected && getPendingCountsForSync().length > 0) {
      syncPendingCounts();
    }
  }, [isOnline, isConnected]);

  // Load available locations
  const loadAvailableLocations = useCallback(async () => {
    if (!isConnected) {
      setError('Não conectado ao servidor');
      return;
    }

    setIsLoading(true);
    try {
      const response = await send<{}, { locations: AvailableLocation[] }>(
        'enterprise.inventory.locations',
        {}
      );

      if (response.success && response.data) {
        setAvailableLocations(response.data.locations);
      } else {
        throw new Error(response.error?.message || 'Falha ao carregar localizações');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, send, setAvailableLocations, setIsLoading]);

  // Select location
  const selectLocation = useCallback(
    (locationId: string) => {
      setSelectedLocationId(locationId);
    },
    [setSelectedLocationId]
  );

  // Start inventory
  const startInventory = useCallback(
    async (locationId: string, name?: string, notes?: string) => {
      if (!isConnected) {
        setError('Não conectado ao servidor');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: EnterpriseInventoryStartPayload = {
          locationId,
          name,
          notes,
        };

        const response = await send<
          EnterpriseInventoryStartPayload,
          EnterpriseInventoryStartResponse
        >('enterprise.inventory.start', payload);

        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Falha ao iniciar inventário');
        }

        const data = response.data;

        const inventory: EnterpriseInventory = {
          id: data.inventoryId,
          code: data.code,
          name: data.name,
          locationId: data.location.locationId,
          location: data.location,
          status: 'IN_PROGRESS',
          startedAt: data.startedAt,
          startedById: '',
          startedByName: '',
          expectedProducts: data.expectedProducts,
          countedProducts: 0,
          productsWithDifference: 0,
        };

        setCurrentInventory(inventory);
        setItems(data.items);
        setSelectedLocationId(locationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao iniciar inventário');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, setCurrentInventory, setItems, setSelectedLocationId, setIsLoading]
  );

  // Count product (with offline support)
  const countProduct = useCallback(
    async (productId: string, quantity: number, notes?: string) => {
      const inventory = currentInventory;
      if (!inventory) {
        setError('Nenhum inventário em andamento');
        return;
      }

      const countedAt = new Date().toISOString();

      // Update local state immediately
      updateItem(productId, {
        countedQuantity: quantity,
        status: 'counted',
        countedAt,
        notes,
        difference:
          quantity - (items.find((i) => i.productId === productId)?.expectedQuantity || 0),
      });

      // If online and connected, send immediately
      if (isOnline && isConnected) {
        try {
          const response = await send<
            { inventoryId: string; productId: string; quantity: number; notes?: string },
            { success: boolean }
          >('enterprise.inventory.count', {
            inventoryId: inventory.id,
            productId,
            quantity,
            notes,
          });

          if (!response.success) {
            throw new Error(response.error?.message || 'Falha ao registrar contagem');
          }
        } catch (err) {
          // If send fails, save for later sync
          const deviceId = await getDeviceId();
          addPendingCount({
            inventoryId: inventory.id,
            locationId: inventory.locationId,
            productId,
            quantity,
            notes,
            countedAt,
            countedById: '', // Will be filled by server
            deviceId,
          });
        }
      } else {
        // Offline - save for later sync
        const deviceId = await getDeviceId();
        addPendingCount({
          inventoryId: inventory.id,
          locationId: inventory.locationId,
          productId,
          quantity,
          notes,
          countedAt,
          countedById: '',
          deviceId,
        });
      }
    },
    [currentInventory, items, isOnline, isConnected, send, updateItem, addPendingCount]
  );

  // Skip product
  const skipProduct = useCallback(
    (productId: string) => {
      updateItem(productId, {
        status: 'skipped',
      });
    },
    [updateItem]
  );

  // Sync pending counts
  const syncPendingCounts = useCallback(async () => {
    const pending = getPendingCountsForSync();
    if (pending.length === 0 || !isConnected) return;

    setIsSyncing(true);

    // Group by inventory
    const byInventory = pending.reduce(
      (acc, count) => {
        if (!acc[count.inventoryId]) {
          acc[count.inventoryId] = [];
        }
        acc[count.inventoryId].push(count);
        return acc;
      },
      {} as Record<string, PendingCount[]>
    );

    for (const [inventoryId, counts] of Object.entries(byInventory)) {
      const sync: InventoryCountSync = {
        inventoryId,
        locationId: counts[0].locationId,
        counts: counts.map((c) => ({
          productId: c.productId,
          countedQty: c.quantity,
          countedAt: c.countedAt,
          countedBy: c.countedById,
          notes: c.notes,
        })),
        deviceId: counts[0].deviceId,
        syncedAt: new Date().toISOString(),
      };

      try {
        const response = await send<InventoryCountSync, { success: boolean }>(
          'enterprise.inventory.sync',
          sync
        );

        if (response.success) {
          counts.forEach((c) => markCountSynced(c.id));
        } else {
          counts.forEach((c) => markCountFailed(c.id, response.error?.message || 'Sync failed'));
        }
      } catch (err) {
        counts.forEach((c) =>
          markCountFailed(c.id, err instanceof Error ? err.message : 'Unknown error')
        );
      }
    }

    clearSyncedCounts();
    setLastSyncAt(new Date().toISOString());
    setIsSyncing(false);
  }, [
    isConnected,
    send,
    getPendingCountsForSync,
    markCountSynced,
    markCountFailed,
    clearSyncedCounts,
    setIsSyncing,
    setLastSyncAt,
  ]);

  // Finish inventory
  const finishInventory = useCallback(
    async (applyAdjustments: boolean) => {
      if (!currentInventory || !isConnected) return;

      // Sync any pending counts first
      await syncPendingCounts();

      setIsLoading(true);
      try {
        const response = await send<
          { inventoryId: string; applyAdjustments: boolean },
          { success: boolean }
        >('enterprise.inventory.finish', {
          inventoryId: currentInventory.id,
          applyAdjustments,
        });

        if (!response.success) {
          throw new Error(response.error?.message || 'Falha ao finalizar inventário');
        }

        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao finalizar');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentInventory, isConnected, send, syncPendingCounts, reset, setIsLoading]
  );

  // Cancel inventory
  const cancelInventory = useCallback(async () => {
    if (!currentInventory || !isConnected) return;

    setIsLoading(true);
    try {
      await send<{ inventoryId: string }, { success: boolean }>('enterprise.inventory.cancel', {
        inventoryId: currentInventory.id,
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar');
    } finally {
      setIsLoading(false);
    }
  }, [currentInventory, isConnected, send, reset, setIsLoading]);

  // Get next pending item
  const getNextPendingItem = useCallback(() => {
    return getPendingItems()[0];
  }, [getPendingItems]);

  // Get item by barcode
  const getItemByBarcode = useCallback(
    (barcode: string) => {
      return items.find((i) => i.productBarcode === barcode || i.productCode === barcode);
    },
    [items]
  );

  return {
    currentInventory,
    items,
    availableLocations,
    selectedLocationId,
    summary: getSummary(),
    isLoading,
    isOnline,
    isSyncing,
    pendingCountsCount: pendingCounts.filter((c) => !c.synced).length,
    error,

    loadAvailableLocations,
    selectLocation,
    startInventory,
    countProduct,
    skipProduct,
    finishInventory,
    cancelInventory,
    syncPendingCounts,

    getNextPendingItem,
    getItemByBarcode,
  };
}
