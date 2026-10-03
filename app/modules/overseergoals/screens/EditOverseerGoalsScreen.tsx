import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {CancelButton, SaveButton} from '../../../shared/components/ActionButtons';
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
  countFilledGoalMetrics,
  countRedGoalMetrics,
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
  const [activeSection, setActiveSection] = useState<GoalSectionKey>(
    GOAL_SECTION_OPTIONS[0].key,
  );
  const scrollRef = useRef<ScrollView>(null);

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
      returnAfterEdit(navigation);
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('failedToUpdateGoals'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeRows = detail ? detail[activeSection] : [];
  const sectionRedCount = (sectionKey: GoalSectionKey) =>
    detail
      ? detail[sectionKey].reduce(
          (sum, row) => sum + countRedGoalMetrics(row),
          0,
        )
      : 0;
  const activeFilled = activeRows.reduce(
    (sum, row) => sum + countFilledGoalMetrics(row),
    0,
  );

  const selectSection = (sectionKey: GoalSectionKey) => {
    setActiveSection(sectionKey);
    scrollRef.current?.scrollTo({y: 0, animated: false});
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
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}>
                {GOAL_SECTION_OPTIONS.map(section => {
                  const active = section.key === activeSection;
                  const redCount = sectionRedCount(section.key);
                  return (
                    <TouchableOpacity
                      key={section.key}
                      activeOpacity={0.8}
                      onPress={() => selectSection(section.key)}
                      style={[
                        styles.tab,
                        active
                          ? {backgroundColor: COLORS.mainColor, borderColor: COLORS.mainColor}
                          : {backgroundColor: C.surface, borderColor: C.border},
                      ]}>
                      <Text
                        style={[
                          styles.tabText,
                          {color: active ? COLORS.white : C.textPrimary},
                        ]}>
                        {t(section.titleKey as any)}
                      </Text>
                      {redCount > 0 ? (
                        <View
                          style={[
                            styles.tabBadge,
                            {backgroundColor: active ? COLORS.white : COLORS.dangerColor},
                          ]}>
                          <Text
                            style={[
                              styles.tabBadgeText,
                              {color: active ? COLORS.dangerColor : COLORS.white},
                            ]}>
                            {redCount}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <Text style={[styles.sectionMeta, {color: C.textSecondary}]}>
              {`${activeRows.length} ${t('periodsLabel')}  ·  ${activeFilled} ${t('filledMetrics')}  ·  ${sectionRedCount(activeSection)} ${t('redFlags')}`}
            </Text>

            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}>
              {GOAL_METRIC_OPTIONS.map(metric => {
                const metricTitle = t(metric.labelKey as any);
                const {order, text} = getMetricTitleParts(metricTitle);
                const metricRed = activeRows.filter(
                  row => row[`${metric.key}_is_red`],
                ).length;

                return (
                  <View
                    key={`${activeSection}-${metric.key}`}
                    style={[
                      styles.card,
                      {backgroundColor: C.surface, borderColor: C.border},
                    ]}>
                    <View style={styles.metricHead}>
                      {order ? (
                        <View style={[styles.orderBadge, {backgroundColor: COLORS.mainColor + '14'}]}>
                          <Text style={[styles.orderText, {color: COLORS.mainColor}]}>
                            {order}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[styles.metricTitle, {color: C.textPrimary}]}>
                        {text || metricTitle}
                      </Text>
                      {metricRed > 0 ? (
                        <View style={[styles.flagChip, {backgroundColor: COLORS.dangerColor + '14'}]}>
                          <Text style={[styles.flagChipText, {color: COLORS.dangerColor}]}>
                            {metricRed}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={[styles.tableHead, {borderBottomColor: C.border}]}>
                      <Text style={[styles.colLabel, styles.colPeriod, {color: C.textSecondary}]}>
                        {t('period')}
                      </Text>
                      <Text style={[styles.colLabel, styles.colValue, {color: C.textSecondary}]}>
                        {t('value')}
                      </Text>
                      <Text
                        style={[styles.colLabel, styles.colFlag, {color: C.textSecondary}]}
                        numberOfLines={1}>
                        {t('aosGoal')}
                      </Text>
                    </View>

                    {activeRows.map((row, rowIndex) => {
                      const isAoGoal = row[`${metric.key}_is_red`];
                      const value = row[metric.key];

                      return (
                        <View
                          key={`${row.id}-${metric.key}`}
                          style={[
                            styles.periodRow,
                            rowIndex > 0 && {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: C.border,
                            },
                            isAoGoal && {backgroundColor: COLORS.dangerColor + '0D'},
                          ]}>
                          <Text
                            style={[
                              styles.periodLabel,
                              styles.colPeriod,
                              {color: isAoGoal ? COLORS.dangerColor : C.textPrimary},
                            ]}
                            numberOfLines={1}>
                            {formatGoalRangeLabel(row)}
                          </Text>

                          <View
                            style={[
                              styles.inputWrap,
                              styles.colValue,
                              {
                                backgroundColor: C.inputBg,
                                borderColor: isAoGoal ? COLORS.dangerColor : C.inputBorder,
                              },
                            ]}>
                            <TextInput
                              value={value === null ? '' : String(value)}
                              onChangeText={input => {
                                const normalized = input.replace(/[^0-9.]/g, '');
                                updateRowField(
                                  activeSection,
                                  rowIndex,
                                  metric.key,
                                  normalized === '' ? null : Number(normalized),
                                );
                              }}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor={C.textSecondary}
                              style={[styles.input, {color: C.inputText}]}
                            />
                            <Text style={[styles.suffix, {color: C.textSecondary}]}>%</Text>
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.75}
                            style={styles.colFlag}
                            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                            accessibilityRole="checkbox"
                            accessibilityState={{checked: !!isAoGoal}}
                            accessibilityLabel={`${t('aosGoal')} ${formatGoalRangeLabel(row)}`}
                            onPress={() =>
                              updateRowField(
                                activeSection,
                                rowIndex,
                                `${metric.key}_is_red`,
                                !isAoGoal,
                              )
                            }>
                            <View
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: isAoGoal ? COLORS.dangerColor : C.inputBorder,
                                  backgroundColor: isAoGoal ? COLORS.dangerColor : 'transparent',
                                },
                              ]}>
                              {isAoGoal ? (
                                <Text style={styles.checkboxCheckmark}>✓</Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.footer, {borderTopColor: C.border}]}>
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
          </KeyboardAvoidingView>
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
  flex: {flex: 1},
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fs(14),
  },
  tabs: {
    gap: ms(8),
    paddingVertical: ms(4),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(999),
    paddingHorizontal: ms(12),
    height: ms(32),
  },
  tabText: {fontSize: fs(12), fontWeight: '600'},
  tabBadge: {
    minWidth: ms(18),
    height: ms(18),
    borderRadius: rs(9),
    paddingHorizontal: ms(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {fontSize: fs(10), fontWeight: '700'},
  sectionMeta: {
    fontSize: fs(12),
    lineHeight: fs(16),
    marginTop: ms(8),
    marginBottom: ms(10),
  },
  scrollContent: {
    paddingBottom: ms(24),
    gap: ms(12),
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(14),
    paddingHorizontal: ms(14),
    paddingTop: ms(14),
    paddingBottom: ms(6),
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(8),
  },
  orderBadge: {
    minWidth: ms(26),
    height: ms(22),
    borderRadius: rs(6),
    paddingHorizontal: ms(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {fontSize: fs(11), fontWeight: '700'},
  metricTitle: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '700',
    lineHeight: fs(20),
  },
  flagChip: {
    borderRadius: rs(999),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
  },
  flagChipText: {fontSize: fs(11), fontWeight: '700'},
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(12),
    paddingBottom: ms(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colLabel: {
    fontSize: fs(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colPeriod: {flex: 1},
  colValue: {width: ws(96)},
  colFlag: {width: ws(72), alignItems: 'center', textAlign: 'center'},
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(8),
    marginHorizontal: -ms(8),
    paddingHorizontal: ms(8),
    borderRadius: rs(8),
  },
  periodLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    paddingRight: ms(8),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(36),
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: ms(10),
  },
  input: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '600',
    paddingVertical: 0,
    textAlign: 'right',
  },
  suffix: {
    marginLeft: ms(4),
    fontSize: fs(13),
    fontWeight: '600',
  },
  checkbox: {
    width: ws(22),
    height: ws(22),
    borderWidth: 2,
    borderRadius: rs(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheckmark: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: ms(10),
    paddingTop: ms(10),
    paddingBottom: ms(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default EditOverseerGoalsScreen;
