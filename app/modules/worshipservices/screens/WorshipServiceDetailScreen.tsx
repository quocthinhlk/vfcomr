import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getWorshipServiceById, WorshipServiceItem} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';

export const WorshipServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [service, setService] = useState<WorshipServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (worshipServiceId) {
      getWorshipServiceById(worshipServiceId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setService(res?.data || null);
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
  }, [worshipServiceId]);

  const handleDelete = () => {
    navigation.navigate('DeleteWorshipService', {worshipServiceId});
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={t('worshipServiceDetail') || 'Worship Service Detail'}
            showMenu={false}
          />
          {loading ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          ) : !service ? (
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
                      {t('name') || 'Name'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {service.name}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('day') || 'Day'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {service.day_name}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.label, {color: C.textSecondary}]}>
                      {t('time') || 'Time'}:
                    </Text>
                    <Text style={[styles.value, {color: C.textPrimary}]}>
                      {formatTime(service.time)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  activeOpacity={0.8}>
                  <Text style={styles.deleteBtnText}>
                    {t('delete') || 'Delete'}
                  </Text>
                </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: ms(24),
  },
  content: {
    marginTop: ms(16),
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
  deleteBtn: {
    marginTop: ms(8),
    paddingVertical: ms(14),
    borderRadius: rs(8),
    backgroundColor: '#db2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '600',
  },
});

export default WorshipServiceDetailScreen;
