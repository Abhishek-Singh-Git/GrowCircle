/**
 * GrowCircle — App Lock Native Module (TypeScript Bridge)
 *
 * Controls the overlay lock service from JavaScript.
 * Falls back to a no-op mock on non-Android or Expo Go.
 */
import { NativeModules, Platform } from 'react-native';

interface AppLockNativeInterface {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startLock(
    appName: string,
    initiatorName: string,
    durationMs: number,
    interventionId: string,
  ): Promise<boolean>;
  stopLock(): Promise<boolean>;
}

const MockAppLock: AppLockNativeInterface = {
  async hasOverlayPermission() {
    return false;
  },
  async requestOverlayPermission() {
    console.warn('[AppLock] Native module not available');
  },
  async startLock() {
    console.warn('[AppLock] Native module not available — cannot start lock');
    return false;
  },
  async stopLock() {
    console.warn('[AppLock] Native module not available — cannot stop lock');
    return false;
  },
};

const AppLockModule: AppLockNativeInterface =
  Platform.OS === 'android' && NativeModules.AppLockModule
    ? NativeModules.AppLockModule
    : MockAppLock;

export default AppLockModule;
