/**
 * Tipos para inventário Enterprise (multi-localização)
 */

export type LocationType = 'CENTRAL' | 'FIELD' | 'TRANSIT';

export type EnterpriseInventoryStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Contexto de inventário Enterprise
 * Suporta multi-localização e vínculo com contratos
 */
export interface EnterpriseInventoryContext {
  locationId: string;
  locationCode: string;
  locationName: string;
  locationType: LocationType;
  contractId?: string;
  contractCode?: string;
  contractName?: string;
}

/**
 * Inventário Enterprise
 */
export interface EnterpriseInventory {
  id: string;
  code: string;
  name: string;
  locationId: string;
  location: EnterpriseInventoryContext;
  status: EnterpriseInventoryStatus;
  startedAt: string;
  completedAt?: string;
  startedById: string;
  startedByName: string;
  expectedProducts: number;
  countedProducts: number;
  productsWithDifference: number;
  notes?: string;
}

/**
 * Item de inventário Enterprise
 */
export interface EnterpriseInventoryItem {
  id: string;
  inventoryId: string;
  productId: string;
  productCode: string;
  productName: string;
  productBarcode?: string;
  unit: string;
  category?: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  difference: number;
  status: 'pending' | 'counted' | 'skipped';
  countedAt?: string;
  countedById?: string;
  countedByName?: string;
  notes?: string;
}

/**
 * Contagem pendente para sync offline
 */
export interface PendingCount {
  id: string;
  inventoryId: string;
  locationId: string;
  productId: string;
  quantity: number;
  notes?: string;
  countedAt: string;
  countedById: string;
  deviceId: string;
  synced: boolean;
  syncError?: string;
  retryCount: number;
}

/**
 * Payload para sync de contagens
 */
export interface InventoryCountSync {
  inventoryId: string;
  locationId: string;
  counts: {
    productId: string;
    countedQty: number;
    countedAt: string;
    countedBy: string;
    notes?: string;
  }[];
  deviceId: string;
  syncedAt?: string;
}

/**
 * Resumo de inventário Enterprise
 */
export interface EnterpriseInventorySummary {
  totalProducts: number;
  countedProducts: number;
  pendingProducts: number;
  skippedProducts: number;
  productsWithDifference: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  netDifference: number;
  totalExpectedValue: number;
  totalCountedValue: number;
  valueDifference: number;
  completionPercentage: number;
}

/**
 * Localizações disponíveis para inventário
 */
export interface AvailableLocation {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  address?: string;
  contractId?: string;
  contractCode?: string;
  contractName?: string;
  itemCount: number;
  lastInventoryAt?: string;
}

/**
 * Payload para iniciar inventário Enterprise
 */
export interface EnterpriseInventoryStartPayload {
  locationId: string;
  name?: string;
  notes?: string;
}

/**
 * Response do início de inventário
 */
export interface EnterpriseInventoryStartResponse {
  inventoryId: string;
  code: string;
  name: string;
  location: EnterpriseInventoryContext;
  expectedProducts: number;
  items: EnterpriseInventoryItem[];
  startedAt: string;
}
