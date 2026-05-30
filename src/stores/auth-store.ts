import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tauriInvoke } from '@/lib/tauri';
import { User, LoginResponse } from '@/types';

interface AuthState {
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,
      isValidating: true,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await tauriInvoke<LoginResponse>('login', { req: { email, password } });
          set({ user: res.user, sessionId: res.session_id, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ error: String(err), isLoading: false });
        }
      },

      logout: async () => {
        const { sessionId } = get();
        if (sessionId) {
          await tauriInvoke('logout', { req: { session_id: sessionId } }).catch(console.error);
        }
        set({ user: null, sessionId: null, isAuthenticated: false });
      },

      validateSession: async () => {
        const { sessionId } = get();
        if (!sessionId) {
          set({ isValidating: false });
          return;
        }
        try {
          const user = await tauriInvoke<User | null>('validate_session', { req: { session_id: sessionId } });
          if (user) {
            set({ user, isAuthenticated: true, isValidating: false });
          } else {
            set({ user: null, sessionId: null, isAuthenticated: false, isValidating: false });
          }
        } catch {
          set({ user: null, sessionId: null, isAuthenticated: false, isValidating: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, sessionId: state.sessionId, isAuthenticated: state.isAuthenticated }),
    }
  )
);
