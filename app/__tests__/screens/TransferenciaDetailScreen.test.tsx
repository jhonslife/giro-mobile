/**
 * Tests for TransferenciaDetailScreen
 *
 * Covers:
 * - Rendering with different statuses
 * - Loading and error states
 * - Transfer operations
 */

import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock expo-router
const mockGoBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ id: 'trf-123' }),
  useRouter: () => ({
    back: mockGoBack,
    push: mockPush,
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Package: () => null,
  Plus: () => null,
  Trash2: () => null,
  Truck: () => null,
  Check: () => null,
  X: () => null,
  ArrowRight: () => null,
  Clock: () => null,
  User: () => null,
  MapPin: () => null,
  Calendar: () => null,
  AlertTriangle: () => null,
  Barcode: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  CheckCircle: () => null,
  XCircle: () => null,
  AlertCircle: () => null,
}));

// Mock useStockTransfers hook
const mockLoadTransfer = jest.fn();
const mockShipTransfer = jest.fn();
const mockReceiveTransfer = jest.fn();
const mockCancelTransfer = jest.fn();
const mockUpdateTransfer = jest.fn();
const mockAddItem = jest.fn();
const mockRemoveItem = jest.fn();

const mockHookState: any = {
  isLoading: false,
  currentTransfer: null,
  loadTransfer: mockLoadTransfer,
  shipTransfer: mockShipTransfer,
  receiveTransfer: mockReceiveTransfer,
  cancelTransfer: mockCancelTransfer,
  updateTransfer: mockUpdateTransfer,
  addItem: mockAddItem,
  removeItem: mockRemoveItem,
};

jest.mock('@/hooks/useStockTransfers', () => ({
  useStockTransfers: () => mockHookState,
}));

// Mock enterprise context store
jest.mock('@/stores/enterpriseContextStore', () => ({
  useEnterpriseContextStore: () => ({
    activeContract: {
      id: 'contract-1',
      code: 'OBRA-001',
      name: 'Obra ABC',
    },
    locations: [
      { id: 'loc-1', name: 'Almoxarifado Central' },
      { id: 'loc-2', name: 'Obra Frente A' },
    ],
    availableLocations: [
      { id: 'loc-1', name: 'Almoxarifado Central' },
      { id: 'loc-2', name: 'Obra Frente A' },
    ],
  }),
}));

// Mock auth store
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'emp-123',
      name: 'Test User',
      role: 'ALMOXARIFE',
      locationId: 'loc-1',
    },
  }),
}));

// Import after mocks
import TransferenciaDetailScreen from '../../transferencias/[id]';

// =============================================================================
// FACTORIES
// =============================================================================

interface MockTransferOverrides {
  id?: string;
  transferNumber?: string;
  status?: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'PARTIAL_RECEIVED' | 'CANCELLED';
  sourceLocationId?: string;
  sourceLocationName?: string;
  destinationLocationId?: string;
  destinationLocationName?: string;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  notes?: string;
  items?: Array<{
    id: string;
    productId: string;
    productName: string;
    requestedQuantity: number;
    receivedQuantity?: number;
    unit: string;
    lotNumber?: string;
    notes?: string | null;
  }>;
}

const createMockTransfer = (overrides: MockTransferOverrides = {}) => ({
  id: 'trf-123',
  transferNumber: 'TRF-ALM01-OBR01-0001',
  status: 'DRAFT' as const,
  sourceLocationId: 'loc-1',
  sourceLocationName: 'Almoxarifado Central',
  destinationLocationId: 'loc-2',
  destinationLocationName: 'Obra Frente A',
  createdById: 'emp-123',
  createdByName: 'João Silva',
  createdAt: '2026-01-20T10:00:00Z',
  notes: 'Transferência de teste',
  items: [],
  ...overrides,
});

interface MockTransferItem {
  id: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  receivedQuantity?: number;
  unit: string;
  lotNumber?: string;
  notes?: string | null;
}

const createMockItem = (overrides: Partial<MockTransferItem> = {}): MockTransferItem => ({
  id: 'item-1',
  productId: 'prod-1',
  productName: 'Cimento CP-II',
  requestedQuantity: 50,
  unit: 'SC',
  lotNumber: 'LOT-001',
  notes: null,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('TransferenciaDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadTransfer.mockResolvedValue(undefined);
    mockHookState.isLoading = false;
    mockHookState.currentTransfer = null;
  });

  describe('Loading State', () => {
    it('should show loading indicator initially', () => {
      // With the useEffect logic, it sets local loading true then false after await
      // If we delay resolution, we see loading
      mockLoadTransfer.mockImplementation(() => new Promise(() => {}));

      render(<TransferenciaDetailScreen />);

      expect(screen.getByText('Carregando transferência...')).toBeTruthy();
    });
  });

  describe('Transfer Details', () => {
    it('should display transfer number after loading', async () => {
      mockHookState.currentTransfer = createMockTransfer();

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('TRF-ALM01-OBR01-0001')).toBeTruthy();
      });
    });

    it('should display origin location', async () => {
      mockHookState.currentTransfer = createMockTransfer();

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Almoxarifado Central')).toBeTruthy();
      });
    });

    it('should display destination location', async () => {
      mockHookState.currentTransfer = createMockTransfer();

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Obra Frente A')).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    it('should show Rascunho for DRAFT status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'DRAFT' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rascunho')).toBeTruthy();
      });
    });

    it('should show Em Trânsito for IN_TRANSIT status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'IN_TRANSIT' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Em Trânsito')).toBeTruthy();
      });
    });

    it('should show Recebida for RECEIVED status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'RECEIVED' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Recebida')).toBeTruthy();
      });
    });

    it('should show Recebida Parcialmente for PARTIAL_RECEIVED status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'PARTIAL_RECEIVED' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Recebida Parcialmente')).toBeTruthy();
      });
    });

    it('should show Cancelada for CANCELLED status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'CANCELLED' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Cancelada')).toBeTruthy();
      });
    });
  });

  describe('Not Found State', () => {
    it('should show not found message when transfer is null', async () => {
      mockHookState.currentTransfer = null;

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Transferência não encontrada')).toBeTruthy();
      });
    });
  });

  describe('Items Display', () => {
    it('should display item name when items exist', async () => {
      mockHookState.currentTransfer = createMockTransfer({
        items: [createMockItem({ productName: 'Cimento Portland' })],
      });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Cimento Portland')).toBeTruthy();
      });
    });

    it('should display item quantity', async () => {
      mockHookState.currentTransfer = createMockTransfer({
        items: [createMockItem({ requestedQuantity: 100, unit: 'UN' })],
      });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText(/100/)).toBeTruthy();
      });
    });

    it('should display lot number when available', async () => {
      mockHookState.currentTransfer = createMockTransfer({
        items: [createMockItem({ lotNumber: 'LOTE-2026-001', productName: 'Item com Lote' })],
      });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Item com Lote')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Item com Lote'));

      await waitFor(() => {
        expect(screen.getByText(/LOTE-2026-001/)).toBeTruthy();
      });
    });
  });

  describe('Hook Integration', () => {
    it('should call loadTransfer on mount', async () => {
      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(mockLoadTransfer).toHaveBeenCalledWith('trf-123');
      });
    });
  });

  describe('Actions', () => {
    it('should not show ship button for non-DRAFT status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'IN_TRANSIT' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Em Trânsito')).toBeTruthy();
      });

      // Ship button should not be visible
      expect(screen.queryByText('Despachar')).toBeNull();
    });

    it('should not show receive button for DRAFT status', async () => {
      mockHookState.currentTransfer = createMockTransfer({ status: 'DRAFT' });

      render(<TransferenciaDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rascunho')).toBeTruthy();
      });

      // Receive button should not be visible
      expect(screen.queryByText('Receber')).toBeNull();
    });
  });
});
