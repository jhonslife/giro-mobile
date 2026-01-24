/**
 * Hook para gerenciar conexão WebSocket com o Desktop
 */

import { WS_PORT } from '@lib/constants';
import { WebSocketClient, createWebSocketClient } from '@lib/websocket';
import { useConnectionStore } from '@stores/connectionStore';
import { useProductsStore } from '@stores/productsStore';
import type { ConnectionState, DiscoveredDesktop } from '@/types/connection';
import type {
  AuthLoginPayload,
  AuthLoginResponse,
  ProductGetPayload,
  ProductSearchPayload,
  StockAdjustPayload,
  StockAdjustResponse,
  WSActionType,
  WSEventType,
  WSResponse,
} from '@/types/message';
import type { Product } from '@/types/product';
import { useCallback, useEffect, useMemo, useRef } from 'react';

interface UseWebSocketResult {
  // State
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;

  // Actions
  connect: (desktop: DiscoveredDesktop) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Auth
  login: (pin: string) => Promise<AuthLoginResponse>;
  logout: () => Promise<void>;

  // Produtos
  getProduct: (barcode: string) => Promise<Product | null>;
  searchProducts: (query: string, options?: Partial<ProductSearchPayload>) => Promise<Product[]>;

  // Estoque
  adjustStock: (payload: StockAdjustPayload) => Promise<StockAdjustResponse>;

  // Generic send
  send: <TPayload = unknown, TResponse = unknown>(
    action: WSActionType,
    payload: TPayload
  ) => Promise<WSResponse<TResponse>>;

  // Sync
  syncProducts: (force?: boolean) => Promise<void>;

  // Events
  onEvent: <T = unknown>(event: WSEventType, handler: (data: T) => void) => () => void;
}

// Singleton do cliente WebSocket
let wsClient: WebSocketClient | null = null;

export function useWebSocket(): UseWebSocketResult {
  const {
    connectionState,
    setConnectionState,
    selectedDesktop,
    setSelectedDesktop,
    setToken,
    setOperator,
    token,
    deviceId,
    addToHistory,
    setLastError,
  } = useConnectionStore();

  const {
    setProduct,
    setProducts,
    updateProductStock,
    lastSyncTimestamp,
    setLastSyncTimestamp,
    getProductByBarcode,
  } = useProductsStore();

  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Registrar handlers de eventos
  useEffect(() => {
    if (!wsClient) return;

    const unsubStock = wsClient.onEvent('stock.updated', (event) => {
      const data = event.data as { productId: string; newStock: number };
      updateProductStock(data.productId, data.newStock);
    });

    const unsubState = wsClient.onStateChange((newState) => {
      if (isMountedRef.current) {
        setConnectionState(newState);
      }
    });

    return () => {
      unsubStock();
      unsubState();
    };
  }, [setConnectionState, updateProductStock]);

  const connect = useCallback(
    async (desktop: DiscoveredDesktop) => {
      try {
        setLastError(null);
        setConnectionState('connecting');

        const url = `ws://${desktop.ip}:${desktop.port || WS_PORT}`;

        // Criar novo cliente ou reutilizar
        if (wsClient) {
          wsClient.disconnect();
        }
        wsClient = createWebSocketClient(url);

        // Registrar handler de estado
        wsClient.onStateChange((newState) => {
          if (isMountedRef.current) {
            setConnectionState(newState);
          }
        });

        await wsClient.connect();

        setSelectedDesktop(desktop);
        addToHistory(desktop);
        setConnectionState('connected');
      } catch (error) {
        setConnectionState('error');
        setLastError((error as Error).message);
        throw error;
      }
    },
    [setConnectionState, setSelectedDesktop, addToHistory, setLastError]
  );

  const disconnect = useCallback(() => {
    wsClient?.disconnect();
    wsClient = null;
    setToken(null);
    setOperator(null);
    setConnectionState('disconnected');
  }, [setConnectionState, setToken, setOperator]);

  const reconnect = useCallback(async () => {
    if (selectedDesktop) {
      await connect(selectedDesktop);

      // Re-autenticar se tinha token
      if (token) {
        wsClient?.setToken(token);
        setConnectionState('authenticated');
      }
    }
  }, [selectedDesktop, connect, token, setConnectionState]);

  const login = useCallback(
    async (pin: string): Promise<AuthLoginResponse> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      const payload: AuthLoginPayload = {
        pin,
        deviceId: deviceId || 'unknown',
        deviceName: 'GIRO Mobile',
      };

      const response = await wsClient.send<AuthLoginPayload, AuthLoginResponse>(
        'auth.login',
        payload
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Login failed');
      }

      setToken(response.data.token);
      setOperator(response.data.employee);
      wsClient.setToken(response.data.token);
      setConnectionState('authenticated');

      // Iniciar sync em background após login
      try {
        await syncProducts();
      } catch (e) {
        console.warn('Falha no sync inicial de produtos:', e);
      }

      return response.data;
    },
    [deviceId, setToken, setOperator, setConnectionState, syncProducts]
  );

  const logout = useCallback(async () => {
    if (wsClient?.isAuthenticated()) {
      await wsClient.send('auth.logout', {});
    }

    setToken(null);
    setOperator(null);
    wsClient?.setToken(null);
    setConnectionState('connected');
  }, [setToken, setOperator, setConnectionState]);

  const getProduct = useCallback(
    async (barcode: string): Promise<Product | null> => {
      // 1. Tentar cache local primeiro para resposta instantânea (opcional, dependendo da estratégia)
      const cached = getProductByBarcode(barcode);

      if (!wsClient || connectionState !== 'authenticated') {
        return cached || null;
      }

      try {
        const response = await wsClient.send<ProductGetPayload, Product>('product.get', {
          barcode,
        });

        if (response.success && response.data) {
          setProduct(response.data);
          return response.data;
        }
      } catch (error) {
        console.warn('Falha ao buscar produto online, usando cache:', error);
      }

      return cached || null;
    },
    [connectionState, getProductByBarcode, setProduct]
  );

  const searchProducts = useCallback(
    async (query: string, options?: Partial<ProductSearchPayload>): Promise<Product[]> => {
      // Se offline ou não autenticado, busca apenas no cache local
      if (!wsClient || connectionState !== 'authenticated') {
        const allProducts = Object.values(useProductsStore.getState().products);
        const q = query.toLowerCase();
        return allProducts
          .filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
          .slice(0, options?.limit || 20);
      }

      try {
        const payload: ProductSearchPayload = {
          query,
          limit: 20,
          offset: 0,
          ...options,
        };

        const response = await wsClient.send<ProductSearchPayload, { products: Product[] }>(
          'product.search',
          payload
        );

        if (response.success && response.data) {
          return response.data.products;
        }
      } catch (error) {
        console.warn('Erro na busca online, fallback para cache:', error);
        const allProducts = Object.values(useProductsStore.getState().products);
        const q = query.toLowerCase();
        return allProducts
          .filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
          .slice(0, options?.limit || 20);
      }

      return [];
    },
    [connectionState]
  );

  const adjustStock = useCallback(
    async (payload: StockAdjustPayload): Promise<StockAdjustResponse> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      const response = await wsClient.send<StockAdjustPayload, StockAdjustResponse>(
        'stock.adjust',
        payload
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Stock adjustment failed');
      }

      updateProductStock(payload.productId, response.data.newStock);

      return response.data;
    },
    [updateProductStock]
  );

  const send = useCallback(
    async <TPayload = unknown, TResponse = unknown>(
      action: WSActionType,
      payload: TPayload
    ): Promise<WSResponse<TResponse>> => {
      if (!wsClient) {
        throw new Error('Not connected');
      }

      return wsClient.send<TPayload, TResponse>(action, payload);
    },
    []
  );

  const syncProducts = useCallback(
    async (force = false) => {
      if (!wsClient || connectionState !== 'authenticated') return;

      // Se não for forçado e sync for recente (< 1 hora), pula
      const ONE_HOUR = 60 * 60 * 1000;
      if (!force && lastSyncTimestamp && Date.now() - lastSyncTimestamp < ONE_HOUR) {
        return;
      }

      try {
        const response = await wsClient.send<{ tables: string[] }, Record<string, Product[]>>(
          'sync.full',
          {
            tables: ['products'],
          }
        );

        if (response.success && response.data?.products) {
          setProducts(response.data.products);
          setLastSyncTimestamp(Date.now());
          console.info(`📦 Cache de produtos atualizado: ${response.data.products.length} itens`);
        }
      } catch (error) {
        console.error('Erro ao sincronizar produtos:', error);
      }
    },
    [connectionState, lastSyncTimestamp, setProducts, setLastSyncTimestamp]
  );

  const onEvent = useCallback(
    <T = unknown>(event: WSEventType, handler: (data: T) => void): (() => void) => {
      if (!wsClient) {
        return () => {};
      }

      return wsClient.onEvent(event, (wsEvent) => {
        handler(wsEvent.data as T);
      });
    },
    []
  );

  const isConnected = useMemo(
    () => connectionState === 'connected' || connectionState === 'authenticated',
    [connectionState]
  );

  const isAuthenticated = useMemo(() => connectionState === 'authenticated', [connectionState]);

  return {
    connectionState,
    isConnected,
    isConnecting: connectionState === 'connecting',
    isAuthenticated,
    connect,
    disconnect,
    reconnect,
    login,
    logout,
    getProduct,
    searchProducts,
    adjustStock,
    send,
    syncProducts,
    onEvent,
  };
}
