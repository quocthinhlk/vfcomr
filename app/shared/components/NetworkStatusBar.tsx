import React, {useEffect, useRef} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNetworkStatus, NetworkStatus} from '../hooks/useNetworkStatus';
import {useTranslation} from '../hooks/useTranslation';
import {useThemeMode} from '../context/ThemeContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {fs, ms, ws} from '../utils/scale';
import {CheckIcon, WifiOffIcon} from './icons/UiIcons';

const PALETTE = {
  light: {
    offline: {bg: '#E4E7EC', fg: '#344054'},
    connecting: {bg: '#FDE68A', fg: '#3F2E00'},
    connected: {bg: '#12B76A', fg: '#FFFFFF'},
  },
  dark: {
    offline: {bg: '#2C2C2E', fg: '#E5E5EA'},
    connecting: {bg: '#FDE68A', fg: '#3F2E00'},
    connected: {bg: '#12B76A', fg: '#FFFFFF'},
  },
} as const;

/**
 * Connection status strip (Zalo-style):
 * "No Connection" -> "Connecting..." -> "Connected" (auto-hides).
 * Renders nothing while the app is online.
 */
/**
 * App-wide strip at the very top of the screen. Mounted once above the
 * navigator: it pads itself for the status bar / notch, and because it pushes
 * the navigator down, screens' SafeAreaViews no longer add a top inset while
 * it is visible.
 */
export const NetworkStatusBar: React.FC = () => {
  const insets = useSafeAreaInsets();
  const status = useNetworkStatus();
  const {theme} = useThemeMode();
  const {t} = useTranslation();
  const opacity = useRef(new Animated.Value(status === 'online' ? 0 : 1)).current;

  const visible = status !== 'online';

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 140,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  const label =
    status === 'offline'
      ? t('noConnection')
      : status === 'connecting'
        ? t('connecting')
        : t('connected');

  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(label);
    }
  }, [visible, label]);

  if (!visible) {
    return null;
  }

  const {bg, fg} = PALETTE[theme][status as Exclude<NetworkStatus, 'online'>];

  return (
    <Animated.View
      style={[
        styles.bar,
        {backgroundColor: bg, opacity, paddingTop: insets.top + ms(8)},
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.row}>
        {status === 'offline' && <WifiOffIcon color={fg} size={ws(16)} />}
        {status === 'connecting' && <ActivityIndicator size="small" color={fg} />}
        {status === 'connected' && <CheckIcon color={fg} size={ws(16)} />}
        <Text style={[styles.text, {color: fg}]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingBottom: ms(8),
    paddingHorizontal: ms(16),
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
  },
  text: {
    fontSize: fs(13),
    fontWeight: '600',
  },
});

export default NetworkStatusBar;
