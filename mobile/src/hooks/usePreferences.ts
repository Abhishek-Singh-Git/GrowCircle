import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UserPreferences {
  shareLateNightActivity: boolean;
  // We can add other fields as needed
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

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return { preferences, isLoading, updatePreference };
}
