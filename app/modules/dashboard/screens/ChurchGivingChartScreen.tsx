import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {Circle, Line, Polyline} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getChurchGivingGraph,
  ChurchGivingGraphSeries,
} from '../services/churchGivingChart.service';

const CHART_HEIGHT = 220;
const POINT_GAP = 24;
const PADDING_X = 20;
const PADDING_Y = 18;
const Y_AXIS_WIDTH = 26;
const DISPLAY_WEEKS = 52;
const X_TICK_EVERY = 4;
const GIVING_COLOR = '#9b6bb0';
const MFP_COLOR = '#d29a3a';

const getNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
};

const parseWeekEndDate = (label: string) => {
  if (!label) {
    return null;
  }

  const rangeMatch = label.match(/^\s*(.*?)\s*[–-]\s*(.*?)\s*$/);
  const endPart = rangeMatch?.[2]?.trim();
  const yearMatch = label.match(/(\d{4})\s*$/);
  if (!endPart || !yearMatch) {
    return null;
  }

  const normalized = /\d{4}$/.test(endPart)
    ? endPart
    : `${endPart} ${yearMatch[1]}`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatWeekEndLabel = (label: string, locale: string) => {
  const date = parseWeekEndDate(label);
  if (!date) {
    return label;
  }

  const day = date.getDate();
  const month = date.toLocaleString(locale, {month: 'short'});
  const year = String(date.getFullYear()).slice(-2);

  return `${day} ${month} ${year}`;
};

export default function ChurchGivingChartScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const route = useRoute<any>();
  const routeChurchId =
    typeof route?.params?.churchId === 'number' ? route.params.churchId : 97;
  const [selectedChurchId, setSelectedChurchId] = useState(routeChurchId);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<ChurchGivingGraphSeries | null>(null);
  const [dates, setDates] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const syncSelectedChurch = async () => {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          const parsedChurchId = savedChurchId ? parseInt(savedChurchId, 10) : NaN;

          if (active) {
            if (!isNaN(parsedChurchId) && parsedChurchId > 0) {
              setSelectedChurchId(parsedChurchId);
            } else {
              setSelectedChurchId(routeChurchId);
            }
          }
        } catch {
          if (active) {
            setSelectedChurchId(routeChurchId);
          }
        }
      };

      syncSelectedChurch();

      return () => {
        active = false;
      };
    }, [routeChurchId]),
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await getChurchGivingGraph({
          churchId: selectedChurchId,
          period: '2y',
        });
        setDates(result?.dates ?? []);
        const preferred =
          result?.data?.find(item => item.church_id === selectedChurchId) ??
          result?.data?.find(item => item.church_id !== 0) ??
          null;
        setSeries(preferred);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedChurchId]);

  const chartSeries = useMemo(() => {
    const giving = (series?.giving_in_usd ?? []).map(value =>
      typeof value === 'number' ? Math.max(0, value) : null,
    );
    const mfp = (series?.mfp_giving_in_usd ?? []).map(value =>
      typeof value === 'number' ? Math.max(0, value) : null,
    );
    const totalPoints = Math.max(giving.length, mfp.length, dates.length);
    const startIndex = Math.max(0, totalPoints - DISPLAY_WEEKS);

    return {
      giving: giving.slice(startIndex, totalPoints),
      mfp: mfp.slice(startIndex, totalPoints),
      dates: dates.slice(startIndex, totalPoints),
    };
  }, [dates, series]);

  const {chartWidth, givingPoints, mfpPoints, givingDots, mfpDots, yAxisTicks} =
    useMemo(() => {
      const giving = chartSeries.giving;
      const mfp = chartSeries.mfp;
      const len = Math.max(giving.length, mfp.length, chartSeries.dates.length, 2);
      const width = Math.max(920, len * POINT_GAP + PADDING_X * 2);
      const values = [...giving, ...mfp]
        .filter((v): v is number => typeof v === 'number')
        .map(v => (v < 0 ? 0 : v));
      const rawMax = Math.max(...values, 1);
      const yStep = getNiceStep(rawMax / 7);
      const max = Math.max(yStep, Math.ceil(rawMax / yStep) * yStep);
      const usableHeight = CHART_HEIGHT - PADDING_Y * 2;
      const toY = (value: number | null | undefined) => {
        if (typeof value !== 'number') return CHART_HEIGHT - PADDING_Y;
        const normalized = value / max;
        return CHART_HEIGHT - PADDING_Y - normalized * usableHeight;
      };
      const toPoints = (valuesArr: Array<number | null>) =>
        valuesArr
          .map((value, idx) => `${PADDING_X + idx * POINT_GAP},${toY(value)}`)
          .join(' ');

      const toDots = (valuesArr: Array<number | null>) =>
        valuesArr
          .map((value, idx) =>
            typeof value === 'number'
              ? {
                  key: `${idx}-${value}`,
                  cx: PADDING_X + idx * POINT_GAP,
                  cy: toY(value),
                }
              : null,
          )
          .filter(
            (
              dot,
            ): dot is {
              key: string;
              cx: number;
              cy: number;
            } => dot !== null,
          );

      const tickCount = Math.max(1, Math.round(max / yStep));
      const ticks = Array.from({length: tickCount + 1}, (_, idx) => {
        const value = max - idx * yStep;
        const ratio = max === 0 ? 0 : value / max;
        const y = CHART_HEIGHT - PADDING_Y - ratio * usableHeight;
        return {value, y};
      });

      return {
        chartWidth: width,
        givingPoints: toPoints(giving),
        mfpPoints: toPoints(mfp),
        givingDots: toDots(giving),
        mfpDots: toDots(mfp),
        yAxisTicks: ticks,
      };
    }, [chartSeries]);

  const xAxisLabels = useMemo(() => {
    if (!chartSeries.dates.length) {
      return [];
    }

    const labels = [];
    for (let i = 0; i < chartSeries.dates.length; i += X_TICK_EVERY) {
      labels.push({
        index: i,
        label: formatWeekEndLabel(chartSeries.dates[i] ?? '', selectedLanguage || 'en'),
      });
    }
    return labels;
  }, [chartSeries.dates, selectedLanguage]);

  const formatAxisValue = (value: number) => {
    return Math.round(value).toLocaleString(selectedLanguage || 'en');
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('churchGivingChart')} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : !series ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.infoText, {color: C.textSecondary}]}>
              {t('noDataFound')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator>
            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              <View style={styles.headerRow}>
                <Text style={[styles.churchInfoValue, {color: C.textPrimary}]}>
                  {series.church_name}
                </Text>
                <Text style={[styles.chartTitle, {color: C.textSecondary}]}>
                  {t('givingLast12Months')}
                </Text>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, {backgroundColor: GIVING_COLOR}]} />
                    <Text style={[styles.legendLabel, {color: C.textSecondary}]}>
                      {t('tithesAndOfferingsLabel')}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, {backgroundColor: MFP_COLOR}]} />
                    <Text style={[styles.legendLabel, {color: C.textSecondary}]}>
                      {t('missionsMfpGivingLabel')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.chartRow}>
                <View style={styles.yAxisWrap}>
                  {yAxisTicks.map(tick => (
                    <View
                      key={`${tick.value}-${tick.y}`}
                      style={[
                        styles.yAxisTickWrap,
                        {top: tick.y - ms(7)},
                      ]}>
                      <Text style={[styles.yAxisLabel, {color: C.textSecondary}]}>
                        {formatAxisValue(tick.value)}
                      </Text>
                    </View>
                  ))}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator
                  minimumZoomScale={1}
                  maximumZoomScale={3}
                  pinchGestureEnabled
                  bouncesZoom>
                  <View style={{width: chartWidth}}>
                    <Svg width={chartWidth} height={CHART_HEIGHT}>
                      {yAxisTicks.map(tick => (
                        <Line
                          key={`grid-${tick.value}-${tick.y}`}
                          x1={PADDING_X}
                          y1={tick.y}
                          x2={chartWidth - PADDING_X}
                          y2={tick.y}
                          stroke={C.inputBorder}
                          strokeWidth={0.8}
                          opacity={0.6}
                        />
                      ))}
                      {xAxisLabels.map(item => (
                        <Line
                          key={`x-grid-${item.index}`}
                          x1={PADDING_X + item.index * POINT_GAP}
                          y1={PADDING_Y}
                          x2={PADDING_X + item.index * POINT_GAP}
                          y2={CHART_HEIGHT - PADDING_Y}
                          stroke={C.inputBorder}
                          strokeWidth={0.8}
                          opacity={0.3}
                        />
                      ))}
                      <Line
                        x1={PADDING_X}
                        y1={CHART_HEIGHT - PADDING_Y}
                        x2={chartWidth - PADDING_X}
                        y2={CHART_HEIGHT - PADDING_Y}
                        stroke={C.inputBorder}
                        strokeWidth={1}
                      />
                      <Line
                        x1={PADDING_X}
                        y1={PADDING_Y}
                        x2={PADDING_X}
                        y2={CHART_HEIGHT - PADDING_Y}
                        stroke={C.inputBorder}
                        strokeWidth={1}
                      />
                      <Polyline
                        points={givingPoints}
                        fill="none"
                        stroke={GIVING_COLOR}
                        strokeWidth={2}
                      />
                      <Polyline
                        points={mfpPoints}
                        fill="none"
                        stroke={MFP_COLOR}
                        strokeWidth={2}
                      />
                      {givingDots.map(dot => (
                        <Circle
                          key={`giving-dot-${dot.key}`}
                          cx={dot.cx}
                          cy={dot.cy}
                          r={2}
                          fill={GIVING_COLOR}
                        />
                      ))}
                      {mfpDots.map(dot => (
                        <Circle
                          key={`mfp-dot-${dot.key}`}
                          cx={dot.cx}
                          cy={dot.cy}
                          r={2}
                          fill={MFP_COLOR}
                        />
                      ))}
                    </Svg>

                    <View style={styles.xAxisContainer}>
                      {xAxisLabels.map(item => (
                        <View
                          key={`${item.index}-${item.label}`}
                          style={[
                            styles.xAxisLabelWrap,
                            {left: PADDING_X + item.index * POINT_GAP},
                          ]}>
                          <View
                            style={[
                              styles.xAxisTick,
                              {backgroundColor: C.inputBorder},
                            ]}
                          />
                          <Text
                            style={[styles.xAxisLabel, {color: C.textSecondary}]}>
                            {item.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(20),
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: fs(14),
  },
  chartTitle: {
    fontSize: fs(12),
    fontWeight: '600',
    lineHeight: fs(16),
    marginBottom: ms(10),
  },
  headerRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: ms(14),
  },
  churchInfoLabel: {
    fontSize: fs(11),
    fontWeight: '600',
    marginBottom: ms(2),
  },
  churchInfoValue: {
    fontSize: fs(13),
    fontWeight: '700',
    lineHeight: fs(24),
    marginBottom: ms(4),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginHorizontal: -ms(4),
    rowGap: ms(8),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    marginHorizontal: ms(4),
    paddingVertical: ms(2),
  },
  legendDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: rs(10),
    marginRight: ms(6),
    marginTop: ms(2),
  },
  legendLabel: {
    fontSize: fs(12),
    lineHeight: fs(16),
    flexShrink: 1,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisWrap: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
    marginRight: 0,
  },
  yAxisTickWrap: {
    position: 'absolute',
    right: 0,
  },
  yAxisLabel: {
    fontSize: fs(9),
  },
  xAxisContainer: {
    position: 'relative',
    height: ms(54),
    marginTop: ms(2),
  },
  xAxisLabelWrap: {
    position: 'absolute',
    top: 0,
    width: ms(96),
    marginLeft: -ms(48),
    alignItems: 'center',
  },
  xAxisTick: {
    width: 1,
    height: ms(7),
    marginBottom: ms(3),
  },
  xAxisLabel: {
    fontSize: fs(9),
    transform: [{rotate: '-22deg'}],
    textAlign: 'center',
    width: '100%',
  },
});
