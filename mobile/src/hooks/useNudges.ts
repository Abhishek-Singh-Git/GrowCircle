import { useCallback } from 'react';
import { api } from '../services/api';
import { useCircleStore } from '../stores/circleStore';

export function useSendNudge() {
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  return useCallback(
    async (targetId: string, goalId?: string) => {
      if (!activeCircleId) throw new Error('No active circle');
      
      try {
        const result = await api.post<any>('/nudges', {
          circleId: activeCircleId,
          targetId,
          goalId,
        });
        return result;
      } catch (err) {
        console.error('Failed to send nudge:', err);
        throw err;
      }
    },
    [activeCircleId],
  );
}
