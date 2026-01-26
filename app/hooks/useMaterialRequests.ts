/**
 * Hook para gerenciar Requisições de Material Enterprise
 * Suporta CRUD completo com modo offline
 */

import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWebSocket } from './useWebSocket';
import { useEnterpriseContextStore } from '@/stores/enterpriseContextStore';
import type {
  MaterialRequest,
  RequestFilters,
  RequestsSummary,
  CreateRequestInput,
  AddRequestItemInput,
  ApproveRequestInput,
  RejectRequestInput,
  PendingRequestAction,
  RequestListPayload,
  RequestListResponse,
  RequestDetailResponse,
  CreateRequestPayload,
  CreateRequestResponse,
  AddItemPayload,
  AddItemResponse,
  SubmitRequestPayload,
  ApproveRequestPayload,
  RejectRequestPayload,
} from '@/types/material-request';

const PENDING_ACTIONS_KEY = '@giro/enterprise_pending_request_actions';

interface UseMaterialRequestsResult {
  // State
  requests: MaterialRequest[];
  currentRequest: MaterialRequest | null;
  summary: RequestsSummary;
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingActionsCount: number;
  error: string | null;

  // List actions
  loadRequests: (filters?: RequestFilters) => Promise<void>;
  refreshRequests: () => Promise<void>;

  // Detail actions
  loadRequest: (requestId: string) => Promise<void>;
  clearCurrentRequest: () => void;

  // CRUD actions
  createRequest: (
    data: CreateRequestInput,
    items?: AddRequestItemInput[]
  ) => Promise<string | null>;
  addItem: (requestId: string, item: AddRequestItemInput) => Promise<void>;
  removeItem: (requestId: string, itemId: string) => Promise<void>;
  submitRequest: (requestId: string) => Promise<void>;

  // Approval actions
  approveRequest: (input: ApproveRequestInput) => Promise<void>;
  rejectRequest: (input: RejectRequestInput) => Promise<void>;

  // Offline actions
  syncPendingActions: () => Promise<void>;
  clearPendingActions: () => void;

  // Product lookup
  addItemByBarcode: (requestId: string, barcode: string, quantity: number) => Promise<void>;
}

export function useMaterialRequests(): UseMaterialRequestsResult {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<MaterialRequest | null>(null);
  const [summary, setSummary] = useState<RequestsSummary>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    delivered: 0,
    pendingApprovalValue: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingRequestAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<RequestFilters | undefined>();

  const { send, isConnected } = useWebSocket();
  const { activeContract } = useEnterpriseContextStore();

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Load pending actions from storage
  useEffect(() => {
    loadPendingActionsFromStorage();
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && isConnected && pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [isOnline, isConnected]);

  const loadPendingActionsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load pending actions:', err);
    }
  };

  const savePendingActions = async (actions: PendingRequestAction[]) => {
    try {
      await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
      setPendingActions(actions);
    } catch (err) {
      console.error('Failed to save pending actions:', err);
    }
  };

  const addPendingAction = async (
    action: Omit<PendingRequestAction, 'id' | 'synced' | 'retryCount' | 'createdAt'>
  ) => {
    const newAction: PendingRequestAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      createdAt: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    };
    await savePendingActions([...pendingActions, newAction]);
  };

  // Load requests with filters
  const loadRequests = useCallback(
    async (filters?: RequestFilters) => {
      if (!isConnected) {
        setError('Não conectado ao servidor');
        return;
      }

      setIsLoading(true);
      setError(null);
      setLastFilters(filters);

      try {
        const payload: RequestListPayload = {
          filters: {
            ...filters,
            contractId: filters?.contractId ?? activeContract?.id,
          },
          limit: 50,
        };

        const response = await send<RequestListPayload, RequestListResponse>(
          'enterprise.request.list',
          payload
        );

        if (response.success && response.data) {
          setRequests(response.data.requests);
          // Calculate summary
          const reqs = response.data.requests;
          setSummary({
            total: reqs.length,
            draft: reqs.filter((r) => r.status === 'DRAFT').length,
            pending: reqs.filter((r) => r.status === 'PENDING').length,
            approved: reqs.filter((r) => r.status === 'APPROVED').length,
            rejected: reqs.filter((r) => r.status === 'REJECTED').length,
            delivered: reqs.filter((r) => r.status === 'DELIVERED').length,
            pendingApprovalValue: reqs
              .filter((r) => r.status === 'PENDING')
              .reduce((sum, r) => sum + r.totalEstimatedValue, 0),
          });
        } else {
          throw new Error(response.error?.message || 'Falha ao carregar requisições');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, activeContract]
  );

  const refreshRequests = useCallback(() => {
    return loadRequests(lastFilters);
  }, [loadRequests, lastFilters]);

  // Load single request detail
  const loadRequest = useCallback(
    async (requestId: string) => {
      if (!isConnected) {
        setError('Não conectado ao servidor');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await send<{ requestId: string }, RequestDetailResponse>(
          'enterprise.request.get',
          { requestId }
        );

        if (response.success && response.data) {
          setCurrentRequest(response.data.request);
        } else {
          throw new Error(response.error?.message || 'Falha ao carregar requisição');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send]
  );

  const clearCurrentRequest = useCallback(() => {
    setCurrentRequest(null);
  }, []);

  // Create new request
  const createRequest = useCallback(
    async (data: CreateRequestInput, items?: AddRequestItemInput[]): Promise<string | null> => {
      setError(null);

      if (!isConnected) {
        // Queue for offline
        await addPendingAction({
          type: 'create',
          payload: { ...data, items },
        });
        setError('Requisição salva para sincronização offline');
        return null;
      }

      setIsLoading(true);

      try {
        const payload: CreateRequestPayload = {
          ...data,
          items,
        };

        const response = await send<CreateRequestPayload, CreateRequestResponse>(
          'enterprise.request.create',
          payload
        );

        if (response.success && response.data) {
          await refreshRequests();
          return response.data.requestId;
        } else {
          throw new Error(response.error?.message || 'Falha ao criar requisição');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, refreshRequests]
  );

  // Add item to request
  const addItem = useCallback(
    async (requestId: string, item: AddRequestItemInput) => {
      if (!isConnected) {
        await addPendingAction({
          type: 'add_item',
          payload: { requestId, ...item },
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: AddItemPayload = {
          requestId,
          ...item,
        };

        const response = await send<AddItemPayload, AddItemResponse>(
          'enterprise.request.add_item',
          payload
        );

        if (response.success) {
          // Reload request to get updated items
          await loadRequest(requestId);
        } else {
          throw new Error(response.error?.message || 'Falha ao adicionar item');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, loadRequest]
  );

  // Remove item from request
  const removeItem = useCallback(
    async (requestId: string, itemId: string) => {
      if (!isConnected) {
        await addPendingAction({
          type: 'remove_item',
          payload: { requestId, itemId },
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await send<{ requestId: string; itemId: string }, {}>(
          'enterprise.request.remove_item',
          { requestId, itemId }
        );

        if (response.success) {
          await loadRequest(requestId);
        } else {
          throw new Error(response.error?.message || 'Falha ao remover item');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, loadRequest]
  );

  // Submit request for approval
  const submitRequest = useCallback(
    async (requestId: string) => {
      if (!isConnected) {
        await addPendingAction({
          type: 'submit',
          payload: { requestId },
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await send<SubmitRequestPayload, {}>('enterprise.request.submit', {
          requestId,
        });

        if (response.success) {
          await refreshRequests();
        } else {
          throw new Error(response.error?.message || 'Falha ao submeter requisição');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, refreshRequests]
  );

  // Approve request
  const approveRequest = useCallback(
    async (input: ApproveRequestInput) => {
      if (!isConnected) {
        await addPendingAction({
          type: 'approve',
          payload: input,
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await send<ApproveRequestPayload, {}>('enterprise.request.approve', input);

        if (response.success) {
          await refreshRequests();
        } else {
          throw new Error(response.error?.message || 'Falha ao aprovar requisição');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, refreshRequests]
  );

  // Reject request
  const rejectRequest = useCallback(
    async (input: RejectRequestInput) => {
      if (!isConnected) {
        await addPendingAction({
          type: 'reject',
          payload: input,
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await send<RejectRequestPayload, {}>('enterprise.request.reject', input);

        if (response.success) {
          await refreshRequests();
        } else {
          throw new Error(response.error?.message || 'Falha ao rejeitar requisição');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, refreshRequests]
  );

  // Add item by barcode (scan and add)
  const addItemByBarcode = useCallback(
    async (requestId: string, barcode: string, quantity: number) => {
      if (!isConnected) {
        setError('Não conectado ao servidor');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First lookup the product
        const productResponse = await send<{ barcode: string }, { product: { id: string } }>(
          'product.get',
          { barcode }
        );

        if (!productResponse.success || !productResponse.data?.product) {
          throw new Error('Produto não encontrado');
        }

        // Then add to request
        await addItem(requestId, {
          productId: productResponse.data.product.id,
          quantity,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, send, addItem]
  );

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    if (!isConnected || pendingActions.length === 0) return;

    setIsSyncing(true);
    const actionsToSync = pendingActions.filter((a) => !a.synced);
    const updatedActions = [...pendingActions];

    for (const action of actionsToSync) {
      try {
        const actionNameMap: Record<string, string> = {
          create: 'enterprise.request.create',
          add_item: 'enterprise.request.add_item',
          remove_item: 'enterprise.request.remove_item',
          submit: 'enterprise.request.submit',
          approve: 'enterprise.request.approve',
          reject: 'enterprise.request.reject',
        };

        const actionName = actionNameMap[action.type];
        if (!actionName) {
          console.error('Unknown action type:', action.type);
          continue;
        }

        const response = await send(actionName as any, action.payload as Record<string, unknown>);

        if (response.success) {
          const idx = updatedActions.findIndex((a) => a.id === action.id);
          if (idx >= 0) {
            updatedActions[idx] = { ...updatedActions[idx], synced: true };
          }
        } else {
          const idx = updatedActions.findIndex((a) => a.id === action.id);
          if (idx >= 0) {
            updatedActions[idx] = {
              ...updatedActions[idx],
              retryCount: updatedActions[idx].retryCount + 1,
              lastError: response.error?.message,
            };
          }
        }
      } catch (err) {
        const idx = updatedActions.findIndex((a) => a.id === action.id);
        if (idx >= 0) {
          updatedActions[idx] = {
            ...updatedActions[idx],
            retryCount: updatedActions[idx].retryCount + 1,
            lastError: err instanceof Error ? err.message : 'Erro desconhecido',
          };
        }
      }
    }

    // Remove synced actions
    const remaining = updatedActions.filter((a) => !a.synced);
    await savePendingActions(remaining);

    setIsSyncing(false);
    await refreshRequests();
  }, [isConnected, pendingActions, send, refreshRequests]);

  const clearPendingActions = useCallback(async () => {
    await savePendingActions([]);
  }, []);

  return {
    requests,
    currentRequest,
    summary,
    isLoading,
    isOnline,
    isSyncing,
    pendingActionsCount: pendingActions.filter((a) => !a.synced).length,
    error,
    loadRequests,
    refreshRequests,
    loadRequest,
    clearCurrentRequest,
    createRequest,
    addItem,
    removeItem,
    submitRequest,
    approveRequest,
    rejectRequest,
    syncPendingActions,
    clearPendingActions,
    addItemByBarcode,
  };
}
