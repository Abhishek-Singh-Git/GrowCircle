import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../services/api';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  timezone: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (partial: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // True until we check stored tokens on app boot

  setAuth: (user, accessToken, refreshToken) => {
    SecureStore.setItemAsync('accessToken', accessToken);
    SecureStore.setItemAsync('refreshToken', refreshToken);
    AsyncStorage.setItem('user', JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  logout: () => {
    SecureStore.deleteItemAsync('accessToken');
    SecureStore.deleteItemAsync('refreshToken');
    AsyncStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  rehydrate: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userStr = await AsyncStorage.getItem('user');

      if (!accessToken) {
        set({ isLoading: false });
        return;
      }

      // Restore user from cache immediately so UI is not blank
      const cachedUser: User | null = userStr ? JSON.parse(userStr) : null;
      if (cachedUser) {
        set({ user: cachedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      }

      // Try to get fresh user data from API
      try {
        const res = await fetch(`${BASE_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.ok) {
          const freshUser: User = await res.json();
          AsyncStorage.setItem('user', JSON.stringify(freshUser));
          set({ user: freshUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
        } else if (res.status === 401 && refreshToken) {
          // Try refresh
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            SecureStore.setItemAsync('accessToken', data.accessToken);
            SecureStore.setItemAsync('refreshToken', data.refreshToken);

            // Retry user fetch with new token
            const retryRes = await fetch(`${BASE_URL}/users/me`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.accessToken}` },
            });
            if (retryRes.ok) {
              const freshUser: User = await retryRes.json();
              AsyncStorage.setItem('user', JSON.stringify(freshUser));
              set({ user: freshUser, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true, isLoading: false });
            }
          } else {
            // Refresh failed — log out
            get().logout();
          }
        } else if (!cachedUser) {
          set({ isLoading: false });
        }
      } catch {
        // Network error — if we have cached user, stay logged in
        if (!cachedUser) {
          set({ isLoading: false });
        }
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));

