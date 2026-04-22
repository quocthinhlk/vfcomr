import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getVisitById} from '../services/visit.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {VisitItem} from '../services/visit.service';
import api from '../../../config/api';

export const VisitDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const visitId: number | undefined = route.params?.visitId;
  const [visit, setVisit] = useState<VisitItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (visitId) {
      getVisitById(visitId)
        .then(async res => {
          if (!mounted) {
            return;
          }
          const visitData = res?.data || null;
          setVisit(visitData);

          // Fetch church name
          if (visitData?.church_id) {
            try {
              const churchRes = await api.get(`churches/${visitData.church_id}`);
              const churchData = churchRes?.data?.data;
              if (churchData?.name && mounted) {
                setChurchName(churchData.name);
              }
            } catch (e) {
              console.error('Error fetching church info:', e);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [visitId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const heroTitle = useMemo(() => {
    if (!visit) return '';
    const yearLabel = t('year') || 'Year';
    const weekLabel = t('week') || 'Week';
    return `${yearLabel} ${visit.year} • ${weekLabel} ${visit.week_number}`;
  }, [t, visit]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header title={t('visitDetail') || 'Visit Detail'} showMenu={false} />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={C.textPrimary} />
              <Text style={[styles.loadingText, {color: C.textSecondary}]}>
                {t('loading') || 'Loading'}...
              </Text>
            </View>
          ) : !visit ? (
            <Text style={[styles.emptyText, {color: C.textPrimary}]}>
              {t('noDataFound') || 'No data found'}
            </Text>
          ) : (
            <View style={{gap: ms(12), marginTop: ms(10)}}>
              <View style={[styles.heroCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                {churchName ? (
                  <Text
                    style={[styles.churchNameText, {color: C.textPrimary}]}
                    numberOfLines={2}>
                    {churchName}
                  </Text>
                ) : null}

                <Text style={[styles.heroTitle, {color: C.textPrimary}]}>{heroTitle}</Text>

                <View style={styles.heroRow}>
                  <View style={[styles.badge, {backgroundColor: C.inputBg, borderColor: C.border}]}>
                    <Text style={[styles.badgeLabel, {color: C.textSecondary}]}>
                      {t('numberOfDays') || 'Number of Days'}
                    </Text>
                    <Text style={[styles.badgeValue, {color: C.textPrimary}]}>
                      {visit.number_of_days}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                  {t('details') || 'Details'}
                </Text>

                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, {color: C.textSecondary}]}>
                    {t('visitId') || 'Visit ID'}
                  </Text>
                  <Text style={[styles.kvValue, {color: C.textPrimary}]}>#{visit.id}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, {color: C.textSecondary}]}>
                    {t('userId') || 'User ID'}
                  </Text>
                  <Text style={[styles.kvValue, {color: C.textPrimary}]}>{visit.user_id}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, {color: C.textSecondary}]}>
                    {t('churchId') || 'Church ID'}
                  </Text>
                  <Text style={[styles.kvValue, {color: C.textPrimary}]}>{visit.church_id}</Text>
                </View>

                <View style={[styles.divider, {backgroundColor: C.border}]} />

                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, {color: C.textSecondary}]}>
                    {t('created') || 'Created'}
                  </Text>
                  <Text style={[styles.kvValue, {color: C.textPrimary}]}>
                    {formatDate(visit.Created)}
                  </Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, {color: C.textSecondary}]}>
                    {t('modified') || 'Modified'}
                  </Text>
                  <Text style={[styles.kvValue, {color: C.textPrimary}]}>
                    {formatDate(visit.Modified)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  loadingWrap: {
    marginTop: ms(32),
    alignItems: 'center',
    gap: ms(8),
  },
  loadingText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
    fontWeight: '600',
  },
  heroCard: {
    padding: ms(16),
    borderRadius: rs(14),
    borderWidth: 1,
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(6),
  },
  heroTitle: {
    fontSize: fs(16),
    fontWeight: '800',
    marginBottom: ms(12),
  },
  heroRow: {
    flexDirection: 'row',
    gap: ms(10),
  },
  badge: {
    flex: 1,
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: fs(12),
    fontWeight: '600',
    marginBottom: ms(4),
  },
  badgeValue: {
    fontSize: fs(18),
    fontWeight: '900',
  },
  detailCard: {
    padding: ms(16),
    borderRadius: rs(14),
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '800',
    marginBottom: ms(10),
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ms(6),
  },
  kvLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    flex: 1,
    paddingRight: ms(12),
  },
  kvValue: {
    fontSize: fs(13),
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: ms(10),
  },
});

export default VisitDetailScreen;

