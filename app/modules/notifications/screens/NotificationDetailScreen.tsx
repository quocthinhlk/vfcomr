import React from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {BellSvgIcon} from '../../../shared/components/icons';

export type NotificationDetailParams = {
  title: string;
  body: string;
  /** Epoch ms when FCM sent it (remoteMessage.sentTime). */
  sentTime?: number;
  /** Screen the notification points to (`data.screen`), already validated. */
  target?: {route: string; params?: Record<string, any>};
};

/**
 * Shows a tapped push notification so the user can read it. Notifications are
 * not stored, so this only has what the tapped message carried.
 */
export default function NotificationDetailScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {title, body, sentTime, target} = (route.params ?? {}) as NotificationDetailParams;

  const sentLabel = sentTime ? new Date(sentTime).toLocaleString() : '';

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('notifications')} showMenu={false} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
            <View style={styles.headerRow}>
              <View style={[styles.iconCircle, {backgroundColor: C.bgSelectedOption}]}>
                <BellSvgIcon width={20} height={20} color={COLORS.mainColor} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
                  {title || t('notifications')}
                </Text>
                {sentLabel ? (
                  <Text style={[styles.time, {color: C.textSecondary}]}>{sentLabel}</Text>
                ) : null}
              </View>
            </View>
            {body ? (
              <Text style={[styles.body, {color: C.textPrimary}]} selectable>
                {body}
              </Text>
            ) : null}
          </View>

          {target ? (
            <TouchableOpacity
              style={[styles.openButton, {backgroundColor: COLORS.mainColor}]}
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => navigation.navigate(target.route, target.params)}>
              <Text style={styles.openButtonText}>{t('open')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: ms(16),
    paddingTop: ms(16),
    paddingBottom: ms(24),
  },
  card: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(12),
  },
  iconCircle: {
    width: ms(40),
    height: ms(40),
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fs(16),
    fontWeight: '700',
    lineHeight: fs(22),
  },
  time: {
    marginTop: ms(2),
    fontSize: fs(12),
  },
  body: {
    marginTop: ms(14),
    fontSize: fs(15),
    lineHeight: fs(22),
  },
  openButton: {
    marginTop: ms(16),
    minHeight: 44,
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '700',
  },
});
