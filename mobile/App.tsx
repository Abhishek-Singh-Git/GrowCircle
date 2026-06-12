/**
 * GrowCircle — App Entry Point
 */
import React, { useEffect, useState } from 'react';
import { StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import RootNavigation, { linking, navTheme } from './src/navigation/RootNavigation';
import { useInterventionListener } from './src/hooks/useInterventionListener';
import { wsService } from './src/services/websocket';
import { useAuthStore } from './src/stores/authStore';
import './src/services/SyncManager';
import Toast from 'react-native-toast-message';
import { useNudgeListener } from './src/hooks/useNudgeListener';
import { useUpLateListener } from './src/hooks/useUpLateListener';
import { useNotificationRouter } from './src/hooks/useNotificationRouter';
import { api } from './src/services/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { GlobalErrorBoundary } from './src/components/GlobalErrorBoundary';
import { useCircles } from './src/hooks/useCircles';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const defaultErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('Fatal Global Error:', error);
  // Optionally call default handler to crash if needed, or swallow it to keep app alive
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted, but proceeding with token registration.');
    }
    try {
      token = (
        await Notifications.getDevicePushTokenAsync()
      ).data;
    } catch (e) {
      console.warn('Failed to get device push token:', e);
      // Fallback Expo push token if native token fails
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || 'dummy-project-id',
      })).data;
    }
  } else {
    console.log('Using simulator. Fetching Expo push token for testing.');
    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || 'dummy-project-id',
        })
      ).data;
    } catch (e) {
      console.warn('Failed to get Expo push token in simulator', e);
      token = 'ExponentPushToken[dummy-simulator-token]';
    }
  }

  return token;
}

function AppInner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const rehydrate = useAuthStore((s) => s.rehydrate);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      wsService.connect();
    } else {
      wsService.disconnect();
    }
  }, [isAuthenticated]);

  // Register push notifications
  useEffect(() => {
    const initPush = async () => {
      if (isAuthenticated) {
        const storedToken = await AsyncStorage.getItem('accessToken');
        if (storedToken) {
          const registerPushToken = async (retries = 5, delay = 2000) => {
            for (let i = 0; i < retries; i++) {
              try {
                const pushToken = await registerForPushNotificationsAsync();
                if (pushToken) {
                  await api.patch('/users/me', { fcmToken: pushToken });
                  return;
                }
              } catch (error) {
                console.warn(`Push token registration attempt ${i + 1} failed:`, error);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            console.error('All push token registration attempts failed');
          };
          registerPushToken();
        }
      }
    };
    initPush();
  }, [isAuthenticated]);

  // Global listeners
  useInterventionListener();
  useNudgeListener();
  useUpLateListener();
  useNotificationRouter();
  
  // Initialize circle fetching
  useCircles();

  return (
    <>
      <RootNavigation />
      <Toast />
    </>
  );
}

import { Colors } from './src/theme/tokens';
import { View } from 'react-native';

export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '219698102764-51h2o4j548fgrkb1k97d7govg5bqaelv.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <GlobalErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer linking={linking} theme={navTheme} ref={navigationRef}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppInner />
          </NavigationContainer>
        </GestureHandlerRootView>
      </GlobalErrorBoundary>
    </View>
  );
}
