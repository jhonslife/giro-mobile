/**
 * Tipos para Requisições de Material (Enterprise)
 */

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SEPARATING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

/**
 * Requisição de Material
 */
export interface MaterialRequest {
  id: string;
  requestNumber: string;
  contractId: string;
  contractCode: string;
  contractName: string;
  workFrontId?: string;
  workFrontName?: string;
  activityId?: string;
  activityName?: string;
  requesterId: string;
  requesterName: string;
  priority: RequestPriority;
  status: RequestStatus;
  justification?: string;
  notes?: string;
  totalEstimatedValue: number;
  items: MaterialRequestItem[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  rejectedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  deliveredAt?: string;
}

/**
 * Item de Requisição
 */
export interface MaterialRequestItem {
  id: string;
  requestId: string;
  productId: string;
  productCode: string;
  productName: string;
  productBarcode?: string;
  unit: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  separatedQuantity?: number;
  deliveredQuantity?: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  status: 'pending' | 'approved' | 'partial' | 'rejected';
}

/**
 * Resumo de Requisições
 */
export interface RequestsSummary {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  delivered: number;
  pendingApprovalValue: number;
}

/**
 * Filtros para buscar requisições
 */
export interface RequestFilters {
  contractId?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  requesterId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * Input para criar requisição
 */
export interface CreateRequestInput {
  contractId: string;
  workFrontId?: string;
  activityId?: string;
  priority: RequestPriority;
  justification?: string;
  notes?: string;
}

/**
 * Input para adicionar item
 */
export interface AddRequestItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

/**
 * Input para aprovar requisição
 */
export interface ApproveRequestInput {
  requestId: string;
  notes?: string;
  adjustedItems?: {
    itemId: string;
    approvedQuantity: number;
  }[];
}

/**
 * Input para rejeitar requisição
 */
export interface RejectRequestInput {
  requestId: string;
  reason: string;
}

/**
 * Ação pendente offline
 */
export interface PendingRequestAction {
  id: string;
  type: 'create' | 'add_item' | 'remove_item' | 'submit' | 'approve' | 'reject' | 'cancel';
  payload: unknown;
  createdAt: string;
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

/**
 * Payloads WebSocket
 */
export interface RequestListPayload {
  filters?: RequestFilters;
  page?: number;
  limit?: number;
}

export interface RequestListResponse {
  requests: MaterialRequest[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RequestDetailPayload {
  requestId: string;
}

export interface RequestDetailResponse {
  request: MaterialRequest;
}

export interface CreateRequestPayload {
  contractId: string;
  workFrontId?: string;
  activityId?: string;
  priority: RequestPriority;
  justification?: string;
  notes?: string;
  items?: AddRequestItemInput[];
}

export interface CreateRequestResponse {
  requestId: string;
  requestNumber: string;
}

export interface AddItemPayload {
  requestId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface AddItemResponse {
  itemId: string;
}

export interface SubmitRequestPayload {
  requestId: string;
}

export interface ApproveRequestPayload {
  requestId: string;
  notes?: string;
  adjustedItems?: {
    itemId: string;
    approvedQuantity: number;
  }[];
}

export interface RejectRequestPayload {
  requestId: string;
  reason: string;
}
