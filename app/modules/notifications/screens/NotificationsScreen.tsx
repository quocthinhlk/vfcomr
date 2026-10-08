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
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';

export default function NotificationsScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [sending, setSending] = useState(false);
  const [canSendTest, setCanSendTest] = useState(false);
  // While switched into another user, this device is deliberately not
  // registered for them, so a test would reach someone else's phone.
  const [impersonating, setImpersonating] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [me, switched] = await Promise.all([
          api.get('users/me'),
          isImpersonating(),
        ]);
        const user = me?.data?.data;
        const roleId = resolveRoleIdFromUser(user);
        if (!mounted) {
          return;
        }
        setImpersonating(switched);
        setCanSendTest(isSuperAdmin(roleId));
      } catch {
        if (mounted) {
          setCanSendTest(false);
        }
      }
    })();
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
    const title = t('notifications') || 'Notifications';
    try {
      setSending(true);

      // 1. Permission (shows the "open Settings" prompt if it was blocked).
      const permission = await requestNotificationPermission({showAlertIfBlocked: true});
      if (!permission.granted) {
        if (!permission.blocked) {
          Alert.alert(title, 'Notification permission is required to receive the test.');
        }
        return;
      }

      // 2. This device's token → the logged-in user (errors are not swallowed).
      try {
        await registerThisDeviceForPush();
      } catch (e) {
        if (e instanceof PushSetupError) {
          const reasons: Record<string, string> = {
            impersonating:
              'You are switched into another user. Switch back to your own account to test notifications on this device.',
            unavailable: 'Push notifications are not configured in this build (Firebase missing).',
            no_token:
              'This device has no push token yet. On iOS, use a real device (or a simulator that supports remote push) and try again.',
          };
          Alert.alert(title, reasons[e.reason]);
        } else {
          Alert.alert(
            t('error') || 'Error',
            `Could not register this device for notifications: ${getApiErrorMessage(e, t)}`,
          );
        }
        return;
      }

      // 3. The logged-in user (the same account the token was just bound to).
      const me = await api.get('users/me');
      const user = me?.data?.data;
      const userId = Number(user?.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        Alert.alert(t('error') || 'Error', 'Could not determine the logged-in user.');
        return;
      }
      const userName =
        [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
        user?.username ||
        `#${userId}`;

      // 4. Send, then report what the server actually delivered.
      const result = await sendTestNotificationToUser({
        user_id: userId,
        title: 'Test notification',
        body: `Hello ${userName}, push notifications are working on this device.`,
        data: {screen: 'home'},
      });
      if (result.success_count > 0) {
        Alert.alert(
          title,
          `Sent to ${result.success_count} device(s) of ${userName}` +
            (result.failure_count ? ` (${result.failure_count} failed)` : '') +
            '. It should appear on this device in a few seconds.',
        );
      } else {
        Alert.alert(
          t('error') || 'Error',
          `No device received it (${result.failure_count} failed). This device's token may be invalid; reinstall the app or log out and back in, then retry.`,
        );
      }
    } catch (e) {
      Alert.alert(
        t('error') || 'Error',
        getApiErrorMessage(e, t) || 'Failed to send test notification.',
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
            {__DEV__ && canSendTest && impersonating ? (
              <Text style={[styles.emptyBody, {color: C.textSecondary}]}>
                Test notifications are disabled while switched into another user.
              </Text>
            ) : null}
            {__DEV__ && canSendTest && !impersonating && (
              <TouchableOpacity
                style={[styles.testButton, {borderColor: C.border}]}
                onPress={onSendTest}
                disabled={sending}
                accessibilityRole="button"
                accessibilityState={{busy: sending, disabled: sending}}>
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.mainColor} />
                ) : (
                  <Text style={[styles.testButtonText, {color: COLORS.mainColor}]}>
                    Send test notification
                  </Text>
                )}
              </TouchableOpacity>
            )}
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
  testButton: {
    marginTop: ms(4),
    paddingHorizontal: ms(14),
    paddingVertical: ms(8),
    borderRadius: rs(20),
    borderWidth: 1,
  },
  testButtonText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
});

