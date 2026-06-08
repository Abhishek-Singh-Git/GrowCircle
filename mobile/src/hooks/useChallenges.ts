import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useCircleStore } from '../stores/circleStore';

export interface Challenge {
  id: string;
  title: string;
  status: string;
  deadline: string;
  proposerId: string;
  conditionType: string;
  conditionTarget: number | null;
  proposer: {
    name: string;
  };
  participants: {
    userId: string;
    status: string;
    progress: number;
  }[];
}

export function useChallenges() {
  const activeCircleId = useCircleStore((s) => s.activeCircleId);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChallenges = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoading(true);
    try {
      const data: any = await api.get(`/challenges?circle_id=${activeCircleId}`);
      setChallenges(data);
    } catch (err) {
      console.error('Failed to fetch challenges', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCircleId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const createChallenge = async (payload: any) => {
    await api.post('/challenges', payload);
    await fetchChallenges();
  };

  const respondToChallenge = async (challengeId: string, accept: boolean) => {
    await api.put(`/challenges/${challengeId}/respond`, { accept });
    await fetchChallenges();
  };

  return { challenges, isLoading, fetchChallenges, createChallenge, respondToChallenge };
}
