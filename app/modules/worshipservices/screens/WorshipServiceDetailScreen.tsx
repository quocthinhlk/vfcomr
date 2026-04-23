import React, {useCallback, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  getWorshipServiceById,
  WorshipServiceItem,
} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {DeleteButton} from '../../../shared/components/ActionButtons';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';

const editIcon = require('../../../assets/icons/edit.png');
/** Leaf / forest green — matches list-style edit affordance */
const EDIT_ICON_TINT = '#2E7D32';

export const WorshipServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [service, setService] = useState<WorshipServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const C = useThemedColors();

  const formatTime = (timeString: string) => {
    if (!timeString) {
      return '—';
    }
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const formatCreated = (iso: string) => {
    if (!iso) {
      return '—';
    }
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) {
        return iso;
      }
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!worshipServiceId) {
          if (!cancelled) {
            setService(null);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setLoading(true);
        }
        try {
          const res = await getWorshipServiceById(worshipServiceId);
          if (!cancelled) {
            setService(res?.data ?? null);
          }
        } catch {
          if (!cancelled) {
            setService(null);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [worshipServiceId]),
  );

  const handleEdit = () => {
    if (worshipServiceId) {
      navigation.navigate('EditWorshipService', {worshipServiceId});
    }
  };

  const handleDelete = () => {
    if (worshipServiceId) {
      navigation.navigate('DeleteWorshipService', {worshipServiceId});
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <View style={styles.outer}>
          <Header
            title={t('worshipServiceDetail') || 'Worship Service Detail'}
            showMenu={false}
          />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={C.textSecondary} />
              <Text style={[styles.loadingHint, {color: C.textSecondary}]}>
                {t('loading') || 'Loading'}…
              </Text>
            </View>
          ) : !service ? (
            <View style={styles.centered}>
              <Text style={[styles.emptyTitle, {color: C.textPrimary}]}>
                {t('noDataFound') || 'No data found'}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.card}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, {color: C.textPrimary}]}
                    numberOfLines={3}>
                    {service.name}
                  </Text>
                  <TouchableOpacity
                    onPress={handleEdit}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('edit') || 'Edit'}
                    style={styles.editIconBtn}>
                    <Image
                      source={editIcon}
                      style={[styles.editIcon, {tintColor: EDIT_ICON_TINT}]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.schedule, {color: C.textSecondary}]}>
                  {service.day_name || '—'} · {formatTime(service.time)}
                </Text>
                <View
                  style={[styles.divider, {backgroundColor: C.surfaceBorder}]}
                />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, {color: C.textSecondary}]}>
                    {t('created') || 'Created'}
                  </Text>
                  <Text
                    style={[styles.rowValue, {color: C.textPrimary}]}
                    numberOfLines={1}>
                    {formatCreated(service.created)}
                  </Text>
                </View>
              </View>

              <View style={styles.deleteSection}>
                <DeleteButton
                  label={t('delete') || 'Delete'}
                  onPress={handleDelete}
                  style={styles.deleteButton}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: ms(4),
  },
  scrollContent: {
    paddingTop: ms(4),
    paddingBottom: ms(16),
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: ms(20),
    paddingHorizontal: ms(4),
  },
  loadingHint: {
    marginTop: ms(6),
    fontSize: fs(13),
  },
  emptyTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    marginBottom: 0,
    paddingVertical: ms(6),
    paddingHorizontal: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
    elevation: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ms(8),
    marginBottom: ms(2),
  },
  title: {
    flex: 1,
    fontSize: fs(17),
    fontWeight: '700',
    lineHeight: fs(22),
  },
  /* Compact tap target, no border — icon slightly smaller than before */
  editIconBtn: {
    width: ws(22),
    height: ws(22),
    borderRadius: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: ws(16),
    height: ws(16),
  },
  schedule: {
    fontSize: fs(14),
    fontWeight: '500',
    marginBottom: ms(6),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: ms(6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(8),
  },
  rowLabel: {
    fontSize: fs(13),
    fontWeight: '500',
  },
  rowValue: {
    fontSize: fs(13),
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  deleteSection: {
    marginTop: ms(10),
    alignSelf: 'stretch',
  },
  deleteButton: {
    flex: 0,
    width: '100%',
  },
});

export default WorshipServiceDetailScreen;
