/**
 * GrowCircle — Root Navigation
 * Auth flow → Onboarding → Main App (Bottom Tabs)
 */
import React, { useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../stores/authStore';
import { Colors, Typography } from '../theme/tokens';

// Screens
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import TodayScreen from '../screens/tabs/TodayScreen';
import BattleScreen from '../screens/tabs/BattleScreen';
import FocusScreen from '../screens/tabs/FocusScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import CircleManagerScreen from '../screens/circles/CircleManagerScreen';
import AddGoalScreen from '../screens/goals/AddGoalScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Bottom Tab Navigator ────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.backgroundElevated,
          borderTopColor: Colors.glassBorder,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accentPrimary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.medium,
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Battle"
        component={BattleScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>⚔️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>📱</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Auth Stack ──────────────────────────────────────────────────────────
function AuthStack() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return (
      <LoginScreen
        onLoginSuccess={() => {}}
        onSwitchToRegister={() => setShowLogin(false)}
      />
    );
  }

  return (
    <RegisterScreen
      onRegisterSuccess={() => {}}
      onSwitchToLogin={() => setShowLogin(true)}
    />
  );
}

// ── Root Navigator ──────────────────────────────────────────────────────
export const linking: LinkingOptions<any> = {
  prefixes: [Linking.createURL('/'), 'https://growcircle.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Today: 'home',
        },
      },
      CircleManager: 'join/:code', // Route /join/:code to CircleManager for invite code pre-fill
    },
  },
};

export const navTheme = {
  dark: true,
  colors: {
    primary: Colors.accentPrimary,
    background: 'transparent',
    card: Colors.backgroundElevated,
    text: Colors.textPrimary,
    border: Colors.glassBorder,
    notification: Colors.accentDanger,
  },
  fonts: {
    regular: { fontFamily: Typography.fontFamily.regular, fontWeight: 'normal' as const },
    medium: { fontFamily: Typography.fontFamily.medium, fontWeight: '500' as const },
    bold: { fontFamily: Typography.fontFamily.bold, fontWeight: 'bold' as const },
    heavy: { fontFamily: Typography.fontFamily.black, fontWeight: '900' as const },
  },
};

export default function RootNavigation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then((value) => {
      setHasOnboarded(value === 'true');
    });
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    setHasOnboarded(true);
  };

  if (hasOnboarded === null) {
    return null; // or a splash screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasOnboarded ? (
        <Stack.Screen name="Onboarding">
          {() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="CircleManager" component={CircleManagerScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="AddGoal" component={AddGoalScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
