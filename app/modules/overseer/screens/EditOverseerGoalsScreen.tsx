import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {formStyles} from '../../../shared/styles/form';
import {SaveButton} from '../../../shared/components/ActionButtons';
import AppInput from '../../../shared/components/AppInput';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import {
  getOverseerGoalPeriodDetail,
  GoalPeriodBatchUpdatePayload,
  GoalPeriodDetailData,
  GoalPeriodDetailRow,
  GoalSectionKey,
  updateOverseerGoalPeriodDetailsBatch,
} from '../services/overseerGoals.service';
import {
  formatGoalRangeLabel,
  GOAL_METRIC_OPTIONS,
  GOAL_SECTION_OPTIONS,
} from '../config/goalPeriodFields';

const EditOverseerGoalsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route?.params?.goalPeriodId;
  const C = useThemedColors();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<GoalPeriodDetailData | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      if (!goalPeriodId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getOverseerGoalPeriodDetail(goalPeriodId);
        if (mounted) {
          setDetail(response?.data ?? null);
        }
      } catch (error) {
        console.error('Failed to load edit goals detail:', error);
        if (mounted) {
          setDetail(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      mounted = false;
    };
  }, [goalPeriodId]);

  const updateRowField = (
    sectionKey: GoalSectionKey,
    rowIndex: number,
    field: keyof GoalPeriodDetailRow,
    value: GoalPeriodDetailRow[keyof GoalPeriodDetailRow],
  ) => {
    setDetail(prev => {
      if (!prev) {
        return prev;
      }

      const nextRows = prev[sectionKey].map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      });

      return {
        ...prev,
        [sectionKey]: nextRows,
      };
    });
  };

  const buildPayload = (): GoalPeriodBatchUpdatePayload | null => {
    if (!detail) {
      return null;
    }

    return {
      home_church_goals: detail.home_church_goals,
      home_church_planting_goals: detail.home_church_planting_goals,
      nation_goals: detail.nation_goals,
      region_goals: detail.region_goals,
    };
  };

  const onSave = async () => {
    if (!goalPeriodId) {
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    try {
      setSubmitting(true);
      await updateOverseerGoalPeriodDetailsBatch(goalPeriodId, payload);
      Alert.alert(t('success'), t('goalsUpdatedSuccess'));
      navigation.replace('OverseerGoalDetail', {goalPeriodId});
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('failedToUpdateGoals'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('editGoals')} showMenu={false} />

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="small" color={COLORS.mainColor} />
          </View>
        ) : !detail ? (
          <View style={styles.centerContent}>
            <Text style={[styles.emptyText, {color: C.textSecondary}]}>
              {t('noDataFound')}
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              {GOAL_SECTION_OPTIONS.map(section => (
                <View
                  key={section.key}
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.inputBorder,
                    },
                  ]}>
                  <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                    {section.title}
                  </Text>

                  {detail[section.key].map((row, rowIndex) => (
                    <View
                      key={`${section.key}-${row.id}`}
                      style={[
                        styles.periodCard,
                        {
                          backgroundColor: C.background,
                          borderColor: C.border,
                        },
                      ]}>
                      <Text style={[styles.periodTitle, {color: C.textPrimary}]}>
                        {formatGoalRangeLabel(row)}
                      </Text>

                      {GOAL_METRIC_OPTIONS.map(metric => (
                        <View
                          key={`${row.id}-${metric.key}`}
                          style={[
                            styles.metricBlock,
                            {borderBottomColor: C.border},
                          ]}>
                          <Text style={[styles.metricLabel, {color: C.textSecondary}]}>
                            {metric.label}
                          </Text>
                          <View style={styles.metricControls}>
                            <View style={styles.metricInputWrap}>
                              <AppInput
                                value={
                                  row[metric.key] === null
                                    ? ''
                                    : String(row[metric.key])
                                }
                                onChangeText={text => {
                                  const trimmed = text.trim();
                                  updateRowField(
                                    section.key,
                                    rowIndex,
                                    metric.key,
                                    trimmed === '' ? null : Number(trimmed),
                                  );
                                }}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                            </View>
                            <View style={styles.switchWrap}>
                              <Text
                                style={[
                                  styles.switchLabel,
                                  {color: C.textSecondary},
                                ]}>
                                Red
                              </Text>
                              <Switch
                                style={{transform: [{scaleX: 0.9}, {scaleY: 0.9}]}}
                                value={row[`${metric.key}_is_red`]}
                                onValueChange={value => {
                                  updateRowField(
                                    section.key,
                                    rowIndex,
                                    `${metric.key}_is_red`,
                                    value,
                                  );
                                }}
                                thumbColor={COLORS.white}
                                trackColor={{
                                  false: C.border,
                                  true: COLORS.mainColor,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <SaveButton
                label={submitting ? t('saving') : t('save')}
                onPress={onSave}
                disabled={submitting}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fs(14),
  },
  scrollContent: {
    paddingBottom: ms(24),
    gap: ms(12),
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    padding: ms(12),
  },
  sectionTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: ms(10),
  },
  periodCard: {
    borderWidth: 1,
    borderRadius: rs(10),
    padding: ms(10),
    marginBottom: ms(10),
  },
  periodTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    marginBottom: ms(8),
  },
  metricBlock: {
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLabel: {
    fontSize: fs(12),
    fontWeight: '600',
    marginBottom: ms(6),
  },
  metricControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
  },
  metricInputWrap: {
    flex: 1,
  },
  switchWrap: {
    minWidth: ms(82),
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLabel: {
    fontSize: fs(11),
    marginBottom: ms(2),
  },
  footer: {
    paddingTop: ms(10),
    paddingBottom: ms(14),
  },
});

export default EditOverseerGoalsScreen;
