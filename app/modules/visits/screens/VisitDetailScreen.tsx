import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getVisitById} from '../services/visit.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {VisitItem} from '../services/visit.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';

export const VisitDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={t('visitDetail') || 'Visit Detail'}
            showMenu={false}
          />
          
          {churchName ? (
            <View style={[styles.churchNameContainer, {backgroundColor: C.surface, borderColor: C.border}]}>
              <Text style={[styles.churchNameLabel, {color: C.textSecondary}]}>
                {t('church') || 'Church'}:{' '}
              </Text>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {churchName}
              </Text>
            </View>
          ) : null}
          
          {loading ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          ) : !visit ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('noDataFound') || 'No data found'}
            </Text>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              <View style={styles.content}>
                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('year') || 'Year'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {visit.year}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('week') || 'Week'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {visit.week_number}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('numberOfDays') || 'Number of Days'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {visit.number_of_days}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('created') || 'Created'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {formatDate(visit.Created)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('modified') || 'Modified'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {formatDate(visit.Modified)}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
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
  churchNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(8),
    marginBottom: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  churchNameLabel: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  content: {
    marginTop: ms(8),
    gap: ms(12),
  },
  detailCard: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: rs(8),
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fs(14),
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: fs(14),
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  loading: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default VisitDetailScreen;

