import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { navigate } from '../navigation/navigationRef';

export function useNotificationRouter() {
  useEffect(() => {
    // Listen for users tapping on the push notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!data) return;

      const type = data.type as string;

      switch (type) {
        case 'chat':
          if (data.threadId) {
            navigate('Chat', { threadId: data.threadId });
          }
          break;

        case 'challenge':
          // Navigate to Main Tabs -> Battle Screen
          navigate('Main', { screen: 'Battle' });
          break;

        case 'timeout':
        case 'focus_alert':
          // Navigate to Main Tabs -> Focus Screen
          navigate('Main', { screen: 'Focus' });
          break;

        case 'nudge':
        case 'partner_log':
        case 'late_night':
        case 'badge':
        case 'streak':
          // General notifications can lead to the Home (Today) screen
          navigate('Main', { screen: 'Today' });
          break;

        default:
          break;
      }
    });

    return () => {
      responseListener.remove();
    };
  }, []);
}
