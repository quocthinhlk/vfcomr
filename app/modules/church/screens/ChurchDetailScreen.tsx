import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Button } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { BackButton } from '../../../shared/components/BackButton';
import { globalStyles } from '../../../shared/styles/global';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../../../config/api';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { isSuperAdmin } from '../../../shared/utils/permissions';

export default function ChurchDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchId: number | null = route?.params?.id ?? null;
  const { t } = useTranslation();
  const C = useThemedColors();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);

  const fetchChurch = async () => {
    if (!churchId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await api.get(`churches/${churchId}`);
      setData(res?.data?.data || null);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchChurch();
    })();
    return () => { mounted = false; };
  }, [churchId]);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh details whenever screen gains focus (after enable/disable flow)
      fetchChurch();
      return () => {};
    }, [churchId])
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api.get('users/me');
        if (!mounted) return;
        const rid = me?.data?.data?.role?.id;
        if (typeof rid === 'number') setCurrentUserRoleId(rid);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const isSuperAdminUser = isSuperAdmin(currentUserRoleId || undefined);

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
        <Header title={t('churchDetail')} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {loading ? (
            <Text style={[styles.loading, { color: C.textPrimary }]}>{t('loading')}...</Text>
          ) : !data ? (
            <Text style={[styles.loading, { color: C.textPrimary }]}>No data</Text>
          ) : (
            <>
              {/* Hero */}
              <View style={styles.hero}>
                {data.photo_url ? (
                  <Image source={{ uri: data.photo_url }} style={styles.heroImg} />
                ) : (
                  <View style={[styles.heroImg, styles.heroPlaceholder]} />
                )}
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <Text category="h5" style={styles.heroTitle}>{data.name}</Text>
                  {!!data.short_name && (<Text appearance="hint" style={styles.heroSub}>{data.short_name}</Text>)}
                </View>
              </View>

              {/* Badges */}
              <View style={styles.badgesRow}>
                {data.is_mother_church ? <Badge label={t('mother')} /> : null}
                {data.is_msc ? <Badge label={t('msc')} /> : null}
                {data.disabled ? <Badge label={t('disabled')} danger /> : <Badge label={t('active')} success />}
              </View>

              {/* Info Cards */}
              <View style={styles.section}>
                <Text category="s1" style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('overview')}</Text>
                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  {renderRow(t('country'), data.country_name, true, C)}
                  {renderRow(t('city'), data.city_name, false, C)}
                  {renderRow(t('language'), data.language_name, true, C)}
                  {renderRow(t('churchType'), data.church_type_name, false, C)}
                  {renderRow(t('network'), data.church_network_name, true, C)}
                  {renderRow(t('apostolicRegion'), data.church_region_name, false, C)}
                  {renderRow(t('churchParent'), data.parent_name, true, C)}
                  {renderRow(t('currency'), data.currency_name, false, C)}
                  {renderRow(t('firstMsc'), data.is_first_msc ? t('yes') : t('no'), true, C)}
                  {renderRow(t('houseCp'), data.enable_cpm ? t('yes') : t('no'), false, C)}
                  {renderRow(t('dob'), formatDateDMY(data.date_of_birth), true, C)}
                  {renderRow(t('sensitiveNation'), data.sensitive_nation ? t('yes') : t('no'), false, C)}
                </View>
              </View>

              <View style={styles.section}>
                <Text category="s1" style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('contacts')}</Text>
                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  <View style={[styles.rowBetween, styles.rowDivider, { alignItems: 'flex-start', borderBottomColor: C?.surfaceBorder }]}> 
                    <Text appearance="hint" style={[styles.label, { color: C?.textSecondary }]}>{t('pastorLeader')}</Text>
                    <Text style={[styles.link, styles.valueWrap, { color: C?.textPrimary }]} onPress={() => data.pastor_id && navigation.navigate('User' as any, { userId: data.pastor_id })}>{data.pastor_name || '-'}</Text>
                  </View>
                  <View style={[styles.rowBetween, styles.rowDivider, { alignItems: 'flex-start', borderBottomColor: C?.surfaceBorder }]}> 
                    <Text appearance="hint" style={[styles.label, { color: C?.textSecondary }]}>{t('email')}</Text>
                    <Text style={[styles.link, styles.valueWrap, { color: C?.textPrimary }]} onPress={() => data.email_address && Linking.openURL(`mailto:${String(data.email_address).trim()}`)}>{data.email_address || '-'}</Text>
                  </View>
                  {renderRow(t('phone'), data.office_phone, true, C)}
                  {/* Fax removed as requested */}
                  <View style={[styles.rowBetween, styles.rowDivider, { alignItems: 'flex-start', borderBottomColor: C?.surfaceBorder }]}>
                    <Text appearance="hint" style={[styles.label, { color: C?.textSecondary }]}>{t('website')}</Text>
                    <Text style={[styles.link, styles.valueWrap, { color: C?.textPrimary }]} onPress={() => data.website && Linking.openURL(String(data.website))}>{data.website || '-'}</Text>
                  </View>
                  <View style={[styles.rowBetween, styles.rowDivider, { alignItems: 'flex-start', borderBottomColor: C?.surfaceBorder }]}>
                    <Text appearance="hint" style={[styles.label, { color: C?.textSecondary }]}>Facebook</Text>
                    <Text style={[styles.link, styles.valueWrap, { color: C?.textPrimary }]} onPress={() => data.facebook && Linking.openURL(String(data.facebook))}>{data.facebook || '-'}</Text>
                  </View>
                  <View style={[styles.rowBetween, styles.rowDivider, { alignItems: 'flex-start', borderBottomColor: C?.surfaceBorder }]}>
                    <Text appearance="hint" style={[styles.label, { color: C?.textSecondary }]}>X</Text>
                    <Text style={[styles.link, styles.valueWrap, { color: C?.textPrimary }]} onPress={() => data.twitter && Linking.openURL(String(data.twitter))}>{data.twitter || '-'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text category="s1" style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('addresses')}</Text>
                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                  {!!data.service_address_street && (
                    <View style={styles.block}>
                      <Text appearance="hint" style={styles.label}>{t('serviceAddress')}</Text>
                      <Text style={styles.valueBlock}>{data.service_address_street}</Text>
                    </View>
                  )}
                  {renderRow(t('servicePostalCode'), data.service_address_postal_code)}
                  {!!data.office_address_street && (
                    <View style={styles.block}>
                      <Text appearance="hint" style={styles.label}>{t('officeAddress')}</Text>
                      <Text style={styles.valueBlock}>{data.office_address_street}</Text>
                    </View>
                  )}
                  {!!data.mailing_address_street && (
                    <View style={styles.block}>
                      <Text appearance="hint" style={styles.label}>{t('mailingAddress')}</Text>
                      <Text style={styles.valueBlock}>{data.mailing_address_street}</Text>
                    </View>
                  )}
                </View>
              </View>

              {isSuperAdminUser ? (
                <View style={{ paddingHorizontal: 0 }}>
                  {data.disabled ? (
                    <Button style={[{ backgroundColor: COLORS.successColor, borderColor: COLORS.successColor, width: '100%', marginTop: 8 }]} onPress={() => navigation.navigate('EnableChurch' as any, { id: churchId })}>
                      {t('enableChurch')}
                    </Button>
                  ) : (
                    <Button style={[{ backgroundColor: COLORS.dangerColor, borderColor: COLORS.dangerColor, width: '100%', marginTop: 8 }]} onPress={() => navigation.navigate('DisableChurch' as any, { id: churchId })}>
                      {t('disableThisChurch')}
                    </Button>
                  )}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { padding: 16 },
  hero: { position: 'relative', height: 200, marginHorizontal: 0, marginTop: 8, marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: '#e9eef5' },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroContent: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  heroTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  heroSub: { color: '#f2f2f2' },

  section: { paddingHorizontal: 0, marginBottom: 16 },
  sectionTitle: { marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef1f6', padding: 14, gap: 10 },
  cardShadow: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowDivider: { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f3f7' },
  label: { color: '#7a7a7a' },
  value: { fontWeight: '600' },
  valueWrap: { flex: 1, marginLeft: 12, textAlign: 'right', flexShrink: 1 },
  link: { color: '#3563e9' },

  block: { marginTop: 8 },
  valueBlock: { marginTop: 4 },
  badgesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 0, marginBottom: 10 },
});

function renderRow(label: string, value?: string, _emphasize?: boolean, C?: any) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Text appearance="hint" style={{ color: C?.textSecondary }}>{label}</Text>
      <Text style={{ fontWeight: '600', flex: 1, marginLeft: 12, textAlign: 'right', flexShrink: 1, color: C?.textPrimary }}>{value || '-'}</Text>
    </View>
  );
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

function Badge({ label, success, danger }: { label: string; success?: boolean; danger?: boolean }) {
  const bg = danger ? 'rgba(219,45,45,0.1)' : success ? 'rgba(46,125,50,0.12)' : 'rgba(53,99,233,0.1)';
  const color = danger ? '#db2d2d' : success ? '#2e7d32' : '#3563e9';
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}
