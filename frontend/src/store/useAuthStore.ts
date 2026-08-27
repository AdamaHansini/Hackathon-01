import { create } from 'zustand';
import { User, Role } from '../types';

interface AuthState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isInitialized: false,
  setAuth: (user) => 
    set({ user, role: user.role, isAuthenticated: true, isInitialized: true }),
  clearAuth: () => 
    set({ user: null, role: null, isAuthenticated: false, isInitialized: true }),
  setInitialized: () => set({ isInitialized: true }),
}));
