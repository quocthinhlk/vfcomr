import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {Circle, Line, Polyline, Text as SvgText} from 'react-native-svg';
import {useFocusEffect, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getOverseerIndicators,
  OverseerAttendancePoint,
} from '../services/overseerIndicators.service';
import {getChurchGivingGraph} from '../services/churchGivingChart.service';
import {useDashboardChartChurchId} from '../hooks/useDashboardChartChurchId';
import {ChartPointTooltip} from '../components/ChartPointTooltip';
import {
  ChartDot,
  SelectedChartPoint,
  toggleChartPointSelection,
} from '../utils/chartPointSelection';

const CHART_HEIGHT = 220;
/** Space below x-axis line before week labels begin. */
const X_LABEL_START_BELOW_AXIS = ms(16);
/** Canvas height for week-number labels. */
const X_LABEL_AREA = ms(36) + X_LABEL_START_BELOW_AXIS;
const SVG_TOTAL_HEIGHT = CHART_HEIGHT + X_LABEL_AREA;
const POINT_GAP = 12;
const PADDING_X = 20;
const PADDING_Y = 18;
const Y_AXIS_WIDTH = 34;
const DISPLAY_WEEKS = 52;
const X_TICK_EVERY = 5;
const TIP_ICON = require('../../../assets/images/icon/tip.png');

const CURRENT_YEAR_COLOR = COLORS.mainColor;
const LAST_YEAR_COLOR = '#9b6bb0';
const YEAR_BEFORE_LAST_COLOR = '#d29a3a';

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

const buildLineSegments = (
  values: Array<number | null>,
  getX: (index: number) => number,
  getY: (value: number) => number,
) => {
  const segments: string[] = [];
  let current: string[] = [];

  values.forEach((value, index) => {
    if (typeof value === 'number') {
      current.push(`${getX(index)},${getY(value)}`);
      return;
    }
    if (current.length > 1) {
      segments.push(current.join(' '));
    }
    current = [];
  });

  if (current.length > 1) {
    segments.push(current.join(' '));
  }

  return segments;
};

export default function OverseerChurchAttendanceChartScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const route = useRoute<any>();
  const routeChurchId =
    typeof route?.params?.churchId === 'number' ? route.params.churchId : undefined;
  const {churchId, refreshKey} = useDashboardChartChurchId(routeChurchId);
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState('');
  const [points, setPoints] = useState<OverseerAttendancePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SelectedChartPoint | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOverseerIndicators();
      const graph = data?.attendance_graph;
      const list = graph?.data;
      const raw = Array.isArray(list) ? [...list] : [];
      raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const start = Math.max(0, raw.length - DISPLAY_WEEKS);
      setPoints(raw.slice(start));
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    let cancelled = false;

    const loadChurchName = async () => {
      try {
        const result = await getChurchGivingGraph({churchId});
        if (cancelled) {
          return;
        }
        const preferred =
          result?.data?.find(item => item.church_id === churchId) ??
          result?.data?.find(item => item.church_id !== 0) ??
          null;
        setChurchName(preferred?.church_name?.trim() ?? '');
      } catch {
        if (!cancelled) {
          setChurchName('');
        }
      }
    };

    loadChurchName();

    return () => {
      cancelled = true;
    };
  }, [churchId, refreshKey]);

  useEffect(() => {
    setSelectedPoint(null);
  }, [points]);

  const {chartWidth, pointCount, yTicks, xLabels, legend, seriesLines, seriesDots} =
    useMemo(() => {
      const empty = {
        chartWidth: 640,
        pointCount: 2,
        yTicks: [] as Array<{value: number; y: number}>,
        xLabels: [] as Array<{index: number; label: string}>,
        legend: [] as Array<{key: string; color: string; label: string}>,
        seriesLines: [] as Array<{key: string; color: string; segments: string[]}>,
        seriesDots: [] as Array<{
          key: string;
          color: string;
          label: string;
          dots: ChartDot[];
        }>,
      };

      if (!points.length) {
        return empty;
      }

      const years = Array.from(new Set(points.map(p => p.year).filter(y => typeof y === 'number'))).sort(
        (a, b) => a - b,
      );
      const currentYear = years[years.length - 1] ?? new Date().getFullYear();
      const lastYear = currentYear - 1;
      const yearBeforeLast = currentYear - 2;

      const byYearWeek = new Map<number, Map<number, OverseerAttendancePoint>>();
      points.forEach(p => {
        if (!byYearWeek.has(p.year)) {
          byYearWeek.set(p.year, new Map());
        }
        byYearWeek.get(p.year)!.set(p.week_number, p);
      });

      // X axis is weeks of year and should start at 0 next to Y-axis (0..51),
      // matching the sample chart axis style.
      const weekNumbers = Array.from({length: DISPLAY_WEEKS}, (_, i) => i);
      const len = Math.max(weekNumbers.length, 2);

      /** Band per week; x at band center so dots align with vertical grid lines. */
      const width = Math.max(720, PADDING_X * 2 + len * POINT_GAP);
      const plotBottomY = CHART_HEIGHT - PADDING_Y;

      const seriesMeta = [
        {
          key: 'currentYear',
          year: currentYear,
          color: CURRENT_YEAR_COLOR,
          label: `${t('currentYear') || 'Current Year'} (${currentYear})`,
        },
        {
          key: 'lastYear',
          year: lastYear,
          color: LAST_YEAR_COLOR,
          label: `${t('lastYear') || 'Last Year'} (${lastYear})`,
        },
        {
          key: 'yearBeforeLast',
          year: yearBeforeLast,
          color: YEAR_BEFORE_LAST_COLOR,
          label: `${t('yearBeforeLast') || 'Year Before Last'} (${yearBeforeLast})`,
        },
      ];

      const valuesBySeries = seriesMeta.map(meta =>
        weekNumbers.map(weekIndex => {
          const weekNum = weekIndex + 1; // API week_number is 1-based
          const point = byYearWeek.get(meta.year)?.get(weekNum);
          return typeof point?.attendance === 'number' ? point.attendance : null;
        }),
      );

      const allValues = valuesBySeries
        .flat()
        .filter((v): v is number => typeof v === 'number' && v >= 0);
      const rawMax = Math.max(...allValues, 1);
      const yStep = getNiceStep(rawMax / 7);
      const max = Math.max(yStep, Math.ceil(rawMax / yStep) * yStep);
      const usableHeight = CHART_HEIGHT - PADDING_Y * 2;
      const getX = (i: number) => PADDING_X + POINT_GAP / 2 + i * POINT_GAP;
      const getY = (v: number) => plotBottomY - (v / max) * usableHeight;

      const tickCount = Math.max(1, Math.round(max / yStep));
      const ticks = Array.from({length: tickCount + 1}, (_, idx) => {
        const value = max - idx * yStep;
        const ratio = max === 0 ? 0 : value / max;
        return {
          value,
          y: plotBottomY - ratio * usableHeight,
        };
      });

      const labels: {index: number; label: string}[] = [];
      for (let i = 0; i < weekNumbers.length; i += X_TICK_EVERY) {
        labels.push({
          index: i,
          label: String(weekNumbers[i] ?? ''),
        });
      }

      const lines = seriesMeta.map((meta, sIdx) => ({
        key: meta.key,
        color: meta.color,
        segments: buildLineSegments(valuesBySeries[sIdx]!, getX, getY),
      }));

      const dots = seriesMeta.map((meta, sIdx) => {
        const ds: ChartDot[] = [];
        valuesBySeries[sIdx]!.forEach((v, i) => {
          if (typeof v === 'number') {
            ds.push({
              cx: getX(i),
              cy: getY(v),
              key: `${meta.key}-${i}-${v}`,
              index: i,
              value: v,
            });
          }
        });
        return {key: meta.key, color: meta.color, label: meta.label, dots: ds};
      });

      return {
        chartWidth: width,
        pointCount: len,
        yTicks: ticks,
        xLabels: labels,
        legend: seriesMeta.map(m => ({key: m.key, color: m.color, label: m.label})),
        seriesLines: lines,
        seriesDots: dots,
      };
    }, [points, selectedLanguage, t]);

  const formatAxisValue = (value: number) =>
    Math.round(value).toLocaleString(selectedLanguage || 'en');

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
    return `${selectedPoint.seriesName}, ${t('week')}: ${selectedPoint.weekIndex}, ${t('chartTooltipAttendance')}: ${formatAxisValue(selectedPoint.value)}`;
  }, [selectedPoint, selectedLanguage, t]);

  const plotBottomY = CHART_HEIGHT - PADDING_Y;

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('attendanceChart') || 'Attendance Chart'} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : points.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.infoText, {color: C.textSecondary}]}>{t('noDataFound')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsHorizontalScrollIndicator>
            <View
              style={[
                styles.landscapeTip,
                {
                  backgroundColor: C.surface,
                  borderColor: C.inputBorder,
                },
              ]}>
              <View style={styles.landscapeTipRow}>
                <Image
                  source={TIP_ICON}
                  style={[styles.landscapeTipIcon, {tintColor: C.textSecondary}]}
                />
                <Text style={[styles.landscapeTipText, {color: C.textSecondary}]}>
                  {t('chartsLandscapeTip')}
                </Text>
              </View>
            </View>
            {churchName ? (
              <Text style={[styles.churchName, {color: C.textPrimary}]}>
                {churchName}
              </Text>
            ) : null}
            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              <View style={styles.legendRow}>
                {legend.map(item => (
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
                  <View style={[styles.chartCanvas, {width: chartWidth}]}>
                    <Svg width={chartWidth} height={SVG_TOTAL_HEIGHT}>
                      {Array.from({length: pointCount}, (_, i) => (
                        <Line
                          key={`week-v-${i}`}
                          x1={PADDING_X + POINT_GAP / 2 + i * POINT_GAP}
                          y1={PADDING_Y}
                          x2={PADDING_X + POINT_GAP / 2 + i * POINT_GAP}
                          y2={plotBottomY}
                          stroke={C.inputBorder}
                          strokeWidth={0.6}
                          opacity={0.18}
                        />
                      ))}
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
                      {xLabels.map(item => (
                        <Line
                          key={`x-grid-${item.index}`}
                          x1={PADDING_X + POINT_GAP / 2 + item.index * POINT_GAP}
                          y1={PADDING_Y}
                          x2={PADDING_X + POINT_GAP / 2 + item.index * POINT_GAP}
                          y2={plotBottomY}
                          stroke={COLORS.mainColor}
                          strokeWidth={1}
                          opacity={0.35}
                          strokeDasharray="4,4"
                        />
                      ))}
                      <Line
                        x1={PADDING_X}
                        y1={plotBottomY}
                        x2={chartWidth - PADDING_X}
                        y2={plotBottomY}
                        stroke={C.inputBorder}
                        strokeWidth={1.5}
                      />
                      <Line
                        x1={PADDING_X}
                        y1={PADDING_Y}
                        x2={PADDING_X}
                        y2={plotBottomY}
                        stroke={C.inputBorder}
                        strokeWidth={1.5}
                      />
                      {seriesLines.map(line =>
                        line.segments.map((segment, idx) => (
                          <Polyline
                            key={`line-${line.key}-${idx}`}
                            points={segment}
                            fill="none"
                            stroke={line.color}
                            strokeWidth={2}
                            opacity={0.95}
                          />
                        )),
                      )}
                      {seriesDots.map(series =>
                        series.dots.map(dot => {
                          const isSelected =
                            selectedPoint?.seriesKey === series.key &&
                            selectedPoint?.weekIndex === dot.index;

                          return (
                            <React.Fragment key={`dot-${series.key}-${dot.key}`}>
                              {isSelected ? (
                                <Circle
                                  cx={dot.cx}
                                  cy={dot.cy}
                                  r={12}
                                  fill={series.color}
                                  opacity={0.22}
                                />
                              ) : null}
                              <Circle
                                cx={dot.cx}
                                cy={dot.cy}
                                r={isSelected ? 3.5 : 1.8}
                                fill={series.color}
                              />
                              <Circle
                                cx={dot.cx}
                                cy={dot.cy}
                                r={14}
                                fill="transparent"
                                onPress={() =>
                                  handleDotPress(
                                    series.key,
                                    series.label,
                                    series.color,
                                    dot,
                                  )
                                }
                              />
                            </React.Fragment>
                          );
                        }),
                      )}
                      {xLabels.map(item => {
                        const tx = PADDING_X + POINT_GAP / 2 + item.index * POINT_GAP;
                        const labelBaseY = plotBottomY + X_LABEL_START_BELOW_AXIS;
                        return (
                          <React.Fragment key={`x-axis-${item.index}`}>
                            <Line
                              x1={tx}
                              y1={plotBottomY}
                              x2={tx}
                              y2={plotBottomY + ms(5)}
                              stroke={COLORS.mainColor}
                              strokeWidth={1.5}
                            />
                            <SvgText
                              x={tx}
                              y={labelBaseY}
                              fill={C.textPrimary}
                              fontSize={fs(10)}
                              fontWeight="500"
                              textAnchor="middle"
                              alignmentBaseline="middle">
                              {item.label}
                            </SvgText>
                          </React.Fragment>
                        );
                      })}
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
  scroll: {flex: 1},
  scrollContent: {paddingTop: ms(8), paddingBottom: ms(20)},
  landscapeTip: {
    marginBottom: ms(12),
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    borderRadius: rs(8),
    borderWidth: StyleSheet.hairlineWidth,
  },
  landscapeTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  landscapeTipIcon: {
    width: ms(14),
    height: ms(14),
    resizeMode: 'contain',
    marginRight: ms(6),
    marginTop: ms(1),
  },
  landscapeTipText: {
    fontSize: fs(12),
    lineHeight: fs(18),
    fontStyle: 'italic',
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: ms(10),
    marginTop: ms(2),
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
    lineHeight: fs(16),
  },
  churchName: {
    fontSize: fs(13),
    fontWeight: '700',
    lineHeight: fs(20),
    marginBottom: ms(8),
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {fontSize: fs(14)},
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartCanvas: {
    position: 'relative',
  },
  yAxisWrap: {
    width: Y_AXIS_WIDTH,
    height: SVG_TOTAL_HEIGHT,
    position: 'relative',
  },
  yAxisTickWrap: {
    position: 'absolute',
    right: 0,
  },
  yAxisLabel: {
    fontSize: fs(9),
  },
});
