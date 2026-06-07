/**
 * GrowCircle — Intervention Listener
 *
 * React hook that listens for WebSocket intervention events
 * and coordinates with the native AppLock module to activate/deactivate
 * the lock overlay on the device.
 */
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { wsService } from '../services/websocket';
import AppLockModule from '../native/AppLockModule';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

interface InterventionEvent {
  type: string;
  intervention: {
    id: string;
    interventionType: string;
    appPackage: string | null;
    durationSeconds: number | null;
    status: string;
    initiator: {
      id: string;
      name: string;
    };
  };
}

export function useInterventionListener() {
  const userId = useAuthStore((s) => s.user?.id);
  const activeInterventionId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Listen for incoming interventions
    const unsubCreate = wsService.on('intervention_initiated', (data: unknown) => {
      const event = data as InterventionEvent;
      const intervention = event.intervention;

      // Only react if WE are the target
      if (event.type !== 'timeout' && event.type !== 'alert') return;

      if (event.type === 'alert') {
        // Show a non-blocking alert notification
        Alert.alert(
          '📢 Focus Alert',
          `${intervention.initiator.name} noticed you might be spending too much time on ${intervention.appPackage || 'an app'}.`,
          [{ text: 'Got it', style: 'default' }],
        );
        return;
      }

      // Timeout intervention → show grace period then lock
      if (event.type === 'timeout' && intervention.durationSeconds) {
        activeInterventionId.current = intervention.id;

        // 10-second grace period (PRD FR-008)
        Alert.alert(
          '⏱ Incoming Timeout',
          `${intervention.initiator.name} is setting a ${Math.round(intervention.durationSeconds / 60)}-minute timeout on ${intervention.appPackage || 'an app'}.\n\nLocking in 10 seconds...`,
          [{ text: 'OK', style: 'default' }],
        );

        // After grace period, activate lock
        setTimeout(async () => {
          try {
            await AppLockModule.startLock(
              intervention.appPackage || 'App',
              intervention.initiator.name,
              intervention.durationSeconds! * 1000,
              intervention.id,
            );
          } catch (err) {
            console.error('Failed to start lock:', err);
          }
        }, 10000); // 10-second grace
      }
    });

    // Listen for override/cancellation
    const unsubOverride = wsService.on('intervention_overridden', async () => {
      if (activeInterventionId.current) {
        await AppLockModule.stopLock();
        activeInterventionId.current = null;
      }
    });

    const unsubCancel = wsService.on('intervention_cancelled', async () => {
      if (activeInterventionId.current) {
        await AppLockModule.stopLock();
        activeInterventionId.current = null;
        Alert.alert(
          '🔓 Timeout Cancelled',
          'The timeout has been cancelled.',
        );
      }
    });

    return () => {
      unsubCreate();
      unsubOverride();
      unsubCancel();
    };
  }, [userId]);

  // Override function (called from UI)
  const overrideActiveTimeout = async (reason?: string) => {
    if (!activeInterventionId.current) return;

    try {
      await api.post(
        `/interventions/${activeInterventionId.current}/override`,
        { reason },
      );
      await AppLockModule.stopLock();
      activeInterventionId.current = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Override failed';
      // Parse cooldown response
      try {
        const parsed = JSON.parse(message);
        if (parsed.error === 'COOLDOWN_ACTIVE') {
          Alert.alert(
            '⏳ Cooldown Active',
            `You can override in ${Math.ceil(parsed.secondsRemaining / 60)} minutes.`,
          );
          return;
        }
      } catch {
        // Not a cooldown error
      }
      Alert.alert('Error', message);
    }
  };

  return { overrideActiveTimeout };
}
