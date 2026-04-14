import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
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
import {fs, ms, rs} from '../../../shared/utils/scale';
import {
  getOverseerGoalPeriodDetail,
  GoalPeriodDetailData,
} from '../services/overseerGoals.service';
import {
  countFilledGoalMetrics,
  countRedGoalMetrics,
  formatGoalRangeLabel,
  GOAL_SECTION_OPTIONS,
} from '../config/goalPeriodFields';

const OverseerGoalDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route?.params?.goalPeriodId;
  const C = useThemedColors();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
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
        console.error('Failed to load goal period detail:', error);
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

  const sectionSummaries = useMemo(() => {
    if (!detail) {
      return [];
    }

    return GOAL_SECTION_OPTIONS.map(section => {
      const rows = detail[section.key];
      const filledMetrics = rows.reduce((sum, row) => {
        return sum + countFilledGoalMetrics(row);
      }, 0);
      const redMetrics = rows.reduce((sum, row) => {
        return sum + countRedGoalMetrics(row);
      }, 0);

      return {
        ...section,
        rows,
        periods: rows.length,
        filledMetrics,
        redMetrics,
      };
    });
  }, [detail]);

  const summaryTotals = useMemo(() => {
    return sectionSummaries.reduce(
      (acc, section) => {
        acc.periods += section.periods;
        acc.filled += section.filledMetrics;
        acc.red += section.redMetrics;
        return acc;
      },
      {periods: 0, filled: 0, red: 0},
    );
  }, [sectionSummaries]);

  const parameterItems = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      {label: t('church'), value: detail.goal_period.local_church_name},
      {label: t('assignedTo'), value: detail.goal_period.user_name},
      {label: t('nation'), value: detail.goal_period.nation_name},
      {label: t('churchNetwork'), value: detail.goal_period.church_network},
      {
        label: t('geographicalRegion'),
        value: detail.goal_period.geographical_region,
      },
      {label: t('churchRegion'), value: detail.goal_period.church_region},
      {label: t('languageRegion'), value: detail.goal_period.language_region},
    ];
  }, [detail, t]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('overseerGoalDetail')} showMenu={false} />

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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.inputBorder,
                  shadowOpacity: 0.08,
                },
              ]}>
              <View style={styles.heroTopRow}>
                <View
                  style={[
                    styles.periodPill,
                    {
                      backgroundColor: COLORS.mainColor + '12',
                      borderColor: COLORS.mainColor + '33',
                    },
                  ]}>
                  <Text style={[styles.periodPillText, {color: COLORS.mainColor}]}>
                    {`${detail.goal_period.start_year} - ${detail.goal_period.end_year}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.idPill,
                    {
                      backgroundColor: C.background,
                      borderColor: C.inputBorder,
                    },
                  ]}>
                  <Text style={[styles.idPillText, {color: C.textSecondary}]}>
                    {`#${detail.goal_period.id}`}
                  </Text>
                </View>
              </View>

              <Text style={[styles.heroTitle, {color: C.textPrimary}]}>
                {detail.goal_period.nation_name || '-'}
              </Text>
              <Text style={[styles.heroSubtitle, {color: C.textSecondary}]}>
                {detail.goal_period.church_network || detail.goal_period.local_church_name || '-'}
              </Text>

              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: C.background,
                      borderColor: C.inputBorder,
                    },
                  ]}>
                  <Text style={[styles.statValue, {color: C.textPrimary}]}>
                    {summaryTotals.periods}
                  </Text>
                  <Text style={[styles.statLabel, {color: C.textSecondary}]}>
                    {t('total')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: C.background,
                      borderColor: C.inputBorder,
                    },
                  ]}>
                  <Text style={[styles.statValue, {color: C.textPrimary}]}>
                    {summaryTotals.filled}
                  </Text>
                  <Text style={[styles.statLabel, {color: C.textSecondary}]}>
                    {t('filledMetrics')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statBox,
                    {
                      backgroundColor: C.background,
                      borderColor: C.inputBorder,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statValue,
                      {color: summaryTotals.red > 0 ? COLORS.dangerColor : C.textPrimary},
                    ]}>
                    {summaryTotals.red}
                  </Text>
                  <Text style={[styles.statLabel, {color: C.textSecondary}]}>
                    {t('redFlags')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryButton, {backgroundColor: COLORS.mainColor}]}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('EditOverseerGoals', {goalPeriodId})
                }>
                <Text style={styles.primaryButtonText}>{t('editGoals')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {backgroundColor: C.surface, borderColor: C.inputBorder},
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('EditOverseerGoalDefaults', {goalPeriodId})
                }>
                <Text style={[styles.secondaryButtonText, {color: C.textPrimary}]}>
                  {t('editParameters')}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.parametersCard,
                {
                  backgroundColor: C.surface,
                  borderColor: C.inputBorder,
                  shadowOpacity: 0.08,
                },
              ]}>
              <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                {t('editParameters')}
              </Text>
              <View style={styles.parametersList}>
                {parameterItems.map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      styles.parameterRow,
                      {
                        backgroundColor: C.background,
                        borderColor: C.inputBorder,
                        borderBottomColor: C.border,
                      },
                    ]}>
                    <View style={styles.parameterRowLeft}>
                      <Text
                        style={[styles.parameterLabel, {color: C.textSecondary}]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.parameterValue, {color: C.textPrimary}]}>
                        {item.value || '-'}
                      </Text>
                    </View>
                    {index !== parameterItems.length - 1 ? (
                      <View
                        style={[
                          styles.parameterDivider,
                          {backgroundColor: C.border},
                        ]}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            {sectionSummaries.map(section => (
              <View
                key={section.key}
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.inputBorder,
                    shadowOpacity: 0.08,
                  },
                ]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.summaryTitle, {color: C.textPrimary}]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.summaryMeta, {color: C.textSecondary}]}>
                      {`${section.periods} periods`}
                    </Text>
                  </View>
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.sectionBadge,
                        {
                          backgroundColor: C.background,
                          borderColor: C.inputBorder,
                        },
                      ]}>
                      <Text style={[styles.sectionBadgeText, {color: C.textSecondary}]}>
                        {`${section.filledMetrics} ${t('filledMetrics')}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.sectionBadge,
                        {
                          backgroundColor:
                            section.redMetrics > 0
                              ? COLORS.dangerColor + '14'
                              : C.background,
                          borderColor:
                            section.redMetrics > 0
                              ? COLORS.dangerColor + '33'
                              : C.inputBorder,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.sectionBadgeText,
                          {
                            color:
                              section.redMetrics > 0
                                ? COLORS.dangerColor
                                : C.textSecondary,
                          },
                        ]}>
                        {`${section.redMetrics} ${t('redFlags')}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {section.rows.map(row => (
                  <View
                    key={`${section.key}-${row.id}`}
                    style={[
                      styles.periodRow,
                      {
                        borderBottomColor: C.border,
                        backgroundColor: C.background,
                      },
                    ]}>
                    <View style={styles.periodRowMain}>
                      <Text style={[styles.periodRowTitle, {color: C.textPrimary}]}>
                        {formatGoalRangeLabel(row)}
                      </Text>
                      <Text style={[styles.periodRowMeta, {color: C.textSecondary}]}>
                        {`${countFilledGoalMetrics(row)} ${t('filledMetrics')}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.rowStatusPill,
                        {
                          backgroundColor:
                            countRedGoalMetrics(row) > 0
                              ? COLORS.dangerColor + '14'
                              : COLORS.mainColor + '12',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.rowStatusPillText,
                          {
                            color:
                              countRedGoalMetrics(row) > 0
                                ? COLORS.dangerColor
                                : COLORS.mainColor,
                          },
                        ]}>
                        {countRedGoalMetrics(row) > 0
                          ? `${countRedGoalMetrics(row)} ${t('redFlags')}`
                          : 'OK'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
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
  detailCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    padding: ms(14),
    shadowColor: '#000',
    shadowRadius: rs(8),
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodPill: {
    borderWidth: 1,
    borderRadius: rs(999),
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
  },
  periodPillText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  idPill: {
    borderWidth: 1,
    borderRadius: rs(999),
    paddingHorizontal: ms(9),
    paddingVertical: ms(5),
  },
  idPillText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    marginTop: ms(12),
  },
  heroSubtitle: {
    fontSize: fs(12),
    marginTop: ms(4),
  },
  statsRow: {
    flexDirection: 'row',
    gap: ms(10),
    marginTop: ms(14),
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs(10),
    paddingVertical: ms(10),
    paddingHorizontal: ms(8),
    alignItems: 'center',
  },
  statValue: {
    fontSize: fs(18),
    fontWeight: '800',
  },
  statLabel: {
    fontSize: fs(11),
    marginTop: ms(3),
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: ms(10),
  },
  primaryButton: {
    flex: 1,
    minHeight: ms(40),
    borderRadius: rs(6),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(12),
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: fs(13),
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    minHeight: ms(40),
    borderRadius: rs(6),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(12),
  },
  secondaryButtonText: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  parametersCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    padding: ms(14),
    shadowColor: '#000',
    shadowRadius: rs(8),
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: ms(10),
  },
  parametersList: {
    gap: ms(8),
  },
  parameterRow: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
  },
  parameterRowLeft: {
    flex: 1,
  },
  parameterLabel: {
    fontSize: fs(11),
    fontWeight: '700',
    marginBottom: ms(4),
    textTransform: 'uppercase',
  },
  parameterValue: {
    fontSize: fs(13),
    fontWeight: '600',
    lineHeight: fs(18),
  },
  parameterDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: ms(10),
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: rs(12),
    padding: ms(14),
    shadowColor: '#000',
    shadowRadius: rs(8),
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  summaryTitle: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: ms(10),
    marginBottom: ms(10),
  },
  sectionHeaderText: {
    flex: 1,
  },
  summaryMeta: {
    fontSize: fs(12),
    marginTop: ms(4),
  },
  badgesRow: {
    alignItems: 'flex-end',
    gap: ms(6),
  },
  sectionBadge: {
    borderWidth: 1,
    borderRadius: rs(999),
    paddingHorizontal: ms(8),
    paddingVertical: ms(5),
  },
  sectionBadgeText: {
    fontSize: fs(10),
    fontWeight: '700',
  },
  periodRow: {
    paddingVertical: ms(10),
    paddingHorizontal: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(10),
    marginBottom: ms(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: ms(10),
  },
  periodRowMain: {
    flex: 1,
  },
  periodRowTitle: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  periodRowMeta: {
    fontSize: fs(11),
    marginTop: ms(4),
  },
  rowStatusPill: {
    borderRadius: rs(999),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
  },
  rowStatusPillText: {
    fontSize: fs(10),
    fontWeight: '700',
  },
});

export default OverseerGoalDetailScreen;
