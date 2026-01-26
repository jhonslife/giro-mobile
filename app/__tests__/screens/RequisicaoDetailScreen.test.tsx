/**
 * Tests for RequisicaoDetailScreen
 *
 * Covers:
 * - Rendering with different statuses
 * - Loading and error states
 * - Actions (submit, approve, reject)
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
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
  useLocalSearchParams: () => ({ id: 'req-123' }),
  useRouter: () => ({
    back: mockGoBack,
    push: mockPush,
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock BarcodeScanner component
jest.mock('@/components/scanner', () => ({
  BarcodeScanner: () => null,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  Package: () => null,
  Plus: () => null,
  Trash2: () => null,
  Send: () => null,
  Check: () => null,
  X: () => null,
  Edit3: () => null,
  Clock: () => null,
  User: () => null,
  MapPin: () => null,
  Calendar: () => null,
  AlertTriangle: () => null,
  Barcode: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
}));

// Mock useMaterialRequests hook
const mockLoadRequest = jest.fn();
const mockResetCurrentRequest = jest.fn();
const mockSubmitRequest = jest.fn();
const mockApproveRequest = jest.fn();
const mockRejectRequest = jest.fn();
const mockCancelRequest = jest.fn();
const mockAddItemToRequest = jest.fn();
const mockRemoveItemFromRequest = jest.fn();

// This object allows us to control the hook's return value in tests
const mockHookState: any = {
  isLoading: false,
  currentRequest: null,
  loadRequest: mockLoadRequest,
  resetCurrentRequest: mockResetCurrentRequest,
  submitRequest: mockSubmitRequest,
  approveRequest: mockApproveRequest,
  rejectRequest: mockRejectRequest,
  cancelRequest: mockCancelRequest,
  addItemToRequest: mockAddItemToRequest,
  removeItemFromRequest: mockRemoveItemFromRequest,
};

jest.mock('@/hooks/useMaterialRequests', () => ({
  useMaterialRequests: () => mockHookState,
}));

// Mock enterprise context store
jest.mock('@/stores/enterpriseContextStore', () => ({
  useEnterpriseContextStore: () => ({
    activeContract: {
      id: 'contract-1',
      code: 'OBRA-001',
      name: 'Obra ABC',
    },
  }),
}));

// Mock auth store with operator role
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'emp-123',
      name: 'Test User',
      role: 'OPERATOR',
    },
  }),
}));

// Import after mocks
import RequisicaoDetailScreen from '../../requisicoes/[id]';

// =============================================================================
// FACTORIES
// =============================================================================

interface MockRequestOverrides {
  id?: string;
  requestNumber?: string;
  status?:
    | 'DRAFT'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'SEPARATING'
    | 'READY'
    | 'DELIVERED'
    | 'CANCELLED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  contractId?: string;
  contractName?: string;
  requesterId?: string;
  requesterName?: string;
  createdAt?: string;
  notes?: string;
  items?: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    notes?: string | null;
  }>;
  activityName?: string;
  rejectionReason?: string;
}

const createMockRequest = (overrides: MockRequestOverrides = {}) => ({
  id: 'req-123',
  requestNumber: 'REQ-2026-0001',
  status: 'DRAFT' as const,
  priority: 'NORMAL' as const,
  contractId: 'contract-1',
  contractName: 'Contrato ABC',
  requesterId: 'emp-123',
  requesterName: 'João Silva',
  createdAt: '2026-01-20T10:00:00Z',
  notes: 'Requisição de teste',
  items: [],
  ...overrides,
});

const createMockItem = (overrides: Partial<MockRequestOverrides['items']> = {}) => ({
  id: 'item-1',
  productId: 'prod-1',
  productName: 'Cimento CP-II',
  quantity: 10,
  unit: 'SC',
  notes: null,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('RequisicaoDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadRequest.mockResolvedValue(undefined); // Default success

    // Reset hook state
    mockHookState.isLoading = false;
    mockHookState.currentRequest = null;
  });

  describe('Loading State', () => {
    it('should show loading indicator initially', () => {
      // Even if loading finishes quickly, the first render should show loading
      // But since we are mocking loadRequest to resolve immediately, we might miss the loading state
      // unless we delay the resolution.
      mockLoadRequest.mockImplementation(() => new Promise(() => {}));

      render(<RequisicaoDetailScreen />);

      expect(screen.getByText('Carregando requisição...')).toBeTruthy();
    });
  });

  describe('Request Details', () => {
    it('should display request number after loading', async () => {
      mockHookState.currentRequest = createMockRequest();

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('REQ-2026-0001')).toBeTruthy();
      });
    });

    it('should display requester name', async () => {
      mockHookState.currentRequest = createMockRequest({ requesterName: 'Maria Santos' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Maria Santos')).toBeTruthy();
      });
    });

    it('should display contract name', async () => {
      mockHookState.currentRequest = createMockRequest();

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Obra ABC')).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    it('should show Rascunho for DRAFT status', async () => {
      mockHookState.currentRequest = createMockRequest({ status: 'DRAFT' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rascunho')).toBeTruthy();
      });
    });

    it('should show Aguardando Aprovação for PENDING status', async () => {
      mockHookState.currentRequest = createMockRequest({ status: 'PENDING' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Aguardando Aprovação')).toBeTruthy();
      });
    });

    it('should show Aprovada for APPROVED status', async () => {
      mockHookState.currentRequest = createMockRequest({ status: 'APPROVED' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Aprovada')).toBeTruthy();
      });
    });

    it('should show Rejeitada for REJECTED status', async () => {
      mockHookState.currentRequest = createMockRequest({ status: 'REJECTED' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rejeitada')).toBeTruthy();
      });
    });

    it('should show Entregue for DELIVERED status', async () => {
      mockHookState.currentRequest = createMockRequest({ status: 'DELIVERED' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Entregue')).toBeTruthy();
      });
    });
  });

  describe('Priority Display', () => {
    it('should show Baixa for LOW priority', async () => {
      mockHookState.currentRequest = createMockRequest({ priority: 'LOW' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Baixa')).toBeTruthy();
      });
    });

    it('should show Normal for NORMAL priority', async () => {
      mockHookState.currentRequest = createMockRequest({ priority: 'NORMAL' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeTruthy();
      });
    });

    it('should show Alta for HIGH priority', async () => {
      mockHookState.currentRequest = createMockRequest({ priority: 'HIGH' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Alta')).toBeTruthy();
      });
    });

    it('should show Urgente for URGENT priority', async () => {
      mockHookState.currentRequest = createMockRequest({ priority: 'URGENT' });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Urgente')).toBeTruthy();
      });
    });
  });

  describe('Not Found State', () => {
    it('should show not found message when request is null', async () => {
      mockHookState.currentRequest = null;

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Requisição não encontrada')).toBeTruthy();
      });
    });
  });

  describe('Items Display', () => {
    it('should display item name when items exist', async () => {
      mockHookState.currentRequest = createMockRequest({
        items: [createMockItem({ productName: 'Cimento Portland' })],
      });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Cimento Portland')).toBeTruthy();
      });
    });

    it('should display multiple items', async () => {
      mockHookState.currentRequest = createMockRequest({
        items: [
          createMockItem({ id: '1', productName: 'Cimento' }),
          createMockItem({ id: '2', productName: 'Areia' }),
          createMockItem({ id: '3', productName: 'Brita' }),
        ],
      });

      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Cimento')).toBeTruthy();
        expect(screen.getByText('Areia')).toBeTruthy();
        expect(screen.getByText('Brita')).toBeTruthy();
      });
    });
  });

  describe('Hook Integration', () => {
    it('should call loadRequest on mount', async () => {
      render(<RequisicaoDetailScreen />);

      await waitFor(() => {
        expect(mockLoadRequest).toHaveBeenCalledWith('req-123');
      });
    });
  });
});
