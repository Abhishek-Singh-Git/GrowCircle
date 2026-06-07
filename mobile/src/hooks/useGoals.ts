/**
 * GrowCircle — Goal API Hooks
 * React hooks connecting the UI to the backend goal and logging APIs.
 */
import { useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useGoalsStore } from '../stores/goalsStore';
import { useCircleStore } from '../stores/circleStore';
import { v4 as uuidv4 } from 'uuid';

// ── Fetch Today's Goal Instances ────────────────────────────────────────
export function useFetchTodayGoals() {
  const activeCircleId = useCircleStore((s) => s.activeCircleId);
  const setTodayInstances = useGoalsStore((s) => s.setTodayInstances);
  const setLoading = useGoalsStore((s) => s.setLoading);

  const fetch = useCallback(async () => {
    if (!activeCircleId) return;
    setLoading(true);
    try {
      const instances = await api.get<any[]>(
        `/goal-instances?circle_id=${activeCircleId}`,
      );
      setTodayInstances(instances);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCircleId, setTodayInstances, setLoading]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { refetch: fetch };
}

// ── Complete a Goal (Log Activity) ──────────────────────────────────────
export function useCompleteGoal() {
  const markCompleted = useGoalsStore((s) => s.markCompleted);

  return useCallback(
    async (instanceId: string, notes?: string) => {
      try {
        const result = await api.post<any>('/logs', {
          clientUuid: uuidv4(),
          goalInstanceId: instanceId,
          status: 'completed',
          completionFraction: 1,
          notes: notes || null,
        });

        // Optimistic update
        markCompleted(instanceId, result);
        return result;
      } catch (err) {
        console.error('Failed to complete goal:', err);
        throw err;
      }
    },
    [markCompleted],
  );
}

// ── Create a New Goal ───────────────────────────────────────────────────
export function useCreateGoal() {
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  return useCallback(
    async (goalData: {
      name: string;
      goalType: string;
      targetValue?: number;
      targetUnit?: string;
      scheduleType: string;
      category?: string;
      categoryEmoji?: string;
      difficultyWeight?: number;
    }) => {
      if (!activeCircleId) throw new Error('No active circle');

      const goal = await api.post<any>('/goals', {
        circleId: activeCircleId,
        ...goalData,
      });

      return goal;
    },
    [activeCircleId],
  );
}

// ── Add Reaction to a Log ───────────────────────────────────────────────
export function useAddReaction() {
  const addReaction = useGoalsStore((s) => s.addReaction);

  return useCallback(
    async (logId: string, emoji: string) => {
      try {
        const reaction = await api.post<any>(
          `/logs/${logId}/reactions`,
          { emoji },
        );
        addReaction(logId, reaction);
        return reaction;
      } catch (err) {
        console.error('Failed to add reaction:', err);
        throw err;
      }
    },
    [addReaction],
  );
}
