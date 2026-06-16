import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useCircleStore } from '../stores/circleStore';

export interface ChallengeParticipant {
  userId: string;
  status: string;
  progress: number;
  proofText: string | null;
  verificationStatus: string;
  submittedAt: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface Challenge {
  id: string;
  title: string;
  status: string;
  computedStatus?: string;
  deadline: string;
  durationHours: number;
  remainingMs: number;
  proposerId: string;
  conditionType: string;
  conditionTarget: number | null;
  conditionDescription: string;
  outcomeType: string | null;
  proposer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  winner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  participants: ChallengeParticipant[];
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

  const incrementProgress = async (challengeId: string) => {
    await api.post(`/challenges/${challengeId}/increment`, {});
    await fetchChallenges();
  };

  // Battle Arena 2.0: Submit victory with proof text
  const submitVictory = async (challengeId: string, proofText: string) => {
    await api.post(`/challenges/${challengeId}/submit-victory`, { proofText });
    await fetchChallenges();
  };

  const resolveChallenge = async (challengeId: string, payload: any) => {
    await api.post(`/challenges/${challengeId}/resolve`, payload);
    await fetchChallenges();
  };

  const acceptVictory = async (challengeId: string, participantId: string) => {
    await api.post(`/challenges/${challengeId}/participants/${participantId}/accept-victory`, {});
    await fetchChallenges();
  };

  const rejectVictory = async (challengeId: string, participantId: string, reason: string) => {
    await api.post(`/challenges/${challengeId}/participants/${participantId}/reject-victory`, { reason });
    await fetchChallenges();
  };

  const clearHistory = async (challengeId: string) => {
    await api.delete(`/challenges/${challengeId}/history`);
    await fetchChallenges();
  };

  return {
    challenges,
    isLoading,
    fetchChallenges,
    createChallenge,
    respondToChallenge,
    incrementProgress,
    submitVictory,
    resolveChallenge,
    acceptVictory,
    rejectVictory,
    clearHistory,
  };
}
