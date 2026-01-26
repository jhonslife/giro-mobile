/**
 * Store para inventário Enterprise com suporte offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  EnterpriseInventory,
  EnterpriseInventoryItem,
  EnterpriseInventorySummary,
  PendingCount,
  AvailableLocation,
} from '@/types/enterprise-inventory';

interface EnterpriseInventoryState {
  // Current inventory
  currentInventory: EnterpriseInventory | null;
  items: EnterpriseInventoryItem[];
  isLoading: boolean;

  // Available locations
  availableLocations: AvailableLocation[];
  selectedLocationId: string | null;

  // Offline support
  pendingCounts: PendingCount[];
  isSyncing: boolean;
  lastSyncAt: string | null;

  // Actions
  setCurrentInventory: (inventory: EnterpriseInventory | null) => void;
  setItems: (items: EnterpriseInventoryItem[]) => void;
  updateItem: (productId: string, updates: Partial<EnterpriseInventoryItem>) => void;
  setAvailableLocations: (locations: AvailableLocation[]) => void;
  setSelectedLocationId: (locationId: string | null) => void;
  setIsLoading: (loading: boolean) => void;

  // Offline actions
  addPendingCount: (count: Omit<PendingCount, 'id' | 'synced' | 'retryCount'>) => void;
  markCountSynced: (countId: string) => void;
  markCountFailed: (countId: string, error: string) => void;
  removePendingCount: (countId: string) => void;
  clearSyncedCounts: () => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncAt: (date: string | null) => void;

  // Getters
  getSummary: () => EnterpriseInventorySummary;
  getPendingItems: () => EnterpriseInventoryItem[];
  getCountedItems: () => EnterpriseInventoryItem[];
  getPendingCountsForSync: () => PendingCount[];

  // Reset
  reset: () => void;
}

const initialState = {
  currentInventory: null,
  items: [],
  isLoading: false,
  availableLocations: [],
  selectedLocationId: null,
  pendingCounts: [],
  isSyncing: false,
  lastSyncAt: null,
};

export const useEnterpriseInventoryStore = create<EnterpriseInventoryState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentInventory: (inventory) => set({ currentInventory: inventory }),

      setItems: (items) => set({ items }),

      updateItem: (productId, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, ...updates } : item
          ),
        })),

      setAvailableLocations: (locations) => set({ availableLocations: locations }),

      setSelectedLocationId: (locationId) => set({ selectedLocationId: locationId }),

      setIsLoading: (loading) => set({ isLoading: loading }),

      // Offline actions
      addPendingCount: (count) =>
        set((state) => ({
          pendingCounts: [
            ...state.pendingCounts,
            {
              ...count,
              id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              synced: false,
              retryCount: 0,
            },
          ],
        })),

      markCountSynced: (countId) =>
        set((state) => ({
          pendingCounts: state.pendingCounts.map((c) =>
            c.id === countId ? { ...c, synced: true } : c
          ),
        })),

      markCountFailed: (countId, error) =>
        set((state) => ({
          pendingCounts: state.pendingCounts.map((c) =>
            c.id === countId ? { ...c, syncError: error, retryCount: c.retryCount + 1 } : c
          ),
        })),

      removePendingCount: (countId) =>
        set((state) => ({
          pendingCounts: state.pendingCounts.filter((c) => c.id !== countId),
        })),

      clearSyncedCounts: () =>
        set((state) => ({
          pendingCounts: state.pendingCounts.filter((c) => !c.synced),
        })),

      setIsSyncing: (syncing) => set({ isSyncing: syncing }),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      // Getters
      getSummary: () => {
        const { items } = get();
        const counted = items.filter((i) => i.status === 'counted');
        const pending = items.filter((i) => i.status === 'pending');
        const skipped = items.filter((i) => i.status === 'skipped');
        const withDiff = counted.filter((i) => i.difference !== 0);

        const positiveAdj = counted
          .filter((i) => i.difference > 0)
          .reduce((sum, i) => sum + i.difference, 0);
        const negativeAdj = counted
          .filter((i) => i.difference < 0)
          .reduce((sum, i) => sum + Math.abs(i.difference), 0);

        return {
          totalProducts: items.length,
          countedProducts: counted.length,
          pendingProducts: pending.length,
          skippedProducts: skipped.length,
          productsWithDifference: withDiff.length,
          positiveAdjustments: positiveAdj,
          negativeAdjustments: negativeAdj,
          netDifference: positiveAdj - negativeAdj,
          // Value calculations require unit prices from backend - not available in mobile inventory
          totalExpectedValue: 0,
          totalCountedValue: 0,
          valueDifference: 0,
          completionPercentage:
            items.length > 0 ? Math.round((counted.length / items.length) * 100) : 0,
        };
      },

      getPendingItems: () => get().items.filter((i) => i.status === 'pending'),

      getCountedItems: () => get().items.filter((i) => i.status === 'counted'),

      getPendingCountsForSync: () =>
        get().pendingCounts.filter((c) => !c.synced && c.retryCount < 5),

      reset: () => set(initialState),
    }),
    {
      name: 'enterprise-inventory-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pendingCounts: state.pendingCounts,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
