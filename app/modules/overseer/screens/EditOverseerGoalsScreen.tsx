import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
import {CancelButton, SaveButton} from '../../../shared/components/ActionButtons';
import AppInput from '../../../shared/components/AppInput';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
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

  const getMetricTitleParts = (label: string) => {
    const normalizedLabel = label.trim();
    const match = normalizedLabel.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);

    if (!match) {
      return {
        order: '',
        text: normalizedLabel,
      };
    }

    return {
      order: match[1],
      text: match[2].trim(),
    };
  };

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
                    },
                  ]}>
                  <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                    {t(section.titleKey as any)}
                  </Text>

                  {GOAL_METRIC_OPTIONS.map(metric => (
                    <View
                      key={`${section.key}-${metric.key}`}
                      style={[
                        styles.metricCard,
                        {
                          backgroundColor: C.background,
                          borderColor: C.inputBorder,
                        },
                      ]}>
                      {(() => {
                        const metricTitle = t(metric.labelKey as any);
                        const {order, text} = getMetricTitleParts(metricTitle);

                        return (
                          <View style={styles.metricTitleRow}>
                            {order ? (
                              <Text
                                style={[
                                  styles.metricOrder,
                                  {color: C.textSecondary},
                                ]}>
                                {`${order}:`}
                              </Text>
                            ) : null}
                            <Text style={[styles.metricTitle, {color: C.textPrimary}]}>
                              {text || metricTitle}
                            </Text>
                          </View>
                        );
                      })()}

                      <View style={styles.periodsList}>
                        {detail[section.key].map((row, rowIndex) => {
                          const isAoGoal = row[`${metric.key}_is_red`];
                          const isLast = rowIndex === detail[section.key].length - 1;

                          return (
                          <View
                            key={`${row.id}-${metric.key}`}
                            style={[
                              styles.periodEditorItem,
                              {
                                backgroundColor: C.surface,
                                borderBottomColor: C.border,
                              },
                            ]}>
                            <Text
                              style={[styles.periodEditorTitle, {color: C.textSecondary}]}>
                              {formatGoalRangeLabel(row)}
                            </Text>

                            <View style={styles.metricEditorRow}>
                              <View style={styles.metricInputRow}>
                                <AppInput
                                  value={
                                    row[metric.key] === null
                                      ? ''
                                      : String(row[metric.key])
                                  }
                                  onChangeText={text => {
                                    const normalized = text.replace(/[^0-9.]/g, '');
                                    updateRowField(
                                      section.key,
                                      rowIndex,
                                      metric.key,
                                      normalized === '' ? null : Number(normalized),
                                    );
                                  }}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  containerStyle={styles.metricInputContainer}
                                />
                                <Text
                                  style={[
                                    styles.metricSuffix,
                                    {color: C.textSecondary},
                                  ]}>
                                  %
                                </Text>
                              </View>
                              <TouchableOpacity
                                activeOpacity={0.75}
                                style={styles.checkboxRow}
                                onPress={() => {
                                  updateRowField(
                                    section.key,
                                    rowIndex,
                                    `${metric.key}_is_red`,
                                    !isAoGoal,
                                  );
                                }}>
                                <View
                                  style={[
                                    styles.checkbox,
                                    {
                                      borderColor: isAoGoal
                                        ? COLORS.mainColor
                                        : C.inputBorder,
                                      backgroundColor: isAoGoal
                                        ? COLORS.mainColor
                                        : 'transparent',
                                    },
                                  ]}>
                                  {isAoGoal ? (
                                    <Text style={styles.checkboxCheckmark}>✓</Text>
                                  ) : null}
                                </View>
                                <Text
                                  style={[
                                    styles.checkboxLabel,
                                    {
                                      color: isAoGoal
                                        ? COLORS.dangerColor
                                        : C.textSecondary,
                                    },
                                  ]}>
                                  {t('aosGoal')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {!isLast ? (
                              <View
                                style={[
                                  styles.periodDivider,
                                  {backgroundColor: C.border},
                                ]}
                              />
                            ) : null}
                          </View>
                        );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.footerButtons}>
                <CancelButton
                  label={t('cancel')}
                  onPress={() => navigation.goBack()}
                  disabled={submitting}
                />
                <SaveButton
                  label={submitting ? t('saving') : t('save')}
                  onPress={onSave}
                  disabled={submitting}
                />
              </View>
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
    borderRadius: rs(12),
    paddingVertical: ms(12),
  },
  sectionTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: ms(10),
  },
  metricCard: {
    borderWidth: 1,
    borderRadius: rs(10),
    padding: ms(10),
    marginBottom: ms(10),
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(6),
    marginBottom: ms(8),
  },
  metricOrder: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  metricTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    flex: 1,
  },
  periodsList: {
    gap: 0,
  },
  periodEditorItem: {
    paddingVertical: ms(8),
  },
  periodEditorTitle: {
    fontSize: fs(11),
    fontWeight: '700',
    lineHeight: fs(16),
    marginBottom: ms(6),
  },
  metricEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(10),
  },
  metricInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricInputContainer: {
    flex: 1,
  },
  metricSuffix: {
    marginLeft: ms(6),
    fontSize: fs(13),
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: ws(98),
    justifyContent: 'flex-end',
  },
  checkbox: {
    width: ws(20),
    height: ws(20),
    borderWidth: 2,
    borderRadius: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(8),
  },
  checkboxCheckmark: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: fs(11),
  },
  periodDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: ms(8),
  },
  footer: {
    paddingTop: ms(10),
    paddingBottom: ms(14),
  },
  footerButtons: {
    flexDirection: 'row',
    gap: ms(10),
  },
});

export default EditOverseerGoalsScreen;
