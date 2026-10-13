import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {BellSvgIcon} from '../../../shared/components/icons';
import api from '../../../config/api';
import {sendTestNotificationToUser} from '../../../shared/services/notifications.service';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {
  isSuperAdmin,
  resolveRoleIdFromUser,
} from '../../../shared/utils/permissions';

/**
 * TESTER NOTE: "Send test notification" always pushes to the fixed QA account
 * below (user id 4751, username "hai03"), not to the logged-in user. Log in as
 * hai03 on a device to receive it. Only Super Admins see the button, since the
 * API (POST notifications/test/users) is admin-only.
 */
const TEST_TARGET_USER_ID = 4751;
const TEST_TARGET_USERNAME = 'hai03';
const TEST_PAYLOAD = {
  user_id: TEST_TARGET_USER_ID,
  title: 'A friendly report reminder',
  body: "It looks like you haven't submitted a report for VFC Vietnam in the past three months. Please submit it when you have a moment.",
  data: {screen: 'monthly_data'},
};

export default function NotificationsScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [sending, setSending] = useState(false);
  const [canSendTest, setCanSendTest] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    api
      .get('users/me')
      .then(res => {
        if (mounted) {
          setCanSendTest(isSuperAdmin(resolveRoleIdFromUser(res?.data?.data)));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const onSendTest = async () => {
    const title = t('testNotificationTitle');
    try {
      setSending(true);
      const result = await sendTestNotificationToUser(TEST_PAYLOAD);
      const target = `${TEST_TARGET_USERNAME} (#${TEST_TARGET_USER_ID})`;
      Alert.alert(
        title,
        result.success_count > 0
          ? t('testNotificationSentToTarget')
              .replace('{count}', String(result.success_count))
              .split('{user}').join(target)
          : t('testNotificationTargetNotDelivered').split('{user}').join(target),
      );
    } catch (e) {
      Alert.alert(title, getApiErrorMessage(e, t) || t('saveFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header
          title={t('notifications') || 'Notifications'}
          showMenu={false}
        />
        <View style={[styles.container, {backgroundColor: C.background}]}>
          {/* Admin-only test push to the fixed QA account (see TESTER NOTE above). */}
          {canSendTest ? (
            <View
              style={[
                styles.testCard,
                {backgroundColor: C.surface, borderColor: C.surfaceBorder},
              ]}>
              <Text style={[styles.testTitle, {color: C.textPrimary}]}>
                {t('testNotificationTitle')}
              </Text>
              <Text style={[styles.testHint, {color: C.textSecondary}]}>
                {t('testNotificationTargetNote')
                  .split('{user}').join(TEST_TARGET_USERNAME)
                  .replace('{id}', String(TEST_TARGET_USER_ID))}
              </Text>
              <TouchableOpacity
                style={[
                  styles.testButton,
                  {backgroundColor: COLORS.mainColor},
                  sending && styles.testButtonDisabled,
                ]}
                onPress={onSendTest}
                disabled={sending}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('sendTestNotification')}
                accessibilityState={{busy: sending, disabled: sending}}>
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <BellSvgIcon width={16} height={16} color="#fff" />
                    <Text style={styles.testButtonText}>
                      {t('sendTestNotification')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
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
  testCard: {
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
