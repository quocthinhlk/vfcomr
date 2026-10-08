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

export async function isImpersonating(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem('switchedUser')) === '1';
  } catch {
    return false;
  }
}

// Logout deletes the FCM token without blocking; a login right after must wait
// for that, or it could fetch the old token, register it, and then have it
// invalidated (the new user would get no pushes until the next refresh).
let pendingTokenDeletion: Promise<void> | null = null;

/** Resolves once a logout's token deletion (if any) has finished. */
export async function waitForPendingTokenDeletion(): Promise<void> {
  if (pendingTokenDeletion) {
    await pendingTokenDeletion;
  }
}

export async function registerDeviceToken(
  deviceToken: string,
  options?: {throwOnError?: boolean},
): Promise<void> {
  const trimmed = String(deviceToken || '').trim();
  if (!trimmed) {
    return;
  }
  // Every registration path goes through here: never bind this device to an
  // impersonated user's account.
  if (await isImpersonating()) {
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
    if (options?.throwOnError) {
      throw error;
    }
  }
}

export type PushSetupFailure = 'unavailable' | 'impersonating' | 'no_token';

export class PushSetupError extends Error {
  constructor(public reason: PushSetupFailure) {
    super(`Push setup failed: ${reason}`);
    this.name = 'PushSetupError';
  }
}

/**
 * Makes sure *this* device's FCM token is registered for the logged-in user
 * (awaited, errors surfaced). The caller must already have notification
 * permission. Pushes go to every token of a user, so this is what guarantees
 * the current device is among them.
 */
export async function registerThisDeviceForPush(): Promise<string> {
  const m = getMessaging();
  if (!m) {
    throw new PushSetupError('unavailable');
  }
  if (await isImpersonating()) {
    throw new PushSetupError('impersonating');
  }
  await waitForPendingTokenDeletion();
  if (Platform.OS === 'ios' && !m.isDeviceRegisteredForRemoteMessages) {
    await m.registerDeviceForRemoteMessages();
  }
  const token: string = await m.getToken();
  if (!token) {
    throw new PushSetupError('no_token');
  }
  await registerDeviceToken(token, {throwOnError: true});
  return token;
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
    await waitForPendingTokenDeletion();
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
  const deletion = (async () => {
    try {
      await m.deleteToken();
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[notifications] deleteDeviceToken failed:', error?.message || error);
      }
    }
  })();
  pendingTokenDeletion = deletion;
  try {
    await deletion;
  } finally {
    if (pendingTokenDeletion === deletion) {
      pendingTokenDeletion = null;
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

export type SendTestNotificationResult = {
  success_count: number;
  failure_count: number;
};

/** Sends to every device registered for `user_id`; returns delivery counts. */
export async function sendTestNotificationToUser(payload: {
  user_id: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<SendTestNotificationResult> {
  const res = await api.post('notifications/test/users', payload);
  const data = res?.data?.data ?? {};
  return {
    success_count: Number(data.success_count) || 0,
    failure_count: Number(data.failure_count) || 0,
  };
}

