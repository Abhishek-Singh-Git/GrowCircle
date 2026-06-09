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
import { api } from './src/services/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { GlobalErrorBoundary } from './src/components/GlobalErrorBoundary';
import { useCircles } from './src/hooks/useCircles';

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
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (
      await Notifications.getDevicePushTokenAsync()
    ).data;
  } else {
    console.log('Must use physical device for Push Notifications');
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
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            api.patch('/users/me', { fcmToken: pushToken }).catch(console.error);
          }
        }
      }
    };
    initPush();
  }, [isAuthenticated]);

  // Global listeners
  useInterventionListener();
  useNudgeListener();
  useUpLateListener();
  
  // Initialize circle fetching
  useCircles();

  return (
    <>
      <RootNavigation />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer linking={linking} theme={navTheme} ref={navigationRef}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <AppInner />
        </NavigationContainer>
      </GestureHandlerRootView>
    </GlobalErrorBoundary>
  );
}
