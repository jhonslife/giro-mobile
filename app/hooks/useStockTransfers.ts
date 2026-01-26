/**
 * Hook para gerenciamento de Transferências de Estoque
 * Suporta operações offline com sincronização automática
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import {
  StockTransfer,
  StockTransferItem,
  TransferFilters,
  TransferStatus,
  TransferType,
} from '@/types/stock-transfer';

// ==========================================================================
// Types
// ==========================================================================

interface TransferState {
  transfers: StockTransfer[];
  currentTransfer: StockTransfer | null;
  isLoading: boolean;
  error: string | null;
  filters: TransferFilters;
}

interface PendingAction {
  id: string;
  type: 'create' | 'ship' | 'receive' | 'cancel' | 'add_item' | 'remove_item';
  payload: unknown;
  createdAt: string;
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

export interface UseStockTransfersResult {
  // State
  transfers: StockTransfer[];
  currentTransfer: StockTransfer | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  isSyncing: boolean;

  // Counts
  inTransitCount: number;
  pendingReceiveCount: number;
  pendingActionsCount: number;

  // Actions
  loadTransfers: (filters?: Partial<TransferFilters>) => Promise<void>;
  loadTransfer: (id: string) => Promise<void>;
  createTransfer: (data: CreateTransferData) => Promise<string>;
  updateTransfer: (id: string, data: { toLocationId?: string; notes?: string }) => Promise<void>;
  shipTransfer: (id: string, notes?: string, vehiclePlate?: string) => Promise<void>;
  receiveTransfer: (
    id: string,
    items: Array<{ itemId: string; receivedQuantity: number; notes?: string }>
  ) => Promise<void>;
  cancelTransfer: (id: string, reason: string) => Promise<void>;
  addItem: (transferId: string, item: AddItemData) => Promise<void>;
  removeItem: (transferId: string, itemId: string) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  clearError: () => void;
}

interface CreateTransferData {
  fromLocationId: string;
  toLocationId: string;
  type?: TransferType;
  notes?: string;
}

interface AddItemData {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost?: number;
  unit?: string;
  lotId?: string;
}

// ==========================================================================
// Constants
// ==========================================================================

const STORAGE_KEYS = {
  CACHE: '@giro/transfers_cache',
  PENDING: '@giro/transfers_pending',
};

const DEFAULT_FILTERS: TransferFilters = {
  page: 1,
  limit: 20,
};

// ==========================================================================
// Hook
// ==========================================================================

export function useStockTransfers(): UseStockTransfersResult {
  const { send, isConnected, onEvent } = useWebSocket();
  const { activeContract, activeLocation } = useEnterpriseContextStore();

  const [state, setState] = useState<TransferState>({
    transfers: [],
    currentTransfer: null,
    isLoading: false,
    error: null,
    filters: DEFAULT_FILTERS,
  });

  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const mounted = useRef(true);
  const syncInProgress = useRef(false);

  // ==========================================================================
  // Network Monitoring
  // ==========================================================================
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const online = netState.isConnected === true && netState.isInternetReachable !== false;
      setIsOnline(online);

      if (online && pendingActions.length > 0 && !syncInProgress.current) {
        syncPendingActions();
      }
    });

    return () => unsubscribe();
  }, [pendingActions.length]);

  // ==========================================================================
  // Initialize
  // ==========================================================================
  useEffect(() => {
    loadFromCache();
    loadPendingActions();

    return () => {
      mounted.current = false;
    };
  }, []);

  // ==========================================================================
  // WebSocket Events
  // ==========================================================================
  useEffect(() => {
    const unsubscribeCreated = onEvent<{ transfer: StockTransfer }>(
      'enterprise.transfer.created',
      (data) => handleTransferUpdate(data.transfer)
    );

    const unsubscribeUpdated = onEvent<{ transfer: StockTransfer }>(
      'enterprise.transfer.updated',
      (data) => handleTransferUpdate(data.transfer)
    );

    const unsubscribeShipped = onEvent<{ transfer: StockTransfer }>(
      'enterprise.transfer.shipped',
      (data) => handleTransferUpdate(data.transfer)
    );

    const unsubscribeReceived = onEvent<{ transfer: StockTransfer }>(
      'enterprise.transfer.received',
      (data) => handleTransferUpdate(data.transfer)
    );

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeShipped();
      unsubscribeReceived();
    };
  }, [onEvent]);

  // ==========================================================================
  // Cache Operations
  // ==========================================================================
  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
      if (cached) {
        const data = JSON.parse(cached);
        setState((prev) => ({ ...prev, transfers: data.transfers || [] }));
      }
    } catch (error) {
      console.error('Erro ao carregar cache de transferências:', error);
    }
  };

  const saveToCache = async (transfers: StockTransfer[]) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHE,
        JSON.stringify({ transfers, cachedAt: new Date().toISOString() })
      );
    } catch (error) {
      console.error('Erro ao salvar cache de transferências:', error);
    }
  };

  const loadPendingActions = async () => {
    try {
      const pending = await AsyncStorage.getItem(STORAGE_KEYS.PENDING);
      if (pending) {
        setPendingActions(JSON.parse(pending));
      }
    } catch (error) {
      console.error('Erro ao carregar ações pendentes:', error);
    }
  };

  const savePendingActions = async (actions: PendingAction[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('Erro ao salvar ações pendentes:', error);
    }
  };

  const addPendingAction = async (
    type: PendingAction['type'],
    payload: unknown
  ): Promise<string> => {
    const action: PendingAction = {
      id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    };

    const updated = [...pendingActions, action];
    await savePendingActions(updated);
    return action.id;
  };

  // ==========================================================================
  // Update Handlers
  // ==========================================================================
  const handleTransferUpdate = (transfer: StockTransfer) => {
    if (!mounted.current) return;

    setState((prev) => {
      const exists = prev.transfers.find((t) => t.id === transfer.id);
      if (exists) {
        return {
          ...prev,
          transfers: prev.transfers.map((t) => (t.id === transfer.id ? transfer : t)),
          currentTransfer:
            prev.currentTransfer?.id === transfer.id ? transfer : prev.currentTransfer,
        };
      } else {
        return {
          ...prev,
          transfers: [transfer, ...prev.transfers],
        };
      }
    });
  };

  // ==========================================================================
  // Sync Operations
  // ==========================================================================
  const syncPendingActions = useCallback(async () => {
    if (syncInProgress.current || !isConnected || pendingActions.length === 0) {
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const unsyncedActions = pendingActions.filter((a) => !a.synced && a.retryCount < 3);

      for (const action of unsyncedActions) {
        try {
          await executeAction(action);

          setPendingActions((prev) =>
            prev.map((a) => (a.id === action.id ? { ...a, synced: true } : a))
          );
        } catch (error) {
          setPendingActions((prev) =>
            prev.map((a) =>
              a.id === action.id
                ? { ...a, retryCount: a.retryCount + 1, lastError: String(error) }
                : a
            )
          );
        }
      }

      // Clean synced actions
      const remaining = pendingActions.filter((a) => !a.synced && a.retryCount < 3);
      await savePendingActions(remaining);
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [isConnected, pendingActions]);

  const executeAction = async (action: PendingAction): Promise<void> => {
    const actionTypeMap: Record<PendingAction['type'], string> = {
      create: 'enterprise.transfer.create',
      ship: 'enterprise.transfer.ship',
      receive: 'enterprise.transfer.receive',
      cancel: 'enterprise.transfer.cancel',
      add_item: 'enterprise.transfer.add_item',
      remove_item: 'enterprise.transfer.remove_item',
    };

    const messageType = actionTypeMap[action.type];
    if (!messageType) {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    await send(messageType as any, { ...(action.payload as object), actionId: action.id });
  };

  // ==========================================================================
  // API Methods
  // ==========================================================================
  const loadTransfers = useCallback(
    async (filters?: Partial<TransferFilters>) => {
      const newFilters = { ...state.filters, ...filters };
      setState((prev) => ({ ...prev, filters: newFilters, isLoading: true, error: null }));

      if (isConnected) {
        try {
          const response = await send<
            { filters: TransferFilters; contractId?: string; locationId?: string },
            { transfers: StockTransfer[]; total: number }
          >('enterprise.transfer.list', {
            filters: newFilters,
            contractId: activeContract?.id,
            locationId: activeLocation?.id,
          });

          if (response.success && response.data) {
            setState((prev) => ({
              ...prev,
              transfers: response.data!.transfers,
              isLoading: false,
            }));
            saveToCache(response.data.transfers);
          } else {
            const errorMsg =
              typeof response.error === 'string'
                ? response.error
                : response.error?.message || 'Erro ao carregar transferências';
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMsg,
            }));
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Erro de comunicação',
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Modo offline - usando dados em cache',
        }));
      }
    },
    [state.filters, isConnected, activeContract, activeLocation, send]
  );

  const loadTransfer = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (isConnected) {
        try {
          const response = await send<{ id: string }, { transfer: StockTransfer }>(
            'enterprise.transfer.get',
            { id }
          );

          if (response.success && response.data) {
            setState((prev) => ({
              ...prev,
              currentTransfer: response.data!.transfer,
              isLoading: false,
            }));
            handleTransferUpdate(response.data.transfer);
          } else {
            const errorMsg =
              typeof response.error === 'string'
                ? response.error
                : response.error?.message || 'Transferência não encontrada';
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMsg,
            }));
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Erro de comunicação',
          }));
        }
      } else {
        const cached = state.transfers.find((t) => t.id === id);
        setState((prev) => ({
          ...prev,
          currentTransfer: cached || null,
          isLoading: false,
          error: cached ? null : 'Transferência não encontrada no cache',
        }));
      }
    },
    [isConnected, state.transfers, send]
  );

  const createTransfer = useCallback(
    async (data: CreateTransferData): Promise<string> => {
      const transferNumber = `TRF-${activeContract?.code || 'XXX'}-${Date.now().toString(36).toUpperCase()}`;
      const tempId = `temp_${Date.now()}`;

      const newTransfer: StockTransfer = {
        id: tempId,
        transferNumber,
        type: data.type || 'INTERNAL',
        status: 'DRAFT',
        sourceLocationId: data.fromLocationId,
        sourceLocationCode: '',
        sourceLocationName: activeLocation?.name || '',
        destinationLocationId: data.toLocationId,
        destinationLocationCode: '',
        destinationLocationName: '',
        requestedById: '',
        requestedByName: '',
        notes: data.notes,
        totalItems: 0,
        totalValue: 0,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        transfers: [newTransfer, ...prev.transfers],
        currentTransfer: newTransfer,
      }));

      if (isConnected) {
        try {
          const response = await send<
            CreateTransferData & { contractId?: string },
            { transfer: StockTransfer }
          >('enterprise.transfer.create', { ...data, contractId: activeContract?.id });

          if (response.success && response.data) {
            handleTransferUpdate(response.data.transfer);
            return response.data.transfer.id;
          }
        } catch (error) {
          console.error('Erro ao criar transferência:', error);
        }
      } else {
        await addPendingAction('create', { ...data, contractId: activeContract?.id, tempId });
      }

      return tempId;
    },
    [isConnected, activeContract, activeLocation, send]
  );

  const updateTransfer = useCallback(
    async (id: string, data: { toLocationId?: string; notes?: string }): Promise<void> => {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === id
            ? {
                ...t,
                destinationLocationId: data.toLocationId || t.destinationLocationId,
                notes: data.notes !== undefined ? data.notes : t.notes,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
        currentTransfer:
          prev.currentTransfer?.id === id
            ? {
                ...prev.currentTransfer,
                destinationLocationId:
                  data.toLocationId || prev.currentTransfer.destinationLocationId,
                notes: data.notes !== undefined ? data.notes : prev.currentTransfer.notes,
                updatedAt: new Date().toISOString(),
              }
            : prev.currentTransfer,
      }));

      if (isConnected) {
        try {
          const response = await send<
            { transferId: string; toLocationId?: string; notes?: string },
            { transfer: StockTransfer }
          >('enterprise.transfer.update', { transferId: id, ...data });

          if (response.success && response.data) {
            handleTransferUpdate(response.data.transfer);
          }
        } catch (error) {
          console.error('Erro ao atualizar transferência:', error);
        }
      }
    },
    [isConnected, send]
  );

  const shipTransfer = useCallback(
    async (id: string, notes?: string, vehiclePlate?: string): Promise<void> => {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === id
            ? { ...t, status: 'IN_TRANSIT' as TransferStatus, shippedAt: new Date().toISOString() }
            : t
        ),
        currentTransfer:
          prev.currentTransfer?.id === id
            ? {
                ...prev.currentTransfer,
                status: 'IN_TRANSIT' as TransferStatus,
                shippedAt: new Date().toISOString(),
              }
            : prev.currentTransfer,
      }));

      if (isConnected) {
        try {
          await send('enterprise.transfer.ship', { id, notes, vehiclePlate });
        } catch (error) {
          console.error('Erro ao enviar transferência:', error);
          // Rollback on error
          loadTransfer(id);
        }
      } else {
        await addPendingAction('ship', { id, notes, vehiclePlate });
      }
    },
    [isConnected, send, loadTransfer]
  );

  const receiveTransfer = useCallback(
    async (
      id: string,
      items: Array<{ itemId: string; receivedQuantity: number; notes?: string }>
    ): Promise<void> => {
      const hasPartial = items.some((item) => {
        const transfer = state.transfers.find((t) => t.id === id);
        const transferItem = transfer?.items.find((i) => i.id === item.itemId);
        return transferItem && item.receivedQuantity < transferItem.requestedQuantity;
      });

      const newStatus: TransferStatus = hasPartial ? 'PARTIAL_RECEIVED' : 'RECEIVED';

      // Optimistic update
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === id ? { ...t, status: newStatus, receivedAt: new Date().toISOString() } : t
        ),
        currentTransfer:
          prev.currentTransfer?.id === id
            ? { ...prev.currentTransfer, status: newStatus, receivedAt: new Date().toISOString() }
            : prev.currentTransfer,
      }));

      if (isConnected) {
        try {
          await send('enterprise.transfer.receive', { transferId: id, items });
        } catch (error) {
          console.error('Erro ao receber transferência:', error);
          loadTransfer(id);
        }
      } else {
        await addPendingAction('receive', { transferId: id, items });
      }
    },
    [isConnected, state.transfers, send, loadTransfer]
  );

  const cancelTransfer = useCallback(
    async (id: string, reason: string): Promise<void> => {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === id ? { ...t, status: 'CANCELLED' as TransferStatus } : t
        ),
        currentTransfer:
          prev.currentTransfer?.id === id
            ? { ...prev.currentTransfer, status: 'CANCELLED' as TransferStatus }
            : prev.currentTransfer,
      }));

      if (isConnected) {
        try {
          await send('enterprise.transfer.cancel', { id, reason });
        } catch (error) {
          console.error('Erro ao cancelar transferência:', error);
          loadTransfer(id);
        }
      } else {
        await addPendingAction('cancel', { id, reason });
      }
    },
    [isConnected, send, loadTransfer]
  );

  const addItem = useCallback(
    async (transferId: string, item: AddItemData): Promise<void> => {
      const tempItemId = `temp_item_${Date.now()}`;

      const newItem: StockTransferItem = {
        id: tempItemId,
        transferId,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit || 'UN',
        lotId: item.lotId,
        requestedQuantity: item.quantity,
        unitCost: item.unitCost || 0,
        totalCost: (item.unitCost || 0) * item.quantity,
        status: 'pending',
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === transferId
            ? { ...t, items: [...t.items, newItem], totalItems: t.totalItems + 1 }
            : t
        ),
        currentTransfer:
          prev.currentTransfer?.id === transferId
            ? {
                ...prev.currentTransfer,
                items: [...prev.currentTransfer.items, newItem],
                totalItems: prev.currentTransfer.totalItems + 1,
              }
            : prev.currentTransfer,
      }));

      if (isConnected) {
        try {
          await send('enterprise.transfer.add_item', { transferId, ...item, tempItemId });
        } catch (error) {
          console.error('Erro ao adicionar item:', error);
          loadTransfer(transferId);
        }
      } else {
        await addPendingAction('add_item', { transferId, ...item, tempItemId });
      }
    },
    [isConnected, send, loadTransfer]
  );

  const removeItem = useCallback(
    async (transferId: string, itemId: string): Promise<void> => {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === transferId
            ? { ...t, items: t.items.filter((i) => i.id !== itemId), totalItems: t.totalItems - 1 }
            : t
        ),
        currentTransfer:
          prev.currentTransfer?.id === transferId
            ? {
                ...prev.currentTransfer,
                items: prev.currentTransfer.items.filter((i) => i.id !== itemId),
                totalItems: prev.currentTransfer.totalItems - 1,
              }
            : prev.currentTransfer,
      }));

      if (isConnected) {
        try {
          await send('enterprise.transfer.remove_item', { transferId, itemId });
        } catch (error) {
          console.error('Erro ao remover item:', error);
          loadTransfer(transferId);
        }
      } else {
        await addPendingAction('remove_item', { transferId, itemId });
      }
    },
    [isConnected, send, loadTransfer]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const inTransitCount = state.transfers.filter((t) => t.status === 'IN_TRANSIT').length;

  const pendingReceiveCount = state.transfers.filter(
    (t) =>
      t.status === 'IN_TRANSIT' && activeLocation && t.destinationLocationId === activeLocation.id
  ).length;

  // ==========================================================================
  // Return
  // ==========================================================================
  return {
    // State
    transfers: state.transfers,
    currentTransfer: state.currentTransfer,
    isLoading: state.isLoading,
    error: state.error,
    isOnline,
    isSyncing,

    // Counts
    inTransitCount,
    pendingReceiveCount,
    pendingActionsCount: pendingActions.filter((a) => !a.synced).length,

    // Actions
    loadTransfers,
    loadTransfer,
    createTransfer,
    updateTransfer,
    shipTransfer,
    receiveTransfer,
    cancelTransfer,
    addItem,
    removeItem,
    syncPendingActions,
    clearError,
  };
}
