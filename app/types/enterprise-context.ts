/**
 * Tipos para Contexto Enterprise (Contrato/Obra ativo)
 */

export type EnterpriseRole = 'ALMOXARIFE' | 'ENCARREGADO' | 'SUPERVISOR' | 'GESTOR';

/**
 * Contrato/Obra
 */
export interface Contract {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: 'PLANNING' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  location?: string;
  workFrontsCount: number;
  activeWorkFrontsCount: number;
}

/**
 * Frente de Trabalho
 */
export interface WorkFront {
  id: string;
  contractId: string;
  code: string;
  name: string;
  supervisorId?: string;
  supervisorName?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  activitiesCount: number;
}

/**
 * Atividade
 */
export interface Activity {
  id: string;
  workFrontId: string;
  code: string;
  name: string;
  costCenter?: string;
  progress: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
}

/**
 * Localização de Estoque
 */
export interface StockLocation {
  id: string;
  code: string;
  name: string;
  type: 'CENTRAL' | 'FIELD' | 'TRANSIT';
  contractId?: string;
  contractCode?: string;
  workFrontId?: string;
  workFrontName?: string;
  isActive: boolean;
  currentBalance: number;
  currentValue: number;
}

/**
 * Contexto do usuário enterprise
 */
export interface EnterpriseUserContext {
  userId: string;
  userName: string;
  role: EnterpriseRole;
  canApproveRequests: boolean;
  canApproveTransfers: boolean;
  approvalLimit: number;
  assignedContracts: string[];
  assignedLocations: string[];
}

/**
 * Dashboard Enterprise
 */
export interface EnterpriseDashboard {
  // Resumo geral
  totalContracts: number;
  activeContracts: number;

  // Requisições
  pendingRequestsCount: number;
  pendingRequestsValue: number;
  myPendingApprovals: number;

  // Transferências
  inTransitTransfersCount: number;
  pendingReceiveCount: number;

  // Estoque
  lowStockAlerts: number;
  expiringItemsCount: number;

  // Atividade recente
  recentActivities: DashboardActivity[];
}

/**
 * Atividade recente para dashboard
 */
export interface DashboardActivity {
  id: string;
  type: 'REQUEST' | 'TRANSFER' | 'INVENTORY' | 'APPROVAL';
  title: string;
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
  status: string;
  contractCode?: string;
  locationName?: string;
}

/**
 * Payloads WebSocket
 */
export interface GetContractsPayload {
  status?: 'ACTIVE' | 'ALL';
  search?: string;
}

export interface GetContractsResponse {
  contracts: Contract[];
}

export interface GetWorkFrontsPayload {
  contractId: string;
  status?: 'ACTIVE' | 'ALL';
}

export interface GetWorkFrontsResponse {
  workFronts: WorkFront[];
}

export interface GetActivitiesPayload {
  workFrontId: string;
  status?: 'ACTIVE' | 'ALL';
}

export interface GetActivitiesResponse {
  activities: Activity[];
}

export interface GetLocationsPayload {
  contractId?: string;
  type?: 'CENTRAL' | 'FIELD' | 'TRANSIT';
}

export interface GetLocationsResponse {
  locations: StockLocation[];
}

export interface GetDashboardPayload {
  contractId?: string;
}

export interface GetDashboardResponse {
  dashboard: EnterpriseDashboard;
}

export interface GetUserContextPayload {}

export interface GetUserContextResponse {
  context: EnterpriseUserContext;
}
