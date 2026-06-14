/**
 * GrowCircle — WebSocket Service
 * Manages real-time connection to the feed gateway.
 * Per-circle channels with heartbeat presence.
 */
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const WS_URL = __DEV__
  ? 'http://10.0.2.2:3001/feed'
  : 'https://growcircle-production.up.railway.app/feed'; // Live Railway Backend


class WebSocketService {
  private socket: Socket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Event listeners
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect() {
    const connectWithToken = () => {
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        // Wait for token to be available
        this.connectionTimeout = setTimeout(connectWithToken, 1000);
        return;
      }
      
      if (this.socket?.connected) return;

      this.socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      });

      this.socket.on('connect', async () => {
        console.log('🟢 WebSocket connected');
        this.startHeartbeat();
        // Join the active circle channel after connection
        try {
          const { useCircleStore } = require('../stores/circleStore');
          const activeCircleId = useCircleStore.getState().activeCircleId;
          if (activeCircleId) {
            this.joinCircle(activeCircleId);
          }
        } catch (e) {
          console.warn('Failed to join circle on ws connect', e);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔴 WebSocket disconnected:', reason);
        this.stopHeartbeat();
      });

      // Reconnect event to rejoin active circle
      this.socket.on('reconnect', async (attemptNumber) => {
        console.log('🔄 WebSocket reconnected after attempts:', attemptNumber);
        // Re-join active circle channel
        try {
          const { useCircleStore } = require('../stores/circleStore');
          const activeCircleId = useCircleStore.getState().activeCircleId;
          if (activeCircleId) {
            this.joinCircle(activeCircleId);
          }
        } catch (e) {
          console.warn('Failed to rejoin circle on ws reconnect', e);
        }
      });

      // Forward all events to registered listeners
      const events = [
        'goal_completed',
        'reaction_added',
        'nudge_sent',
        'partner_online',
        'partner_offline',
        'chat_message',
        'draw:stroke',
        'draw:clear',
        'intervention_initiated',
        'intervention_overridden',
        'intervention_cancelled',
        'partner_up_late',
      ];

      events.forEach((event) => {
        this.socket?.on(event, (data: unknown) => {
          this.emit(event, data);
        });
      });
    };

    connectWithToken();
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }

  // ── Circle Channel Management ─────────────────────────────────────────
  joinCircle(circleId: string) {
    this.socket?.emit('join_circle', { circleId });
  }

  leaveCircle(circleId: string) {
    this.socket?.emit('leave_circle', { circleId });
  }

  // ── Shared Drawing ────────────────────────────────────────────────────
  sendDrawStroke(circleId: string, stroke: any) {
    this.socket?.emit('draw:stroke', { circleId, stroke });
  }

  sendDrawClear(circleId: string) {
    this.socket?.emit('draw:clear', { circleId });
  }

  // ── Heartbeat Presence System ─────────────────────────────────────────
  private startHeartbeat() {
      this.heartbeatInterval = setInterval(() => {
        try {
          const { useCircleStore } = require('../stores/circleStore');
          const activeCircleId = useCircleStore.getState().activeCircleId;
          if (activeCircleId) {
            this.socket?.emit('heartbeat', { circleId: activeCircleId });
          }
        } catch (e) {
          console.warn('Heartbeat error', e);
        }
      }, 30000); // Every 30 seconds
    }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ── Event Bus ─────────────────────────────────────────────────────────
  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}

export const wsService = new WebSocketService();
