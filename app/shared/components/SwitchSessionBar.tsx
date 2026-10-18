import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {COLORS} from '../constants/colors';
import {useTranslation} from '../hooks/useTranslation';
import {useThemeMode} from '../context/ThemeContext';
import {fs, ms, ws} from '../utils/scale';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {EyeIcon} from './icons/UiIcons';
import {
  getSwitchSession,
  SWITCH_SESSION_EVENT,
  switchBackToAdmin,
} from '../../modules/auth/services/auth.service';

export const SwitchSessionBar = () => {
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const {theme} = useThemeMode();
  const isDark = theme === 'dark';
  // The network strip (above this one) already pads for the status bar.
  const networkStripVisible = useNetworkStatus() !== 'online';
  const [name, setName] = useState('');
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    getSwitchSession()
      .then(session => {
        setActive(session.active);
        setName(session.name);
      })
      .catch(() => {
        setActive(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    const subscription = DeviceEventEmitter.addListener(SWITCH_SESSION_EVENT, refresh);
    return () => subscription.remove();
  }, [refresh]);

  // Ask first: switching back reloads the app as the admin.
  const confirmSwitchBack = () => {
    if (busy) {
      return;
    }
    Alert.alert(t('switchBack'), t('switchBackConfirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('switchBack'),
        onPress: () => {
          void onSwitchBack();
        },
      },
    ]);
  };

  const onSwitchBack = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await switchBackToAdmin();
      DeviceEventEmitter.emit('switchSessionReset');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || t('switchBackFailed');
      Alert.alert(t('switchBack'), String(message));
    } finally {
      setBusy(false);
    }
  };

  if (!active) {
    return null;
  }

  const bg = isDark ? '#3A2E12' : '#FFF4CC';
  const fg = isDark ? '#F6E3B0' : '#8A4B16';

  // Slim strip at the top of the app (under the network strip): it takes its
  // own space and pushes every screen down, so it never covers content.
  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.strip,
        {backgroundColor: bg, paddingTop: (networkStripVisible ? 0 : insets.top) + ms(2)},
      ]}>
      <EyeIcon color={fg} size={ws(13)} />
      <Text style={[styles.label, {color: fg}]} numberOfLines={1}>
        {t('viewingAs')} <Text style={styles.name}>{name}</Text>
      </Text>
      <TouchableOpacity
        onPress={confirmSwitchBack}
        disabled={busy}
        hitSlop={{top: 10, bottom: 10, left: 12, right: 12}}
        style={styles.action}
        accessibilityRole="button"
        accessibilityLabel={t('switchBack')}>
        {busy ? (
          <ActivityIndicator color={COLORS.mainColor} size="small" style={styles.spinner} />
        ) : (
          <Text style={styles.actionText}>{t('switchBack')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // One compact line (~24pt): icon · "Viewing as Name" · Switch back link.
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(16),
    paddingBottom: ms(3),
  },
  label: {
    flex: 1,
    fontSize: fs(12),
    lineHeight: fs(16),
  },
  name: {
    fontWeight: '700',
  },
  // Text link; hitSlop keeps the tap target comfortable despite the slim strip.
  action: {
    paddingVertical: ms(2),
  },
  actionText: {
    color: COLORS.mainColor,
    fontSize: fs(12),
    lineHeight: fs(16),
    fontWeight: '700',
  },
  spinner: {
    transform: [{scale: 0.8}],
  },
});
