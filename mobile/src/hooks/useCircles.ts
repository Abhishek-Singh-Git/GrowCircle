import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useCircleStore } from '../stores/circleStore';
import { useAuthStore } from '../stores/authStore';

export function useCircles() {
  const [isLoading, setIsLoading] = useState(false);
  const setCircles = useCircleStore((s) => s.setCircles);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const fetchCircles = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const circles = await api.get<any[]>('/circles');
      setCircles(circles);
    } catch (err) {
      console.error('Failed to fetch circles', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setCircles]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  const createCircle = async (name: string, description: string) => {
    setIsLoading(true);
    try {
      const circle = await api.post<any>('/circles', { name, description });
      await fetchCircles();
      return circle;
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinCircle = async (code: string) => {
    setIsLoading(true);
    try {
      const circle = await api.post<any>('/circles/join', { code });
      await fetchCircles();
      return circle;
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, fetchCircles, createCircle, joinCircle };
}
