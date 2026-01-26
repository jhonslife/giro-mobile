/**
 * Tipos para Transferências de Estoque (Enterprise)
 */

export type TransferStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'PARTIAL_RECEIVED'
  | 'CANCELLED';

export type TransferType = 'INTERNAL' | 'SUPPLY' | 'RETURN' | 'ADJUSTMENT';

/**
 * Transferência de Estoque
 */
export interface StockTransfer {
  id: string;
  transferNumber: string;
  type: TransferType;
  sourceLocationId: string;
  sourceLocationCode: string;
  sourceLocationName: string;
  destinationLocationId: string;
  destinationLocationCode: string;
  destinationLocationName: string;
  contractId?: string;
  contractCode?: string;
  contractName?: string;
  requestedById: string;
  requestedByName: string;
  status: TransferStatus;
  justification?: string;
  notes?: string;
  totalItems: number;
  totalValue: number;
  items: StockTransferItem[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  rejectedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  shippedAt?: string;
  shippedById?: string;
  shippedByName?: string;
  receivedAt?: string;
  receivedById?: string;
  receivedByName?: string;
}

/**
 * Item de Transferência
 */
export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  productCode: string;
  productName: string;
  productBarcode?: string;
  unit: string;
  lotId?: string;
  lotNumber?: string;
  requestedQuantity: number;
  shippedQuantity?: number;
  receivedQuantity?: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  status: 'pending' | 'shipped' | 'received' | 'partial' | 'missing';
}

/**
 * Resumo de Transferências
 */
export interface TransfersSummary {
  total: number;
  draft: number;
  pending: number;
  inTransit: number;
  received: number;
  pendingValue: number;
  inTransitValue: number;
}

/**
 * Filtros para buscar transferências
 */
export interface TransferFilters {
  sourceLocationId?: string;
  destinationLocationId?: string;
  contractId?: string;
  status?: TransferStatus;
  type?: TransferType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Input para criar transferência
 */
export interface CreateTransferInput {
  sourceLocationId: string;
  destinationLocationId: string;
  type: TransferType;
  contractId?: string;
  justification?: string;
  notes?: string;
}

/**
 * Input para adicionar item
 */
export interface AddTransferItemInput {
  productId: string;
  quantity: number;
  lotId?: string;
  notes?: string;
}

/**
 * Input para confirmar recebimento
 */
export interface ReceiveTransferInput {
  transferId: string;
  items: {
    itemId: string;
    receivedQuantity: number;
    notes?: string;
  }[];
  notes?: string;
}

/**
 * Ação pendente offline
 */
export interface PendingTransferAction {
  id: string;
  type: 'create' | 'add_item' | 'remove_item' | 'approve' | 'reject' | 'ship' | 'receive';
  payload: unknown;
  createdAt: string;
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

/**
 * Payloads WebSocket
 */
export interface TransferListPayload {
  filters?: TransferFilters;
  page?: number;
  limit?: number;
}

export interface TransferListResponse {
  transfers: StockTransfer[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TransferDetailPayload {
  transferId: string;
}

export interface TransferDetailResponse {
  transfer: StockTransfer;
}

export interface CreateTransferPayload {
  sourceLocationId: string;
  destinationLocationId: string;
  type: TransferType;
  contractId?: string;
  justification?: string;
  notes?: string;
  items?: AddTransferItemInput[];
}

export interface CreateTransferResponse {
  transferId: string;
  transferNumber: string;
}

export interface AddTransferItemPayload {
  transferId: string;
  productId: string;
  quantity: number;
  lotId?: string;
  notes?: string;
}

export interface AddTransferItemResponse {
  itemId: string;
}

export interface ApproveTransferPayload {
  transferId: string;
  notes?: string;
}

export interface RejectTransferPayload {
  transferId: string;
  reason: string;
}

export interface ShipTransferPayload {
  transferId: string;
  items?: {
    itemId: string;
    shippedQuantity: number;
  }[];
  notes?: string;
}

export interface ReceiveTransferPayload {
  transferId: string;
  items: {
    itemId: string;
    receivedQuantity: number;
    notes?: string;
  }[];
  notes?: string;
}
