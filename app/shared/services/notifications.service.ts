import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../config/api';

type DeviceType = 'ios' | 'android' | 'web';

/**
 * Lazy so the JS bundle still loads when native Firebase isn't configured
 * (e.g. missing google-services.json / GoogleService-Info.plist).
 */
export function getMessaging(): any | null {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging();
  } catch {
    return null;
  }
}

async function isImpersonating(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem('switchedUser')) === '1';
  } catch {
    return false;
  }
}

export async function registerDeviceToken(deviceToken: string): Promise<void> {
  const trimmed = String(deviceToken || '').trim();
  if (!trimmed) {
    return;
  }

  const device_type: DeviceType =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  try {
    await api.post('notifications/tokens', {
      device_token: trimmed,
      device_type,
    });
  } catch (error: any) {
    if (__DEV__) {
      console.warn(
        '[notifications] registerDeviceToken failed:',
        error?.response?.data || error?.message || String(error),
      );
    }
  }
}

/**
 * Registers the current FCM token for the logged-in user without prompting.
 * Use on session restore (cold start / biometric unlock) and token refresh;
 * the post-login prompt lives in permissions.service.
 */
export async function syncDeviceTokenIfPermitted(token?: string): Promise<void> {
  const m = getMessaging();
  if (!m) {
    return;
  }
  // Never bind this device to an impersonated user's account.
  if (await isImpersonating()) {
    return;
  }
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const status = await m.hasPermission();
    if (
      status !== messaging.AuthorizationStatus.AUTHORIZED &&
      status !== messaging.AuthorizationStatus.PROVISIONAL
    ) {
      return;
    }
    if (Platform.OS === 'ios' && !m.isDeviceRegisteredForRemoteMessages) {
      await m.registerDeviceForRemoteMessages();
    }
    await registerDeviceToken(token || (await m.getToken()));
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[notifications] syncDeviceTokenIfPermitted skipped:', error?.message || error);
    }
  }
}

/**
 * Invalidates this device's FCM token so the previous user stops receiving pushes
 * after logout. A fresh token is issued and registered on the next login.
 */
export async function deleteDeviceToken(): Promise<void> {
  const m = getMessaging();
  if (!m) {
    return;
  }
  try {
    await m.deleteToken();
  } catch (error: any) {
    if (__DEV__) {
      console.warn('[notifications] deleteDeviceToken failed:', error?.message || error);
    }
  }
}

export async function sendTestMissingReportReminder(payload: {
  user_id: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  return api.post('notifications/test/missing-report-reminder', payload);
}

export async function sendTestNotificationToUser(payload: {
  user_id: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  return api.post('notifications/test/users', payload);
}

