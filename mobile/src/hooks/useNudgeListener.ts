import { useEffect } from 'react';
import { wsService } from '../services/websocket';
import { useAuthStore } from '../stores/authStore';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { navigate } from '../navigation/navigationRef';

export function useNudgeListener() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const unsub = wsService.on('nudge_sent', (data: any) => {
      // Check if we are the target
      if (data.nudge?.targetId === user?.id) {
        // Trigger haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        // Show Toast
        Toast.show({
          type: 'info',
          text1: `🔔 Nudge from ${data.senderName}`,
          text2: data.nudge?.goalId ? 'Reminder to complete your goal! Tap here.' : 'Just checking in on you! Tap here.',
          position: 'top',
          visibilityTime: 4000,
          onPress: () => {
            if (data.nudge?.goalId) {
              navigate('Today');
            } else {
              navigate('Chat');
            }
            Toast.hide();
          }
        });
      }
    });

    return () => unsub();
  }, [user]);
}
