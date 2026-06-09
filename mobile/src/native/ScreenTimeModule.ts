/**
 * GrowCircle — Screen Time Native Module (TypeScript Bridge)
 *
 * This module bridges to the Android native UsageStatsManager API.
 * On devices where native modules are not available (e.g., Expo Go),
 * it falls back to a mock implementation.
 *
 * The actual native Java code is compiled via a custom Expo config plugin.
 */
import { NativeModules, Platform } from 'react-native';

export interface AppUsageEntry {
  packageName: string;
  appName: string;
  totalTimeInForeground: number; // seconds
  lastTimeUsed: number; // timestamp ms
  iconBase64?: string;
}

interface ScreenTimeNativeInterface {
  /**
   * Check if the app has UsageStats access permission
   */
  hasPermission(): Promise<boolean>;

  /**
   * Open the system Settings page to grant UsageStats access
   */
  requestPermission(): Promise<void>;

  /**
   * Query usage stats for a given date range
   * @param startTime - Start timestamp in ms
   * @param endTime - End timestamp in ms
   */
  getUsageStats(startTime: number, endTime: number): Promise<AppUsageEntry[]>;

  /**
   * Get today's usage stats (convenience method)
   */
  getTodayUsage(): Promise<{ apps: AppUsageEntry[], unlocks: number }>;

  /**
   * Get weekly trend (minutes per day for last 7 days)
   */
  getWeeklyTrend(): Promise<number[]>;
}

// ── Mock implementation for when native module is unavailable ────────────
const MockScreenTime: ScreenTimeNativeInterface = {
  async hasPermission() {
    return false;
  },
  async requestPermission() {
    console.warn('[ScreenTime] Native module not available');
  },
  async getUsageStats(_startTime: number, _endTime: number) {
    return getMockUsageData();
  },
  async getTodayUsage() {
    return { apps: getMockUsageData(), unlocks: 42 };
  },
  async getWeeklyTrend() {
    return [45, 60, 30, 80, 40, 95, 70];
  }
};

function getMockUsageData(): AppUsageEntry[] {
  const dummyIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  return [
    { packageName: 'com.instagram.android', appName: 'Instagram', totalTimeInForeground: 7200, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.whatsapp', appName: 'WhatsApp', totalTimeInForeground: 3600, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.google.android.youtube', appName: 'YouTube', totalTimeInForeground: 5400, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.twitter.android', appName: 'X (Twitter)', totalTimeInForeground: 1800, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.snapchat.android', appName: 'Snapchat', totalTimeInForeground: 900, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.reddit.frontpage', appName: 'Reddit', totalTimeInForeground: 2700, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.spotify.music', appName: 'Spotify', totalTimeInForeground: 4500, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
    { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', totalTimeInForeground: 6300, lastTimeUsed: Date.now(), iconBase64: dummyIcon },
  ];
}

// ── Export the native module or the mock ─────────────────────────────────
import { requireNativeModule } from 'expo-modules-core';

let ScreenTimeNative: any = null;
try {
  ScreenTimeNative = requireNativeModule('ScreenTimeModule');
} catch (e) {
  console.warn('[ScreenTime] Native module not found, using mock');
}

const ScreenTimeModule: ScreenTimeNativeInterface =
  Platform.OS === 'android' && ScreenTimeNative
    ? {
        hasPermission: () => ScreenTimeNative.hasPermission(),
        requestPermission: () => ScreenTimeNative.requestPermission(),
        getUsageStats: (start, end) => ScreenTimeNative.getUsageStats(start, end),
        getTodayUsage: () => ScreenTimeNative.getTodayUsage(),
        getWeeklyTrend: () => ScreenTimeNative.getWeeklyTrend(),
      }
    : MockScreenTime;

export default ScreenTimeModule;
