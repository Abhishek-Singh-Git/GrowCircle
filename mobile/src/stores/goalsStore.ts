/**
 * GrowCircle — Goals Store (Zustand)
 * Manages goals, today's instances, and completion state.
 */
import { create } from 'zustand';

interface Goal {
  id: string;
  name: string;
  goalType: string;
  targetValue: number | null;
  targetUnit: string | null;
  category: string;
  categoryEmoji: string | null;
  difficultyWeight: number;
  requireProof: boolean;
  status: string;
}

interface GoalInstance {
  id: string;
  goalId: string;
  date: string;
  targetValue: number | null;
  status: string; // 'pending' | 'completed' | 'partial'
  goal: Goal;
  activityLogs: ActivityLog[];
}

interface ActivityLog {
  id: string;
  status: string;
  completionFraction: number;
  xpAwarded: number;
  proofUrl: string | null;
  notes: string | null;
  loggedAt: string;
  reactions: Reaction[];
}

interface Reaction {
  id: string;
  userId: string;
  emoji: string;
}

interface GoalsState {
  goals: Goal[];
  todayInstances: GoalInstance[];
  isLoading: boolean;

  // Actions
  setGoals: (goals: Goal[]) => void;
  setTodayInstances: (instances: GoalInstance[]) => void;
  setLoading: (loading: boolean) => void;
  markCompleted: (instanceId: string, log: ActivityLog) => void;
  addReaction: (logId: string, reaction: Reaction) => void;
  reset: () => void;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  todayInstances: [],
  isLoading: false,

  setGoals: (goals) => set({ goals }),
  setTodayInstances: (instances) => set({ todayInstances: instances }),
  setLoading: (loading) => set({ isLoading: loading }),

  markCompleted: (instanceId, log) =>
    set((state) => ({
      todayInstances: state.todayInstances.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              status: 'completed',
              activityLogs: [...inst.activityLogs, log],
            }
          : inst,
      ),
    })),

  addReaction: (logId, reaction) =>
    set((state) => ({
      todayInstances: state.todayInstances.map((inst) => ({
        ...inst,
        activityLogs: inst.activityLogs.map((log) =>
          log.id === logId
            ? { ...log, reactions: [...log.reactions, reaction] }
            : log,
        ),
      })),
    })),

  reset: () => set({ goals: [], todayInstances: [], isLoading: false }),
}));
