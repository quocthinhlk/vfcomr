import React, { useEffect, useState, useCallback } from 'react';
import { BackButton } from '../../../shared/components/BackButton';
import { View, ScrollView, ActivityIndicator, StyleSheet, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Button } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getUserById, UserDetailData } from '../services/user.service';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { isSuperAdmin } from '../../../shared/utils/permissions';
import api from '../../../config/api';

const blankAvatar = require('../../../assets/images/blank-avatar.png');

export const UserScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | undefined = route?.params?.userId;
  const { t } = useTranslation();
  const C = useThemedColors();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);

  const formatPhoneDisplay = (value?: string | null) => {
    if (!value) return '';
    const hasPlus = /^\+/.test(String(value));
    const digits = String(value).replace(/\D/g, '');
    const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
    return hasPlus ? `+${grouped}` : grouped;
  };

  const load = useCallback(async () => {
    if (!userId) {
      setError(t('userIDMissing'));
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await getUserById(userId);
      setUser(res?.data ?? null);
    } catch (e: any) {
      setError(e?.message || t('failedToChangePassword'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // fetch current logged-in user's role to control permissions (e.g., show delete button)
    (async () => {
      try {
        const res = await api.get('users/me');
        const userData = res?.data?.data;
        const r = userData?.role?.id;
        const currentId = userData?.id;
        if (typeof r === 'number') setRoleId(r);
        if (typeof currentId === 'number') {
          setCurrentUserId(currentId);
          // Check if viewing own profile
          if (userId === currentId) {
            setIsOwnProfile(true);
          }
        }
      } catch {}
    })();
  }, [userId]);

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
      <Header title={t('userDetail')} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.banner} />

          <View style={[styles.profileCard, { backgroundColor: C.surface, shadowOpacity: 0.15 }] }>
            <View style={styles.avatarWrapper}>
              <Image
                source={user?.photo_url && !avatarError ? { uri: user.photo_url } : blankAvatar}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.name, { color: C.textPrimary }]}>{user?.name || '-'}</Text>
              {isOwnProfile && (
                <View style={[styles.ownProfileBadge, { backgroundColor: COLORS.mainColor }]}>
                  <Text style={styles.ownProfileBadgeText}>{t('you')}</Text>
                </View>
              )}
            </View>
            {user?.title ? <Text style={[styles.title, { color: C.textSecondary }]}>{user.title}</Text> : null}

            <View style={styles.chipsRow}>
              {user?.role?.name ? (
                <View style={[styles.chip, styles.chipPrimary]}>
                  <Text style={styles.chipTextPrimary}>{user.role.name}</Text>
                </View>
              ) : null}
              {user?.country_name ? (
                <View style={[styles.chip, { backgroundColor: C.surface }]}>
                  <Text style={[styles.chipText, { color: C.textPrimary }]}>{user.country_name}</Text>
                </View>
              ) : null}
              {typeof user?.sensitive_nation === 'boolean' ? (
                <View style={[styles.chip, user.sensitive_nation ? styles.chipDanger : styles.chipSuccess]}>
                  <Text style={[styles.chipText, user.sensitive_nation ? styles.chipTextDanger : styles.chipTextSuccess]}>
                    {user.sensitive_nation ? t('sensitiveNation') : t('open')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.surface, shadowOpacity: 0.15 }]}>
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{t('contact')}</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('phone')}</Text>
              <Text
                style={[styles.value, { color: C.textPrimary }, user?.mobile_phone ? styles.link : undefined]}
                onPress={() => user?.mobile_phone && dialPhone(user.mobile_phone)}
              >
                {user?.mobile_phone ? formatPhoneDisplay(user.mobile_phone) : '-'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('email')}</Text>
              <Text
                style={[styles.value, { color: C.textPrimary }, user?.email_address ? styles.link : undefined]}
                onPress={() => user?.email_address && sendEmail(user.email_address)}
              >
                {user?.email_address || '-'}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.surface, shadowOpacity: 0.15 }]}>
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{t('roleLocation')}</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('role')}</Text>
              <Text style={[styles.value, { color: C.textPrimary }]}>{user?.role?.name || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('country')}</Text>
              <Text style={[styles.value, { color: C.textPrimary }]}>{user?.country_name || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('sensitiveNation')}</Text>
              <Text style={[styles.value, { color: C.textPrimary }]}>{user?.sensitive_nation ? t('yes') : t('no')}</Text>
            </View>
          </View>

          {user?.credentials ? (
            <View style={[styles.card, { backgroundColor: C.surface, shadowOpacity: 0.15 }]}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{t('credentials')}</Text>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentials')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{user.credentials || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentialsNumber')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{user.credentials_number || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentialsFrom')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{user.credentials_from || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentialsExpiry')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{formatDateDMY(user.credentials_expiry_date) || '-'}</Text>
              </View>
            </View>
          ) : null}

          {user?.street_address ? (
            <View style={[styles.card, { backgroundColor: C.surface, shadowOpacity: 0.15 }]}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{t('address')}</Text>
              <Text style={[styles.multiline, { color: C.textSecondary }]}>{user.street_address}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {isSuperAdmin(roleId) && !isOwnProfile ? (
          <View style={{ marginTop: 12 }}>
          <Button style={{ backgroundColor: COLORS.dangerColor, borderColor: COLORS.dangerColor }} onPress={() => navigation.navigate('DeleteUser' as any, { userId })}>
            {t('deleteUser')}
          </Button>
        </View>
        ) : null}
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
};

const CARD_RADIUS = 12;

function dialPhone(phone?: string) {
  if (!phone) return;
  const normalized = String(phone).replace(/\s+/g, '');
  try { Linking.openURL(`tel:${normalized}`); } catch {}
}

function sendEmail(email?: string) {
  if (!email) return;
  const to = encodeURIComponent(String(email).trim());
  try { Linking.openURL(`mailto:${to}`); } catch {}
}

function formatDateDMY(value?: any): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

const styles = StyleSheet.create({
  banner: {
    height: 100,
    backgroundColor: COLORS.mainColor,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginHorizontal: -15,
  },
  profileCard: {
    marginTop: -40,
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginTop: -50,
    marginBottom: 6,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  ownProfileBadge: {
    backgroundColor: COLORS.mainColor,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  ownProfileBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    color: '#666',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    color: '#111827',
    fontWeight: '600',
  },
  chipPrimary: {
    backgroundColor: COLORS.mainColor,
  },
  chipTextPrimary: {
    color: '#fff',
    fontWeight: '700',
  },
  chipDanger: {
    backgroundColor: '#FEE2E2',
  },
  chipSuccess: {
    backgroundColor: '#DCFCE7',
  },
  chipTextDanger: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  chipTextSuccess: {
    color: '#166534',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '600',
  },
  link: {
    color: COLORS.mainColor,
  },
  multiline: {
    color: '#333',
    lineHeight: 20,
  },
  loadingOverlay: {
    marginTop: 16,
    alignItems: 'center',
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: '#991B1B',
  },
}); 