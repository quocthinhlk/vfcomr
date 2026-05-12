import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {Circle, G, Line, Polyline, Text as SvgText} from 'react-native-svg';
import {useFocusEffect} from '@react-navigation/native';
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

const CHART_HEIGHT = 220;
/** Space below x-axis line before rotated labels begin (keeps text off the axis line). */
const X_LABEL_START_BELOW_AXIS = ms(22);
/** Extra canvas height for −45° labels (below chart + clearance). */
const X_LABEL_AREA = ms(118) + X_LABEL_START_BELOW_AXIS;
const SVG_TOTAL_HEIGHT = CHART_HEIGHT + X_LABEL_AREA;
const POINT_GAP = 10;
const PADDING_X = 20;
const PADDING_Y = 18;
const Y_AXIS_WIDTH = 34;
const DISPLAY_WEEKS = 104;
const X_TICK_EVERY = 8;
const LINE_COLOR = '#c33434';

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

const formatShortDate = (isoDate: string, locale: string) => {
  const s = isoDate.trim();
  const parts = s.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0]!, 10);
    const mo = parseInt(parts[1]!, 10) - 1;
    const d = parseInt(parts[2]!, 10);
    if (Number.isFinite(y) && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      const local = new Date(y, mo, d);
      return local.toLocaleDateString(locale || 'en', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });
    }
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(locale || 'en', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
};

export default function OverseerChurchAttendanceChartScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [graphTitle, setGraphTitle] = useState('');
  const [points, setPoints] = useState<OverseerAttendancePoint[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOverseerIndicators();
      const graph = data?.attendance_graph;
      setGraphTitle(graph?.graph_title?.trim() || '');
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

  const {chartWidth, pointCount, polylinePoints, dotCoords, yTicks, xLabels} = useMemo(() => {
    const len = Math.max(points.length, 2);
    /** Band per week; x at band center so dots align with vertical grid lines. */
    const width = Math.max(640, PADDING_X * 2 + len * POINT_GAP);
    const values = points.map(p => (typeof p.attendance === 'number' ? p.attendance : 0));
    const rawMax = Math.max(...values, 1);
    const yStep = getNiceStep(rawMax / 7);
    const max = Math.max(yStep, Math.ceil(rawMax / yStep) * yStep);
    const usableHeight = CHART_HEIGHT - PADDING_Y * 2;
    const plotBottomY = CHART_HEIGHT - PADDING_Y;
    const getX = (i: number) => PADDING_X + POINT_GAP / 2 + i * POINT_GAP;
    const getY = (v: number) => plotBottomY - (v / max) * usableHeight;

    const pairs: string[] = [];
    const dots: {cx: number; cy: number; key: string}[] = [];
    values.forEach((v, i) => {
      pairs.push(`${getX(i)},${getY(v)}`);
      dots.push({cx: getX(i), cy: getY(v), key: `${i}-${v}`});
    });

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
    for (let i = 0; i < points.length; i += X_TICK_EVERY) {
      labels.push({
        index: i,
        label: formatShortDate(points[i]?.date ?? '', selectedLanguage || 'en'),
      });
    }

    return {
      chartWidth: width,
      pointCount: len,
      polylinePoints: pairs.join(' '),
      dotCoords: dots,
      yTicks: ticks,
      xLabels: labels,
    };
  }, [points, selectedLanguage]);

  const plotBottomY = CHART_HEIGHT - PADDING_Y;

  const formatAxisValue = (value: number) =>
    Math.round(value).toLocaleString(selectedLanguage || 'en');

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('attendanceGraph') || 'Attendance Graph'} />

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
            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              {graphTitle ? (
                <Text style={[styles.subtitle, {color: C.textSecondary}]} numberOfLines={2}>
                  {graphTitle}
                </Text>
              ) : null}
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
                      <Polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={LINE_COLOR}
                        strokeWidth={2}
                      />
                      {dotCoords.map(dot => (
                        <Circle
                          key={dot.key}
                          cx={dot.cx}
                          cy={dot.cy}
                          r={1.8}
                          fill={LINE_COLOR}
                        />
                      ))}
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
                            <G transform={`translate(${tx}, ${labelBaseY}) rotate(-45)`}>
                              <SvgText
                                x={0}
                                y={0}
                                fill={C.textPrimary}
                                fontSize={fs(9)}
                                fontWeight="500"
                                textAnchor="middle"
                                alignmentBaseline="middle">
                                {item.label}
                              </SvgText>
                            </G>
                          </React.Fragment>
                        );
                      })}
                    </Svg>
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
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
  },
  subtitle: {
    fontSize: fs(12),
    marginBottom: ms(10),
    lineHeight: fs(16),
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
