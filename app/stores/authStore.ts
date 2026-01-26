/**
 * Store para Autenticação do Usuário
 * Gerencia estado de login e permissões
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'ADMIN' | 'OPERATOR' | 'ALMOXARIFE' | 'SUPERVISOR' | 'GESTOR';
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;

  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      login: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;

        // Admin tem todas as permissões
        if (user.role === 'ADMIN') return true;

        // Verificar permissões específicas
        if (user.permissions?.includes(permission)) return true;

        // Permissões por role
        const rolePermissions: Record<string, string[]> = {
          OPERATOR: ['view', 'create'],
          ALMOXARIFE: ['view', 'create', 'edit', 'transfer', 'receive'],
          SUPERVISOR: ['view', 'create', 'edit', 'approve', 'transfer', 'receive'],
          GESTOR: ['view', 'create', 'edit', 'approve', 'delete', 'transfer', 'receive'],
        };

        return rolePermissions[user.role]?.includes(permission) ?? false;
      },

      reset: () => set(initialState),
    }),
    {
      name: 'giro-mobile-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
