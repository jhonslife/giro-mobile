/**
 * Store para Contexto Enterprise (Contrato/Obra ativo)
 * Mantém o contexto global do usuário enterprise
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Contract,
  WorkFront,
  StockLocation,
  EnterpriseRole,
  EnterpriseUserContext,
} from '@/types/enterprise-context';

interface EnterpriseContextState {
  // User context
  userContext: EnterpriseUserContext | null;
  isEnterprise: boolean;

  // Active contract/location
  activeContract: Contract | null;
  activeWorkFront: WorkFront | null;
  activeLocation: StockLocation | null;

  // Available options
  availableContracts: Contract[];
  availableWorkFronts: WorkFront[];
  availableLocations: StockLocation[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUserContext: (context: EnterpriseUserContext) => void;
  setActiveContract: (contract: Contract | null) => void;
  setActiveWorkFront: (workFront: WorkFront | null) => void;
  setActiveLocation: (location: StockLocation | null) => void;
  setAvailableContracts: (contracts: Contract[]) => void;
  setAvailableWorkFronts: (workFronts: WorkFront[]) => void;
  setAvailableLocations: (locations: StockLocation[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;

  // Computed helpers
  canApprove: () => boolean;
  getApprovalLimit: () => number;
  hasAccessToContract: (contractId: string) => boolean;
  hasAccessToLocation: (locationId: string) => boolean;

  // Reset
  reset: () => void;
}

const initialState = {
  userContext: null,
  isEnterprise: false,
  activeContract: null,
  activeWorkFront: null,
  activeLocation: null,
  availableContracts: [],
  availableWorkFronts: [],
  availableLocations: [],
  isLoading: false,
  isInitialized: false,
};

export const useEnterpriseContextStore = create<EnterpriseContextState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUserContext: (context) =>
        set({
          userContext: context,
          isEnterprise: true,
          isInitialized: true,
        }),

      setActiveContract: (contract) =>
        set({
          activeContract: contract,
          // Clear dependent selections when contract changes
          activeWorkFront: null,
          activeLocation: null,
          availableWorkFronts: [],
          availableLocations: [],
        }),

      setActiveWorkFront: (workFront) =>
        set({
          activeWorkFront: workFront,
        }),

      setActiveLocation: (location) =>
        set({
          activeLocation: location,
        }),

      setAvailableContracts: (contracts) => set({ availableContracts: contracts }),

      setAvailableWorkFronts: (workFronts) => set({ availableWorkFronts: workFronts }),

      setAvailableLocations: (locations) => set({ availableLocations: locations }),

      setIsLoading: (loading) => set({ isLoading: loading }),

      setIsInitialized: (initialized) => set({ isInitialized: initialized }),

      canApprove: () => {
        const { userContext } = get();
        if (!userContext) return false;
        return userContext.canApproveRequests || userContext.canApproveTransfers;
      },

      getApprovalLimit: () => {
        const { userContext } = get();
        return userContext?.approvalLimit ?? 0;
      },

      hasAccessToContract: (contractId: string) => {
        const { userContext } = get();
        if (!userContext) return false;
        // Gestor has access to all
        if (userContext.role === 'GESTOR') return true;
        // Others only to assigned contracts
        return userContext.assignedContracts.includes(contractId);
      },

      hasAccessToLocation: (locationId: string) => {
        const { userContext } = get();
        if (!userContext) return false;
        // Gestor has access to all
        if (userContext.role === 'GESTOR') return true;
        // Others only to assigned locations
        return userContext.assignedLocations.includes(locationId);
      },

      reset: () => set(initialState),
    }),
    {
      name: 'giro-enterprise-context',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist essential context
        activeContract: state.activeContract,
        activeWorkFront: state.activeWorkFront,
        activeLocation: state.activeLocation,
      }),
    }
  )
);

/**
 * Hook selector para role do usuário
 */
export const useEnterpriseRole = (): EnterpriseRole | null => {
  return useEnterpriseContextStore((state) => state.userContext?.role ?? null);
};

/**
 * Hook selector para verificar se pode aprovar
 */
export const useCanApprove = (): boolean => {
  return useEnterpriseContextStore((state) => state.canApprove());
};

/**
 * Hook selector para contrato ativo
 */
export const useActiveContract = () => {
  return useEnterpriseContextStore((state) => state.activeContract);
};

/**
 * Hook selector para localização ativa
 */
export const useActiveLocation = () => {
  return useEnterpriseContextStore((state) => state.activeLocation);
};
