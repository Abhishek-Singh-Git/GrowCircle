import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useCircleStore } from '../stores/circleStore';
import { useAuthStore } from '../stores/authStore';
import { wsService } from '../services/websocket';

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
      // Join the active circle via WebSocket after circles are set
      const activeCircleId = useCircleStore.getState().activeCircleId || (circles[0] && circles[0].id);
      if (activeCircleId) {
        wsService.joinCircle(activeCircleId);
      }
    } catch (err) {
      console.error('Failed to fetch circles', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setCircles]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  const createCircle = async (data: { name: string; description: string }) => {
    setIsLoading(true);
    try {
      const circle = await api.post<any>('/circles', data);
      await fetchCircles();
      return circle;
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinCircle = async (data: { code: string }) => {
    setIsLoading(true);
    try {
      const circle = await api.post<any>('/circles/join', data);
      await fetchCircles();
      return circle;
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveCircle = async (circleId: string) => {
    setIsLoading(true);
    try {
      await api.delete<any>(`/circles/${circleId}/leave`);
      wsService.leaveCircle(circleId);
      await fetchCircles();
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, fetchCircles, createCircle, joinCircle, leaveCircle };
}
