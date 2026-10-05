import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Svg, {Path} from 'react-native-svg';
import {DeleteButton} from '../../../shared/components/ActionButtons';
import {
  DetailCard,
  DetailRow,
  ListEmptyState,
  ScreenContainer,
} from '../../../shared/components/crud';
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

/** Some API strings arrive as UTF-8 bytes decoded as Latin-1 (e.g. "RegiÃ£o"). */
function repairText(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!/[ÃÂ]/.test(text)) {
    return text;
  }
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code > 0xff) {
      return text;
    }
    bytes.push(code);
  }
  try {
    const decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    return decoded.includes('\uFFFD') ? text : decoded;
  } catch {
    return text;
  }
}

function EditGoalsIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 2.5h10.5L19.5 6.5V21.5H5Z"
        fill="#FFFFFF"
        stroke="#8A9199"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d="M15.5 2.5V6.5H19.5" fill="#E6E9EC" stroke="#8A9199" strokeWidth={1.2} strokeLinejoin="round" />
      {[8, 12.5, 17].map(y => (
        <React.Fragment key={y}>
          <Path
            d={`M7 ${y}l1.3 1.3L10.6 ${y - 1.6}`}
            fill="none"
            stroke="#2E9E3E"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d={`M12 ${y}h5`} stroke="#9AA1A8" strokeWidth={1.3} strokeLinecap="round" />
        </React.Fragment>
      ))}
    </Svg>
  );
}

function EditParametersIcon({size}: {size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M16.2 3.2l4.6 4.6L9.4 19.2l-4.6-4.6Z" fill="#D9363E" />
      <Path d="M16.2 3.2l2.3 2.3L7.1 16.9l-2.3-2.3Z" fill="#F0626A" />
      <Path d="M17.6 1.8a1.6 1.6 0 0 1 2.3 0l2.3 2.3a1.6 1.6 0 0 1 0 2.3l-1.4 1.4-4.6-4.6Z" fill="#9E1F27" />
      <Path d="M4.8 14.6l4.6 4.6-6.4 1.8Z" fill="#E8C49A" />
      <Path d="M3.6 18.9l1.5 1.5L3 21Z" fill="#4A3B2E" />
    </Svg>
  );
}

const IconAction: React.FC<{
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}> = ({label, onPress, children}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={4}
    onPress={onPress}
    style={({pressed}) => [styles.iconAction, {opacity: pressed ? 0.6 : 1}]}>
    {children}
  </Pressable>
);

const OverseerGoalDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route?.params?.goalPeriodId;
  const C = useThemedColors();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GoalPeriodDetailData | null>(null);
  const hasDetail = useRef(false);

  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const loadDetail = useCallback(async () => {
    if (!goalPeriodId) {
      setLoading(false);
      return;
    }

    if (!hasDetail.current) {
      setLoading(true);
    }

    try {
      const response = await getOverseerGoalPeriodDetail(goalPeriodId);
      if (mountedRef.current) {
        const nextDetail = response?.data ?? null;
        hasDetail.current = nextDetail != null;
        setDetail(nextDetail);
        setLoadError(null);
      }
    } catch (error) {
      console.error('Failed to load goal period detail:', error);
      if (mountedRef.current && !hasDetail.current) {
        setDetail(null);
        setLoadError(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [goalPeriodId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

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

  const detailRows = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      {label: t('churchNetwork'), value: repairText(detail.goal_period.church_network)},
      {
        label: t('geographicalRegion'),
        value: repairText(detail.goal_period.geographical_region),
      },
      {label: t('churchRegion'), value: repairText(detail.goal_period.church_region)},
      {label: t('languageRegion'), value: repairText(detail.goal_period.language_region)},
    ].filter(row => row.value);
  }, [detail, t]);

  const cardStyle = {backgroundColor: C.surface, borderColor: C.border};

  return (
    <ScreenContainer
      title={t('overseerGoalDetail')}
      loading={loading}
      error={!detail ? loadError : null}
      onRetry={loadDetail}>
        {!detail ? (
          <ListEmptyState />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.card, cardStyle]}>
              <View style={styles.heroTop}>
                <View style={styles.chipRow}>
                  <View style={[styles.periodChip, {backgroundColor: COLORS.mainColor + '14'}]}>
                    <Text style={[styles.periodChipText, {color: COLORS.mainColor}]}>
                      {`${detail.goal_period.start_year} – ${detail.goal_period.end_year}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <IconAction
                    label={t('editGoals')}
                    onPress={() =>
                      navigation.navigate('EditOverseerGoals', {goalPeriodId})
                    }>
                    <EditGoalsIcon size={ms(22)} />
                  </IconAction>
                  <IconAction
                    label={t('editParameters')}
                    onPress={() =>
                      navigation.navigate('EditOverseerGoalDefaults', {goalPeriodId})
                    }>
                    <EditParametersIcon size={ms(22)} />
                  </IconAction>
                </View>
              </View>

              <Text style={[styles.name, {color: C.textPrimary}]}>
                {repairText(detail.goal_period.user_name) || '-'}
              </Text>
              <Text style={[styles.church, {color: C.textPrimary}]}>
                {repairText(detail.goal_period.local_church_name) || '-'}
              </Text>
              <Text style={[styles.nation, {color: C.textSecondary}]}>
                {repairText(detail.goal_period.nation_name) || '-'}
              </Text>

              <View style={[styles.stats, {borderTopColor: C.border}]}>
                {[
                  {value: summaryTotals.periods, label: t('periodsLabel')},
                  {value: summaryTotals.filled, label: t('filledMetrics')},
                  {
                    value: summaryTotals.red,
                    label: t('redFlags'),
                    color: summaryTotals.red > 0 ? COLORS.dangerColor : undefined,
                  },
                ].map((stat, index) => (
                  <View
                    key={stat.label}
                    style={[
                      styles.stat,
                      index > 0 && {
                        borderLeftWidth: StyleSheet.hairlineWidth,
                        borderLeftColor: C.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statValue,
                        {color: stat.color ?? C.textPrimary},
                      ]}>
                      {stat.value}
                    </Text>
                    <Text
                      style={[styles.statLabel, {color: C.textSecondary}]}
                      numberOfLines={1}>
                      {stat.label.charAt(0).toUpperCase() + stat.label.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {detailRows.length > 0 ? (
              <DetailCard title={t('details')}>
                {detailRows.map(row => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </DetailCard>
            ) : null}

            {sectionSummaries.map(section => (
              <View key={section.key} style={[styles.card, cardStyle]}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.cardTitle, styles.sectionTitle, {color: C.textPrimary}]}>
                    {t(section.titleKey as any)}
                  </Text>
                  {section.redMetrics > 0 ? (
                    <View style={[styles.flagChip, {backgroundColor: COLORS.dangerColor + '14'}]}>
                      <Text style={[styles.flagChipText, {color: COLORS.dangerColor}]}>
                        {section.redMetrics} {t('redFlags')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.sectionMeta, {color: C.textSecondary}]}>
                  {`${section.periods} ${t('periodsLabel')}  ·  ${section.filledMetrics} ${t('filledMetrics')}`}
                </Text>

                {section.rows.map(row => {
                  const filledMetrics = countFilledGoalMetrics(row);
                  const redMetrics = countRedGoalMetrics(row);
                  const statusColor =
                    redMetrics > 0 ? COLORS.dangerColor : COLORS.successColor;
                  return (
                    <View
                      key={`${section.key}-${row.id}`}
                      style={[styles.periodRow, {borderTopColor: C.border}]}>
                      <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
                      <View style={styles.periodMain}>
                        <Text style={[styles.periodTitle, {color: C.textPrimary}]}>
                          {formatGoalRangeLabel(row)}
                        </Text>
                        <Text style={[styles.periodMeta, {color: C.textSecondary}]}>
                          {`${filledMetrics} ${t('filledMetrics')}`}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.periodStatus,
                          {color: redMetrics > 0 ? COLORS.dangerColor : COLORS.successColor},
                        ]}>
                        {redMetrics > 0 ? `${redMetrics} ${t('redFlags')}` : t('ok')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}

            <DeleteButton
              label={t('delete')}
              onPress={() =>
                navigation.navigate('DeleteOverseerGoalPeriod', {goalPeriodId})
              }
              fullWidth
              style={styles.deleteButton}
            />
          </ScrollView>
        )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(28),
    gap: ms(12),
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(14),
    padding: ms(14),
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {flexDirection: 'row', alignItems: 'center', gap: ms(8)},
  periodChip: {
    borderRadius: rs(999),
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
  },
  periodChipText: {fontSize: fs(12), fontWeight: '700'},
  actions: {flexDirection: 'row', alignItems: 'center', gap: ms(8)},
  iconAction: {
    width: ms(36),
    height: ms(36),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: fs(20),
    fontWeight: '700',
    lineHeight: fs(26),
    marginTop: ms(12),
  },
  church: {
    fontSize: fs(14),
    fontWeight: '600',
    lineHeight: fs(20),
    marginTop: ms(2),
  },
  nation: {
    fontSize: fs(13),
    lineHeight: fs(18),
    marginTop: ms(2),
  },
  stats: {
    flexDirection: 'row',
    marginTop: ms(14),
    paddingTop: ms(12),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: {flex: 1, alignItems: 'center', paddingHorizontal: ms(4)},
  statValue: {
    fontSize: fs(20),
    fontWeight: '700',
    lineHeight: fs(24),
    textAlign: 'center',
  },
  statLabel: {
    fontSize: fs(11),
    lineHeight: fs(15),
    marginTop: ms(2),
    textAlign: 'center',
  },
  cardTitle: {fontSize: fs(15), fontWeight: '700', lineHeight: fs(20)},
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  sectionTitle: {flex: 1},
  flagChip: {
    borderRadius: rs(999),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
  },
  flagChipText: {fontSize: fs(11), fontWeight: '700'},
  sectionMeta: {
    fontSize: fs(12),
    lineHeight: fs(16),
    marginTop: ms(2),
    marginBottom: ms(6),
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    paddingVertical: ms(10),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusDot: {width: ms(8), height: ms(8), borderRadius: rs(4)},
  periodMain: {flex: 1},
  periodTitle: {fontSize: fs(14), fontWeight: '600', lineHeight: fs(19)},
  periodMeta: {fontSize: fs(11), lineHeight: fs(15), marginTop: ms(1)},
  periodStatus: {fontSize: fs(12), fontWeight: '700', textAlign: 'right'},
  deleteButton: {marginTop: ms(4)},
});

export default OverseerGoalDetailScreen;
