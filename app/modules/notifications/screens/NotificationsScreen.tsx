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
import {sendTestNotificationToUser} from '../../../shared/services/notifications.service';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';

export default function NotificationsScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [sending, setSending] = useState(false);
  const [canSendTest, setCanSendTest] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api.get('users/me');
        const user = me?.data?.data;
        const roleId = resolveRoleIdFromUser(user);
        if (!mounted) {
          return;
        }
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

  const onSendTest = async () => {
    try {
      setSending(true);
      const me = await api.get('users/me');
      const userId = me?.data?.data?.id;
      if (!userId) {
        Alert.alert('Error', 'Could not determine user id for test notification.');
        return;
      }
      await sendTestNotificationToUser({
        user_id: userId,
        title: 'Test notification',
        body: 'FCM is working',
        data: {screen: 'home'},
      });
      Alert.alert(
        t('notifications') || 'Notifications',
        'Test notification sent. Check your device notification tray.',
      );
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.response?.data?.message || e?.message || 'Failed to send test notification.',
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
            {__DEV__ && canSendTest && (
              <TouchableOpacity
                style={[styles.testButton, {borderColor: C.border}]}
                onPress={onSendTest}
                disabled={sending}>
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

