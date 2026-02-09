import { create } from 'zustand';
import { setToken, setOnUnauthorized } from '../lib/api';

function readStoredAuth() {
  const token = localStorage.getItem('casino_token');
  const userStr = localStorage.getItem('casino_user');
  if (token && userStr) {
    try {
      const { userId, username } = JSON.parse(userStr);
      return { token, userId, username, isAuthenticated: true };
    } catch {
      // Corrupted data — clear it
      localStorage.removeItem('casino_token');
      localStorage.removeItem('casino_user');
    }
  }
  return { token: null, userId: null, username: null, isAuthenticated: false };
}

interface AuthState {
  token: string | null;
  userId: number | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, userId: number, username: string) => void;
  logout: () => void;
}

// Initialize from localStorage synchronously — no restore() needed
const initial = readStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,

  login: (token, userId, username) => {
    localStorage.setItem('casino_token', token);
    localStorage.setItem('casino_user', JSON.stringify({ userId, username }));
    setToken(token);
    set({ token, userId, username, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('casino_token');
    localStorage.removeItem('casino_user');
    setToken(null);
    set({ token: null, userId: null, username: null, isAuthenticated: false });
  },
}));

// Wire up auto-logout on 401 responses
setOnUnauthorized(() => {
  useAuthStore.getState().logout();
});
