/**
 * Store de produtos - cache local e busca
 */

import { STORAGE_KEYS } from '@lib/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category, Product, StockMovement } from '@/types/product';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ScanHistoryItem {
  barcode: string;
  product: Product | null;
  scannedAt: number;
}

interface ProductsStore {
  // State
  products: Record<string, Product>;
  categories: Category[];
  recentScans: ScanHistoryItem[];
  searchResults: Product[];
  isSearching: boolean;
  searchQuery: string;
  selectedProduct: Product | null;
  lastMovements: StockMovement[];
  lastSyncTimestamp: number | null;

  // Actions
  setProduct: (product: Product) => void;
  setProducts: (products: Product[]) => void;
  removeProduct: (productId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  setCategories: (categories: Category[]) => void;
  addToScanHistory: (barcode: string, product: Product | null) => void;
  addRecentScan: (barcode: string, product: Product | null) => void; // Alias for addToScanHistory
  clearScanHistory: () => void;
  setSearchResults: (products: Product[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  setLastMovements: (movements: StockMovement[]) => void;
  setLastSyncTimestamp: (timestamp: number) => void;

  // Getters
  getProductByBarcode: (barcode: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  getCategoryById: (id: string) => Category | undefined;

  // Reset
  reset: () => void;
}

const MAX_SCAN_HISTORY = 20;

const initialState = {
  products: {},
  categories: [],
  recentScans: [],
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  selectedProduct: null,
  lastMovements: [],
  lastSyncTimestamp: null,
};

export const useProductsStore = create<ProductsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setProduct: (product) =>
        set((state) => {
          const newProducts = { ...state.products };
          newProducts[product.id] = product;
          // Também indexa por barcode
          if (product.barcode) {
            newProducts[`barcode:${product.barcode}`] = product;
          }
          return { products: newProducts };
        }),

      setProducts: (products) =>
        set(() => {
          const newProducts: Record<string, Product> = {};
          products.forEach((product) => {
            newProducts[product.id] = product;
            if (product.barcode) {
              newProducts[`barcode:${product.barcode}`] = product;
            }
          });
          return { products: newProducts };
        }),

      removeProduct: (productId) =>
        set((state) => {
          const newProducts = { ...state.products };
          const product = newProducts[productId];
          if (product) {
            delete newProducts[productId];
            if (product.barcode) {
              delete newProducts[`barcode:${product.barcode}`];
            }
          }
          return { products: newProducts };
        }),

      updateProductStock: (productId, newStock) =>
        set((state) => {
          const newProducts = { ...state.products };
          const product = newProducts[productId];
          if (product) {
            const updatedProduct = { ...product, currentStock: newStock };
            newProducts[productId] = updatedProduct;
            if (product.barcode) {
              newProducts[`barcode:${product.barcode}`] = updatedProduct;
            }
          }
          return { products: newProducts };
        }),

      setCategories: (categories) => set({ categories }),

      addToScanHistory: (barcode, product) =>
        set((state) => {
          const newItem: ScanHistoryItem = {
            barcode,
            product,
            scannedAt: Date.now(),
          };

          // Remove duplicata se existir
          const filtered = state.recentScans.filter((item) => item.barcode !== barcode);

          // Adiciona no início e limita tamanho
          const updated = [newItem, ...filtered].slice(0, MAX_SCAN_HISTORY);

          return { recentScans: updated };
        }),

      clearScanHistory: () => set({ recentScans: [] }),

      // Alias for backwards compatibility
      addRecentScan: (barcode, product) => get().addToScanHistory(barcode, product),

      setSearchResults: (products) => set({ searchResults: products }),

      setIsSearching: (isSearching) => set({ isSearching }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedProduct: (product) => set({ selectedProduct: product }),

      setLastMovements: (movements) => set({ lastMovements: movements }),

      setLastSyncTimestamp: (timestamp) => set({ lastSyncTimestamp: timestamp }),

      // Getters
      getProductByBarcode: (barcode) => {
        return get().products[`barcode:${barcode}`];
      },

      getProductById: (id) => {
        return get().products[id];
      },

      getCategoryById: (id) => {
        return get().categories.find((c) => c.id === id);
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.PRODUCTS_CACHE,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
