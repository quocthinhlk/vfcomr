import React from 'react';
import {Alert, AppState} from 'react-native';
import {navigationRef} from '../../config/navigation';
import {getMessaging, syncDeviceTokenIfPermitted} from '../services/notifications.service';

/** Backend `data.screen` aliases → stack route names. */
const SCREEN_ALIASES: Record<string, string> = {
  home: 'Dashboard',
  // Report reminders: open the monthly data (report) entry flow.
  monthly_data: 'MonthlyDataSelect',
};

function parseParams(raw: unknown): Record<string, any> | undefined {
  if (!raw) {
    return undefined;
  }
  if (typeof raw === 'object') {
    return raw as Record<string, any>;
  }
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Opens the tapped notification so it can be read (title, body, time). When
 * `data.screen` is a known route, the detail screen offers an "Open" button
 * that goes there.
 */
function openFromNotification(remoteMessage: any, attempt = 0) {
  if (!remoteMessage) {
    return;
  }
  if (!navigationRef.isReady()) {
    // Authenticated stack may still be mounting.
    if (attempt < 10) {
      setTimeout(() => openFromNotification(remoteMessage, attempt + 1), 200);
    }
    return;
  }
  const data = remoteMessage.data || {};
  const requested = String(data.screen || '');
  const route = SCREEN_ALIASES[requested] || requested;
  const routeNames: string[] = navigationRef.getRootState()?.routeNames || [];
  const target =
    route && routeNames.includes(route)
      ? {route, params: parseParams(data.params)}
      : undefined;
  const sentTime = Number(remoteMessage.sentTime);
  (navigationRef as any).navigate('NotificationDetail', {
    title: remoteMessage.notification?.title || data.title || '',
    body: remoteMessage.notification?.body || data.body || '',
    sentTime: Number.isFinite(sentTime) && sentTime > 0 ? sentTime : undefined,
    target,
  });
}

/** Mounted only while authenticated (see Navigation). */
export const NotificationListener: React.FC = () => {
  React.useEffect(() => {
    const m = getMessaging();
    if (!m) {
      return;
    }
    let mounted = true;
    const unsubscribers: Array<() => void> = [];

    // Session restored (cold start / biometric unlock): keep backend token current.
    void syncDeviceTokenIfPermitted();

    try {
      unsubscribers.push(
        m.onTokenRefresh((token: string) => {
          void syncDeviceTokenIfPermitted(token);
        }),
      );

      unsubscribers.push(
        m.onMessage(async (remoteMessage: any) => {
          if (!mounted || AppState.currentState !== 'active') {
            return;
          }
          const title =
            remoteMessage.notification?.title ||
            remoteMessage.data?.title ||
            'Notification';
          const body =
            remoteMessage.notification?.body || remoteMessage.data?.body || '';
          Alert.alert(title, body);
        }),
      );

      // Tapped while app was in background.
      unsubscribers.push(
        m.onNotificationOpenedApp((remoteMessage: any) => {
          openFromNotification(remoteMessage);
        }),
      );

      // Tapped while app was quit.
      m.getInitialNotification()
        .then((remoteMessage: any) => {
          if (mounted) {
            openFromNotification(remoteMessage);
          }
        })
        .catch(() => {});
    } catch {
      // messaging not available; ignore in non-FCM environments
    }

    return () => {
      mounted = false;
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  return null;
};

export default NotificationListener;
