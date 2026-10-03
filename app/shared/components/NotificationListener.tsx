import React from 'react';
import {Alert, AppState} from 'react-native';

export const NotificationListener: React.FC = () => {
  React.useEffect(() => {
    let mounted = true;
    let unsubscribeMessage: (() => void) | undefined;
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      unsubscribeMessage = messaging().onMessage(async remoteMessage => {
        if (!mounted) {
          return;
        }
        if (AppState.currentState !== 'active') {
          return;
        }
        const title =
          remoteMessage.notification?.title ||
          remoteMessage.data?.title ||
          'Notification';
        const body =
          remoteMessage.notification?.body ||
          remoteMessage.data?.body ||
          JSON.stringify(remoteMessage.data || {});
        Alert.alert(title, body);
      });
    } catch {
      // messaging not available; ignore in non-FCM environments
    }
    return () => {
      mounted = false;
      if (unsubscribeMessage) {
        unsubscribeMessage();
      }
    };
  }, []);

  return null;
};

export default NotificationListener;

