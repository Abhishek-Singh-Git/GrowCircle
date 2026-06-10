import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useCircleStore } from '../stores/circleStore';
import { wsService } from '../services/websocket';

export interface FeedMember {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    lastActiveAt: string | null;
  };
  role: string;
  todaySummary: {
    totalGoals: number;
    completed: number;
    completionRate: number;
  };
  goalInstances: Array<{
    id: string;
    status: string;
    targetValue: number | null;
    goal: {
      id: string;
      name: string;
      goalType: string;
      targetValue: number | null;
      targetUnit: string | null;
      category: string;
      categoryEmoji: string | null;
      isSensitive: boolean;
    };
  }>;
}

export function useCircleFeed() {
  const activeCircleId = useCircleStore((s) => s.activeCircleId);
  const [feed, setFeed] = useState<FeedMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFeed = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoading(true);
    try {
      const data: FeedMember[] = await api.get(`/circles/${activeCircleId}/feed`);
      setFeed(data);
    } catch (err) {
      console.error('Failed to fetch circle feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCircleId]);

  useEffect(() => {
    fetchFeed();

    const unsubscribe = wsService.on('goal_completed', (payload: any) => {
      // Re-fetch the feed when someone completes a goal so stats update
      // In a perfectly optimized app, we'd update the specific feed member in-place
      fetchFeed();
    });

    return () => unsubscribe();
  }, [fetchFeed]);

  return { feed, isLoading, refetch: fetchFeed };
}
