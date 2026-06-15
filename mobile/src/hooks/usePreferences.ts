import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

export interface UserPreferences {
  shareLateNightActivity: boolean;
  timeoutConsent: boolean;
  screenTimeConsent?: boolean;
  notifyNudge?: boolean;
  notifyPartnerLog?: boolean;
  notifyChallenge?: boolean;
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<UserPreferences>('/users/me/preferences');
      setPreferences(data);
    } catch (err) {
      console.error('Failed to fetch preferences', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    // Optimistic update
    setPreferences((prev) => prev ? { ...prev, [key]: value } : null);
    try {
      await api.patch('/users/me/preferences', { [key]: value });
    } catch (err) {
      console.error('Failed to update preference', err);
      // Revert on error
      fetchPreferences();
    }
  };

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          fetchPreferences();
        }
      }
    };
    init();
  }, [isAuthenticated, fetchPreferences]);

  return { preferences, isLoading, updatePreference };
}
