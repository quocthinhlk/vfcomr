import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
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

const CHART_HEIGHT = 220;
const POINT_GAP = 24;
const PADDING_X = 20;
const PADDING_Y = 18;
const Y_AXIS_WIDTH = 26;
const DISPLAY_WEEKS = 52;
const X_TICK_EVERY = 4;

const WORSHIP_COLOR = '#c33434';
const CELL_GROUP_COLOR = '#f5a623';
const PRAYER_COLOR = '#6f6b64';
const GT_LIW_COLOR = '#3d87c7';

type ChartDot = {
  key: string;
  cx: number;
  cy: number;
};

type ChartSeriesMeta = {
  key: 'attendance' | 'cellGroups' | 'prayerMeetings' | 'gtLiw';
  color: string;
  label: string;
  values: Array<number | null>;
};

type Props = {
  churchId: number;
  refreshKey: number;
  scrollable?: boolean;
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

const buildLineSegments = (
  values: Array<number | null>,
  getX: (index: number) => number,
  getY: (value: number) => number,
) => {
  const segments: string[] = [];
  let currentSegment: string[] = [];

  values.forEach((value, index) => {
    if (typeof value === 'number') {
      currentSegment.push(`${getX(index)},${getY(value)}`);
      return;
    }

    if (currentSegment.length > 1) {
      segments.push(currentSegment.join(' '));
    }
    currentSegment = [];
  });

  if (currentSegment.length > 1) {
    segments.push(currentSegment.join(' '));
  }

  return segments;
};

const buildDots = (
  values: Array<number | null>,
  getX: (index: number) => number,
  getY: (value: number) => number,
) =>
  values
    .map((value, index) =>
      typeof value === 'number'
        ? {
            key: `${index}-${value}`,
            cx: getX(index),
            cy: getY(value),
          }
        : null,
    )
    .filter((dot): dot is ChartDot => dot !== null);

export function ChurchAttendanceChartPanel({
  churchId,
  refreshKey,
  scrollable = false,
}: Props) {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<ChurchGivingGraphSeries | null>(null);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const result = await getChurchGivingGraph({
          churchId,
          period: '2y',
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
  }, [churchId, refreshKey]);

  const chartSeries = useMemo(() => {
    const totalPoints = Math.max(
      series?.attendance_values?.length ?? 0,
      series?.cell_group_values?.length ?? 0,
      series?.prayer_meeting_values?.length ?? 0,
      series?.liw_class_values?.length ?? 0,
      dates.length,
    );
    const startIndex = Math.max(0, totalPoints - DISPLAY_WEEKS);

    return {
      dates: dates.slice(startIndex, totalPoints),
      attendance: (series?.attendance_values ?? []).slice(startIndex, totalPoints),
      cellGroups: (series?.cell_group_values ?? []).slice(startIndex, totalPoints),
      prayerMeetings: (series?.prayer_meeting_values ?? []).slice(
        startIndex,
        totalPoints,
      ),
      gtLiw: (series?.liw_class_values ?? []).slice(startIndex, totalPoints),
    };
  }, [dates, series]);

  const chartMeta = useMemo<ChartSeriesMeta[]>(
    () => [
      {
        key: 'attendance',
        color: WORSHIP_COLOR,
        label: t('worshipService'),
        values: chartSeries.attendance,
      },
      {
        key: 'cellGroups',
        color: CELL_GROUP_COLOR,
        label: t('cellGroups'),
        values: chartSeries.cellGroups,
      },
      {
        key: 'prayerMeetings',
        color: PRAYER_COLOR,
        label: t('prayerMeetings'),
        values: chartSeries.prayerMeetings,
      },
      {
        key: 'gtLiw',
        color: GT_LIW_COLOR,
        label: t('gtAndLiwClasses'),
        values: chartSeries.gtLiw,
      },
    ],
    [chartSeries, t],
  );

  const {chartWidth, yTicks, renderedSeries} = useMemo(() => {
    const len = Math.max(chartSeries.dates.length, 2);
    const width = Math.max(920, len * POINT_GAP + PADDING_X * 2);
    const values = chartMeta
      .flatMap(item => item.values)
      .filter((value): value is number => typeof value === 'number' && value >= 0);
    const rawMax = Math.max(...values, 1);
    const yStep = getNiceStep(rawMax / 7);
    const max = Math.max(yStep, Math.ceil(rawMax / yStep) * yStep);
    const usableHeight = CHART_HEIGHT - PADDING_Y * 2;
    const getX = (index: number) => PADDING_X + index * POINT_GAP;
    const getY = (value: number) =>
      CHART_HEIGHT - PADDING_Y - (value / max) * usableHeight;

    const ticks = Array.from({length: Math.round(max / yStep) + 1}, (_, idx) => {
      const value = max - idx * yStep;
      return {
        value,
        y: getY(value),
      };
    });

    return {
      chartWidth: width,
      yTicks: ticks,
      renderedSeries: chartMeta.map(item => ({
        ...item,
        segments: buildLineSegments(item.values, getX, getY),
        dots: buildDots(item.values, getX, getY),
      })),
    };
  }, [chartMeta, chartSeries.dates.length]);

  const xAxisLabels = useMemo(() => {
    if (!chartSeries.dates.length) {
      return [];
    }

    const labels = [];
    for (let i = 0; i < chartSeries.dates.length; i += X_TICK_EVERY) {
      labels.push({
        index: i,
        label: formatWeekEndLabel(
          chartSeries.dates[i] ?? '',
          selectedLanguage || 'en',
        ),
      });
    }
    return labels;
  }, [chartSeries.dates, selectedLanguage]);

  const formatAxisValue = (value: number) => {
    return Math.round(value).toLocaleString(selectedLanguage || 'en');
  };

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
        <Text style={[styles.churchInfoValue, {color: C.textPrimary}]}>
          {series.church_name}
        </Text>
        <Text style={[styles.chartTitle, {color: C.textSecondary}]}>
          {t('attendanceLast12Months')}
        </Text>
      </View>

      <View style={styles.legendRow}>
        {chartMeta.map(item => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: item.color}]} />
            <Text style={[styles.legendLabel, {color: C.textSecondary}]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.chartRow}>
        <View style={styles.yAxisWrap}>
          {yTicks.map(tick => (
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
          <View style={{width: chartWidth}}>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              {yTicks.map(tick => (
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
              {renderedSeries.map(item =>
                item.segments.map((points, index) => (
                  <Polyline
                    key={`${item.key}-segment-${index}`}
                    points={points}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={2}
                  />
                )),
              )}
              {renderedSeries.map(item =>
                item.dots.map(dot => (
                  <Circle
                    key={`${item.key}-dot-${dot.key}`}
                    cx={dot.cx}
                    cy={dot.cy}
                    r={2}
                    fill={item.color}
                  />
                )),
              )}
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
    marginBottom: ms(10),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: ms(12),
    marginBottom: ms(6),
  },
  legendDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: rs(10),
    marginRight: ms(6),
  },
  legendLabel: {
    fontSize: fs(12),
    marginRight: ms(12),
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
