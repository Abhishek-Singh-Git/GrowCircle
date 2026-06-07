/**
 * GrowCircle — Circle Store (Zustand)
 * Manages active circle, member list, and circle switching.
 */
import { create } from 'zustand';

interface CircleMember {
  id: string;
  name: string;
  avatarUrl?: string;
  role: 'owner' | 'member';
}

interface Circle {
  id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  role: string;
  memberCount: number;
  members: CircleMember[];
  joinedAt: string;
}

interface CircleState {
  circles: Circle[];
  activeCircleId: string | null;
  activeCircle: Circle | null;
  upLatePartners: string[];

  // Actions
  setCircles: (circles: Circle[]) => void;
  setActiveCircle: (circleId: string) => void;
  addCircle: (circle: Circle) => void;
  addUpLatePartner: (userId: string) => void;
  reset: () => void;
}

export const useCircleStore = create<CircleState>((set, get) => ({
  circles: [],
  activeCircleId: null,
  activeCircle: null,
  upLatePartners: [],

  setCircles: (circles) => {
    const activeId = get().activeCircleId;
    const active = activeId
      ? circles.find((c) => c.id === activeId) || circles[0] || null
      : circles[0] || null;

    set({
      circles,
      activeCircleId: active?.id || null,
      activeCircle: active,
    });
  },

  setActiveCircle: (circleId) => {
    const circle = get().circles.find((c) => c.id === circleId) || null;
    set({ activeCircleId: circleId, activeCircle: circle });
  },

  addCircle: (circle) =>
    set((state) => ({
      circles: [...state.circles, circle],
      activeCircleId: state.activeCircleId || circle.id,
      activeCircle: state.activeCircle || circle,
    })),

  addUpLatePartner: (userId) =>
    set((state) => ({
      upLatePartners: state.upLatePartners.includes(userId)
        ? state.upLatePartners
        : [...state.upLatePartners, userId],
    })),

  reset: () =>
    set({
      circles: [],
      activeCircleId: null,
      activeCircle: null,
      upLatePartners: [],
    }),
}));
