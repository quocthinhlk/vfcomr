import 'react-native-gesture-handler';
/**
 * @format
 */

import {applyHermesErrorStackPolyfill} from './app/shared/utils/hermesErrorStackPolyfill';

applyHermesErrorStackPolyfill();

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// FCM: must be registered outside React so data messages are handled while
// the app is in the background / quit. Notification payloads are displayed by
// the OS; tap handling lives in NotificationListener.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  // Firebase not configured natively; push is disabled.
}

AppRegistry.registerComponent(appName, () => App);
