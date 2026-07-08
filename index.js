import 'react-native-gesture-handler';
/**
 * @format
 */

import {applyHermesErrorStackPolyfill} from './app/shared/utils/hermesErrorStackPolyfill';

applyHermesErrorStackPolyfill();

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
