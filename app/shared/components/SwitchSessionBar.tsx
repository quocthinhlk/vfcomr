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
import {fs, ms, rs} from '../utils/scale';
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

  // Ask first: the bar sits at the bottom edge, where it is easy to tap by mistake.
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

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, {paddingBottom: Math.max(insets.bottom, ms(8))}]}>
      <View style={[styles.bar, {backgroundColor: isDark ? '#3A2E12' : '#FFF4CC'}]}>
        <Text
          style={[styles.label, {color: isDark ? '#F6E3B0' : '#8A4B16'}]}
          numberOfLines={1}>
          {t('viewingAs')} {name}
        </Text>
        <TouchableOpacity
          onPress={confirmSwitchBack}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('switchBack')}>
          {busy ? (
            <ActivityIndicator color={COLORS.mainColor} size="small" />
          ) : (
            <Text style={styles.action}>{t('switchBack')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: ms(12),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
  },
  label: {
    flex: 1,
    fontSize: fs(13),
    fontWeight: '600',
    marginRight: ms(8),
  },
  action: {
    color: COLORS.mainColor,
    fontSize: fs(13),
    fontWeight: '700',
  },
});
