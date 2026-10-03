import {Platform} from 'react-native';
import api from '../../config/api';

type DeviceType = 'ios' | 'android' | 'web';

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

