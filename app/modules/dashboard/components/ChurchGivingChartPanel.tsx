import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View, ViewStyle} from 'react-native';
import {Text} from '@ui-kitten/components';
import Svg, {Circle, Line, Polyline} from 'react-native-svg';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getChurchGivingGraph,
  ChurchGivingGraphSeries,
} from '../services/churchGivingChart.service';
import {ChartPointTooltip} from './ChartPointTooltip';
import {
  formatWeekEndLabel,
  formatWeekTooltipDate,
} from '../utils/chartWeekLabel';
import {
  ChartDot,
  SelectedChartPoint,
  toggleChartPointSelection,
} from '../utils/chartPointSelection';

const CHART_HEIGHT = 220;
const POINT_GAP = 24;
const PADDING_X = 20;
const PADDING_Y = 18;
const Y_AXIS_WIDTH = 26;
const DISPLAY_WEEKS = 52;
const X_TICK_EVERY = 4;
const GIVING_COLOR = '#9b6bb0';
const MFP_COLOR = '#d29a3a';

type Props = {
  churchId: number;
  containerStyle?: ViewStyle;
  refreshKey: number;
  scrollable?: boolean;
  period?: '1y' | '2y' | '3y';
  displayWeeks?: number;
  titleKey?: string;
};

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

export function ChurchGivingChartPanel({
  churchId,
  containerStyle = {},
  refreshKey,
  scrollable = false,
  period,
  displayWeeks = DISPLAY_WEEKS,
  titleKey = 'givingLast12Months',
}: Props) {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<ChurchGivingGraphSeries | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SelectedChartPoint | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const result = await getChurchGivingGraph({
          churchId,
          period,
        });
        if (cancelled) {
          return;
        }
        setDates(result?.dates ?? []);
        const preferred =
          result?.data?.find(item => item.church_id === churchId) ??
          result?.data?.find(item => item.church_id !== 0) ??
          null;
        setSeries(preferred);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [churchId, refreshKey, period]);

  const chartSeries = useMemo(() => {
    const giving = (series?.giving_in_usd ?? []).map(value =>
      typeof value === 'number' ? Math.max(0, value) : null,
    );
    const mfp = (series?.mfp_giving_in_usd ?? []).map(value =>
      typeof value === 'number' ? Math.max(0, value) : null,
    );
    const totalPoints = Math.max(giving.length, mfp.length, dates.length);
    const startIndex = Math.max(0, totalPoints - displayWeeks);

    return {
      giving: giving.slice(startIndex, totalPoints),
      mfp: mfp.slice(startIndex, totalPoints),
      dates: dates.slice(startIndex, totalPoints),
    };
  }, [dates, displayWeeks, series]);

  useEffect(() => {
    setSelectedPoint(null);
  }, [churchId, refreshKey, period, dates, series, displayWeeks]);

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
                  index: idx,
                  value,
                }
              : null,
          )
          .filter((dot): dot is ChartDot => dot !== null);

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

  const givingDotSeries = useMemo(
    () => [
      {
        key: 'giving',
        color: GIVING_COLOR,
        label: t('tithesAndOfferingsLabel'),
        dots: givingDots,
      },
      {
        key: 'mfp',
        color: MFP_COLOR,
        label: t('missionsMfpGivingLabel'),
        dots: mfpDots,
      },
    ],
    [givingDots, mfpDots, t],
  );

  const formatAxisValue = (value: number) => {
    return Math.round(value).toLocaleString(selectedLanguage || 'en');
  };

  const handleDotPress = (
    seriesKey: string,
    seriesName: string,
    color: string,
    dot: ChartDot,
  ) => {
    setSelectedPoint(prev =>
      toggleChartPointSelection(prev, {
        seriesKey,
        seriesName,
        color,
        weekIndex: dot.index,
        value: dot.value,
        cx: dot.cx,
        cy: dot.cy,
      }),
    );
  };

  const selectedTooltipText = useMemo(() => {
    if (!selectedPoint) {
      return '';
    }
    const rawDate = chartSeries.dates[selectedPoint.weekIndex] ?? '';
    const weekLabel = formatWeekTooltipDate(rawDate, selectedLanguage || 'en');
    return `${selectedPoint.seriesName}, ${t('week')}: ${weekLabel}, ${t('giving')}: ${formatAxisValue(selectedPoint.value)}`;
  }, [chartSeries.dates, selectedLanguage, selectedPoint, t]);

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

  if (loading) {
    return (
      <View style={scrollable ? styles.loadingWrap : styles.embeddedLoading}>
        <ActivityIndicator color={COLORS.mainColor} />
      </View>
    );
  }

  if (!series) {
    return (
      <View style={scrollable ? styles.loadingWrap : styles.embeddedLoading}>
        <Text style={[styles.infoText, {color: C.textSecondary}]}>
          {t('noDataFound')}
        </Text>
      </View>
    );
  }

  const chartCard = (
    <View
      style={[
        styles.card,
        {backgroundColor: C.surface, borderColor: C.inputBorder},
      ]}>
      <View style={styles.headerRow}>
        <Text style={[styles.chartTitle, {color: C.textSecondary}]}>
          {t(titleKey as any)}
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
              style={[styles.yAxisTickWrap, {top: tick.y - ms(7)}]}>
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
          <View style={[styles.chartCanvas, {width: chartWidth}]}>
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
                  stroke={COLORS.mainColor}
                  strokeWidth={1}
                  opacity={0.25}
                  strokeDasharray="3,3"
                />
              ))}
              <Line
                x1={PADDING_X}
                y1={CHART_HEIGHT - PADDING_Y}
                x2={chartWidth - PADDING_X}
                y2={CHART_HEIGHT - PADDING_Y}
                stroke={C.inputBorder}
                strokeWidth={1.5}
              />
              <Line
                x1={PADDING_X}
                y1={PADDING_Y}
                x2={PADDING_X}
                y2={CHART_HEIGHT - PADDING_Y}
                stroke={C.inputBorder}
                strokeWidth={1.5}
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
              {givingDotSeries.map(item =>
                item.dots.map(dot => {
                  const isSelected =
                    selectedPoint?.seriesKey === item.key &&
                    selectedPoint?.weekIndex === dot.index;

                  return (
                    <React.Fragment key={`${item.key}-dot-${dot.key}`}>
                      {isSelected ? (
                        <Circle
                          cx={dot.cx}
                          cy={dot.cy}
                          r={12}
                          fill={item.color}
                          opacity={0.22}
                        />
                      ) : null}
                      <Circle
                        cx={dot.cx}
                        cy={dot.cy}
                        r={isSelected ? 3.5 : 2}
                        fill={item.color}
                      />
                      <Circle
                        cx={dot.cx}
                        cy={dot.cy}
                        r={14}
                        fill="transparent"
                        onPress={() =>
                          handleDotPress(item.key, item.label, item.color, dot)
                        }
                      />
                    </React.Fragment>
                  );
                }),
              )}
            </Svg>
            {selectedPoint ? (
              <ChartPointTooltip
                cx={selectedPoint.cx}
                cy={selectedPoint.cy}
                text={selectedTooltipText}
                chartWidth={chartWidth}
                chartHeight={CHART_HEIGHT}
              />
            ) : null}

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
                      {backgroundColor: COLORS.mainColor},
                    ]}
                  />
                  <Text style={[styles.xAxisLabel, {color: C.textPrimary}]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator>
        {chartCard}
      </ScrollView>
    );
  }

  return chartCard;
}

const styles = StyleSheet.create({
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
  embeddedLoading: {
    minHeight: ms(160),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(24),
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
  chartCanvas: {
    position: 'relative',
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
    height: ms(76),
    marginTop: ms(2),
  },
  xAxisLabelWrap: {
    position: 'absolute',
    top: 0,
    width: ms(90),
    marginLeft: -ms(45),
    alignItems: 'center',
  },
  xAxisTick: {
    width: 1.5,
    height: ms(8),
    marginBottom: ms(2),
  },
  xAxisLabel: {
    fontSize: fs(9.5),
    fontWeight: '500',
    transform: [{rotate: '-45deg'}, {translateY: ms(16)}],
    textAlign: 'center',
    width: '100%',
  },
});
