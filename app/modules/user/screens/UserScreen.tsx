import React, { useEffect, useState, useCallback } from 'react';
import { BackButton } from '../../../shared/components/BackButton';
import { View, ScrollView, ActivityIndicator, StyleSheet, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useRoute, useNavigation} from '@react-navigation/native';
import {getUserById, UserDetailData} from '../services/user.service';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import api from '../../../config/api';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';

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

          <View style={[styles.profileCard, { backgroundColor: C.surface, shadowOpacity: 0.15 }] }>
            <View style={styles.detailsPhotoWrapper}>
              <Image
                source={user?.photo_url && !avatarError ? { uri: user.photo_url } : blankAvatar}
                style={styles.detailsPhoto}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            </View>

            <View style={[styles.detailsTable, { borderTopColor: C.border }]}>
              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>
                  {t('fullName')}
                </Text>
                <Text style={[styles.detailValueStrong, { color: COLORS.mainColor }]}>
                  {user?.name || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('ministryTitle')}</Text>
                <Text style={[styles.detailValue, { color: C.textPrimary }]}>
                  {user?.title || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('omrUsername')}</Text>
                <Text style={[styles.detailValueLink, { color: '#2e7d32' }]}>
                  {(user as any)?.username || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('omrStatus')}</Text>
                <Text style={[styles.detailValue, { color: C.textPrimary }]}>
                  {user?.role?.name || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('language')}</Text>
                <Text style={[styles.detailValue, { color: C.textPrimary }]}>
                  {(user as any)?.language_name || (user as any)?.language?.name || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('country')}</Text>
                <Text style={[styles.detailValue, { color: C.textPrimary }]}>
                  {user?.country_name || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('sensitiveNation')}</Text>
                <Text style={[styles.detailValue, { color: C.textPrimary }]}>
                  {user?.sensitive_nation ? t('yes') : t('no')}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('emailAddress')}</Text>
                <Text
                  style={[styles.detailValueLink, { color: COLORS.mainColor }]}
                  onPress={() => user?.email_address && sendEmail(user.email_address)}
                >
                  {user?.email_address || '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('mobilePhone')}</Text>
                <Text
                  style={[styles.detailValueLink, { color: COLORS.mainColor }]}
                  onPress={() => user?.mobile_phone && dialPhone(user.mobile_phone)}
                >
                  {user?.mobile_phone ? formatPhoneDisplay(user.mobile_phone) : '-'}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: C.border }]}>
                <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('from')}</Text>
                <Text style={[styles.detailValueLink, { color: COLORS.mainColor }]}>
                  {(user as any)?.church_name || (user as any)?.church?.name || '-'}
                </Text>
              </View>
            </View>
          </View>

          {user?.credentials ? (
            <View style={[styles.card, { backgroundColor: C.surface, shadowOpacity: 0.15 }]}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{t('credentials')}</Text>
              <View style={[styles.row, { borderBottomColor: C.border }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentials')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{user.credentials || '-'}</Text>
              </View>
              <View style={[styles.row, { borderBottomColor: C.border }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentialsNumber')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{user.credentials_number || '-'}</Text>
              </View>
              <View style={[styles.row, { borderBottomColor: C.border }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('credentialsFrom')}</Text>
                <Text style={[styles.value, { color: C.textPrimary }]}>{user.credentials_from || '-'}</Text>
              </View>
              <View style={[styles.row, { borderBottomColor: C.border }]}>
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
            <View style={{marginTop: ms(12)}}>
              <AddNewHeaderButton
                name="DeleteUser"
                params={{userId}}
                text={t('deleteUser')}
                prefix=""
                style={{
                  backgroundColor: COLORS.dangerColor,
                  marginTop: 0,
                }}
                textStyle={{fontSize: fs(12)}}
              />
            </View>
          ) : null}
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
};

const CARD_RADIUS = rs(12);

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
  profileCard: {
    backgroundColor: '#fff',
    padding: ms(16),
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailsPhotoWrapper: {
    alignItems: 'center',
    marginBottom: ms(12),
  },
  detailsPhoto: {
    width: '100%',
    height: hs(180),
  },
  detailsTable: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    width: ws(120),
    fontSize: fs(12),
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  detailValue: {
    flex: 1,
    fontSize: fs(12),
    fontWeight: '500',
    flexShrink: 1,
  },
  detailValueStrong: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '700',
    flexShrink: 1,
  },
  detailValueLink: {
    flex: 1,
    fontSize: fs(12),
    fontWeight: '600',
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
  ownProfileBadge: {
    backgroundColor: COLORS.mainColor,
    borderRadius: rs(12),
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    marginTop: ms(6),
  },
  ownProfileBadgeText: {
    color: '#fff',
    fontSize: fs(12),
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
    gap: ms(8),
    marginTop: ms(10),
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: ms(6),
    paddingHorizontal: ms(12),
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
    padding: ms(16),
    marginTop: ms(12),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(8),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ms(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    width: ws(180),
    fontSize: fs(12),
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  value: {
    flex: 1,
    fontSize: fs(12),
    fontWeight: '500',
    flexShrink: 1,
  },
  link: {
    color: COLORS.mainColor,
  },
  multiline: {
    flex: 1,
    fontSize: fs(12),
    fontWeight: '500',
    flexShrink: 1,
  },
  loadingOverlay: {
    marginTop: ms(16),
    alignItems: 'center',
  },
  errorBox: {
    marginTop: ms(12),
    backgroundColor: '#FEF2F2',
    borderRadius: rs(8),
    padding: ms(10),
  },
  errorText: {
    color: '#991B1B',
  },
}); 