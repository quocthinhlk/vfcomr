import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {BellSvgIcon} from '../../../shared/components/icons';
import api from '../../../config/api';
import {
  PushSetupError,
  isImpersonating,
  registerThisDeviceForPush,
  sendTestNotificationToUser,
} from '../../../shared/services/notifications.service';
import {requestNotificationPermission} from '../../../shared/services/permissions.service';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';

export default function NotificationsScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [sending, setSending] = useState(false);
  // While switched into another user, this device is deliberately not
  // registered for them, so a test would reach someone else's phone.
  const [impersonating, setImpersonating] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    isImpersonating()
      .then(switched => {
        if (mounted) {
          setImpersonating(switched);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Sends a test push to the logged-in user and makes sure it targets this
   * device: permission → register this device's token for the user (awaited)
   * → send → check the server's delivery count.
   */
  const onSendTest = async () => {
    const title = t('testNotificationTitle');
    try {
      setSending(true);

      // 1. Permission (shows the "open Settings" prompt if it was blocked).
      const permission = await requestNotificationPermission({showAlertIfBlocked: true});
      if (!permission.granted) {
        if (!permission.blocked) {
          Alert.alert(title, t('testNotificationPermissionRequired'));
        }
        return;
      }

      // 2. This device's token → the logged-in user (errors are not swallowed).
      try {
        await registerThisDeviceForPush();
      } catch (e) {
        if (e instanceof PushSetupError) {
          const reasons: Record<string, string> = {
            impersonating: t('testNotificationImpersonating'),
            unavailable: t('testNotificationUnavailable'),
            no_token: t('testNotificationNoToken'),
          };
          Alert.alert(title, reasons[e.reason]);
        } else {
          Alert.alert(
            title,
            `${t('testNotificationRegisterFailed')} ${getApiErrorMessage(e, t)}`,
          );
        }
        return;
      }

      // 3. The logged-in user (the same account the token was just bound to).
      const me = await api.get('users/me');
      const user = me?.data?.data;
      const userId = Number(user?.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        Alert.alert(title, t('testNotificationNoUser'));
        return;
      }

      // 4. Send, then report what the server actually delivered.
      const result = await sendTestNotificationToUser({
        user_id: userId,
        title: t('testNotificationTitle'),
        body: t('testNotificationBody'),
        data: {screen: 'home'},
      });
      if (result.success_count > 0) {
        Alert.alert(
          title,
          t('testNotificationSent').replace('{count}', String(result.success_count)),
        );
      } else {
        Alert.alert(title, t('testNotificationNotDelivered'));
      }
    } catch (e) {
      Alert.alert(
        title,
        getApiErrorMessage(e, t) || t('testNotificationNotDelivered'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('notifications') || 'Notifications'} showMenu={false} />
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <View style={[styles.emptyCard, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
            <View style={[styles.iconCircle, {backgroundColor: C.bgSelectedOption}]}>
              <BellSvgIcon width={28} height={28} color={COLORS.mainColor} />
            </View>
            <Text style={[styles.emptyTitle, {color: C.textPrimary}]}>
              {t('notifications') || 'Notifications'}
            </Text>
            <Text style={[styles.emptyBody, {color: C.textSecondary}]}>
              {t('noNotifications') || 'No notifications yet.'}
            </Text>
          </View>

          {/* Self-test: sends a push to the logged-in account on this device. */}
          <View style={[styles.testCard, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
            <Text style={[styles.testTitle, {color: C.textPrimary}]}>
              {t('testNotificationTitle')}
            </Text>
            <Text style={[styles.testHint, {color: C.textSecondary}]}>
              {impersonating ? t('testNotificationImpersonating') : t('testNotificationHint')}
            </Text>
            <TouchableOpacity
              style={[
                styles.testButton,
                {backgroundColor: COLORS.mainColor},
                (sending || impersonating) && styles.testButtonDisabled,
              ]}
              onPress={onSendTest}
              disabled={sending || impersonating}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('sendTestNotification')}
              accessibilityState={{busy: sending, disabled: sending || impersonating}}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <BellSvgIcon width={16} height={16} color="#fff" />
                  <Text style={styles.testButtonText}>{t('sendTestNotification')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
    paddingTop: ms(16),
  },
  emptyCard: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(20),
    borderRadius: rs(12),
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: ms(48),
    height: ms(48),
    borderRadius: rs(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(8),
  },
  iconText: {
    fontSize: fs(22),
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(4),
  },
  emptyBody: {
    fontSize: fs(13),
    textAlign: 'center',
    marginBottom: ms(12),
  },
  testCard: {
    marginTop: ms(12),
    paddingHorizontal: ms(16),
    paddingVertical: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  testTitle: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  testHint: {
    marginTop: ms(4),
    fontSize: fs(13),
    lineHeight: fs(19),
  },
  testButton: {
    marginTop: ms(12),
    minHeight: 44,
    borderRadius: rs(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    paddingHorizontal: ms(16),
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
});

