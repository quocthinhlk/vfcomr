import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import {useFocusEffect} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getOverseerChartHeaderInfo,
  getOverseerIndicators,
  OverseerAttendancePoint,
} from '../services/overseerIndicators.service';
import {ChartPointTooltip} from '../components/ChartPointTooltip';
import {OverseerChartTitleBlock} from '../components/OverseerChartTitleBlock';
import {
  ChartDot,
  SelectedChartPoint,
  toggleChartPointSelection,
} from '../utils/chartPointSelection';
import {
  buildMonthAxisLabels,
  formatCompactChartDate,
  formatOverseerReportDate,
  formatReportingPeriod,
  pickGraphHeaderValue,
} from '../utils/overseerChartHeader';
import {
  CHART_SAVE_PERMISSION_DENIED,
  saveSvgChartAsJpeg,
} from '../utils/saveChartJpeg';

const CHART_HEIGHT = 220;
/** Space below x-axis line before month labels begin. */
const X_LABEL_START_BELOW_AXIS = ms(16);
const X_LABEL_AREA = ms(36) + X_LABEL_START_BELOW_AXIS;
const SVG_TOTAL_HEIGHT = CHART_HEIGHT + X_LABEL_AREA;
const POINT_GAP = 12;
const PADDING_X = 20;
const PADDING_Y = 18;
const Y_AXIS_WIDTH = 34;
const DISPLAY_WEEKS = 52;
const TIP_ICON = require('../../../assets/images/icon/tip.png');

/** OMR 3.0 attendance overlay: current / last / year-before-last. */
const CURRENT_YEAR_COLOR = '#c33434';
const LAST_YEAR_COLOR = '#3d87c7';
const YEAR_BEFORE_LAST_COLOR = '#8a8a8a';

const EXPORT_PAD = 16;
const EXPORT_TITLE_H = 92;
const EXPORT_LEGEND_H = 30;
const EXPORT_Y_AXIS = 42;
const EXPORT_AXIS_CAPTION = 22;

const getNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 2.5) {
    return 2.5 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
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
  const exportSvgRef = useRef<Svg>(null);
  const [loading, setLoading] = useState(true);
  // Offline / server error must not look like "No data found".
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [showExportSvg, setShowExportSvg] = useState(false);
  const capturingRef = useRef(false);
  const [points, setPoints] = useState<OverseerAttendancePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SelectedChartPoint | null>(
    null,
  );
  const [pastorName, setPastorName] = useState('');
  const [regionNation, setRegionNation] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getOverseerIndicators();
      const graph = data?.attendance_graph;
      const list = graph?.data;
      const raw = Array.isArray(list) ? [...list] : [];
      raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const yearsInData = raw
        .map(p => Number(p.year) || 0)
        .filter(y => y > 0);
      const currentYear = yearsInData.length
        ? Math.max(...yearsInData)
        : new Date().getFullYear();
      const minYear = currentYear - 2;
      const filtered = raw.filter(p => Number(p.year) >= minYear);
      setPoints(filtered);
      setPastorName(pickGraphHeaderValue(graph, ['pastor_name', 'for_pastor']));
      setRegionNation(
        pickGraphHeaderValue(graph, ['region_nation', 'region', 'nation']),
      );
      setReportDate(pickGraphHeaderValue(graph, ['report_date']));
      setReportingPeriod(
        pickGraphHeaderValue(graph, ['reporting_period', 'period']) ||
          formatReportingPeriod([minYear, currentYear]),
      );
    } catch (e) {
      setPoints([]);
      setLoadError(e);
    } finally {
      setLoading(false);
    }

    try {
      const header = await getOverseerChartHeaderInfo();
      setPastorName(prev => prev || header.pastorName);
      setRegionNation(prev => prev || header.regionNation);
    } catch {
      // Chart can render without header metadata.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

      const years = Array.from(
        new Set(points.map(p => p.year).filter(y => typeof y === 'number')),
      ).sort((a, b) => a - b);
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

      const weekNumbers = Array.from({length: DISPLAY_WEEKS}, (_, i) => i);
      const len = Math.max(weekNumbers.length, 2);

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
          const weekNum = weekIndex + 1;
          const point = byYearWeek.get(meta.year)?.get(weekNum);
          return typeof point?.attendance === 'number' ? point.attendance : null;
        }),
      );

      const datesByWeek: Array<string | undefined> = weekNumbers.map(weekIndex => {
        const weekNum = weekIndex + 1;
        const fromCurrent = byYearWeek.get(currentYear)?.get(weekNum)?.date;
        if (fromCurrent) {
          return fromCurrent;
        }
        const fromLast = byYearWeek.get(lastYear)?.get(weekNum)?.date;
        if (fromLast) {
          return fromLast;
        }
        return byYearWeek.get(yearBeforeLast)?.get(weekNum)?.date;
      });

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

      const labels = buildMonthAxisLabels(datesByWeek, selectedLanguage || 'en');

      const lines = seriesMeta.map((meta, sIdx) => ({
        key: meta.key,
        color: meta.color,
        segments: buildLineSegments(valuesBySeries[sIdx]!, getX, getY),
      }));

      const dots = seriesMeta.map((meta, sIdx) => {
        const ds: ChartDot[] = [];
        valuesBySeries[sIdx]!.forEach((v, i) => {
          if (typeof v === 'number') {
            const weekNum = i + 1;
            const isoDate = byYearWeek.get(meta.year)?.get(weekNum)?.date;
            ds.push({
              cx: getX(i),
              cy: getY(v),
              key: `${meta.key}-${i}-${v}`,
              index: i,
              value: v,
              label: isoDate
                ? formatCompactChartDate(isoDate, selectedLanguage || 'en')
                : undefined,
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

  const formatAxisValue = useCallback(
    (value: number) => Math.round(value).toLocaleString(selectedLanguage || 'en'),
    [selectedLanguage],
  );

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
        label: dot.label,
      }),
    );
  };

  const selectedTooltipText = useMemo(() => {
    if (!selectedPoint) {
      return '';
    }
    const xPart = selectedPoint.label
      ? selectedPoint.label
      : `${t('week')}: ${selectedPoint.weekIndex}`;
    return `${selectedPoint.seriesName}, ${xPart}, ${t('chartTooltipAttendance')}: ${formatAxisValue(selectedPoint.value)}`;
  }, [formatAxisValue, selectedPoint, t]);

  const plotBottomY = CHART_HEIGHT - PADDING_Y;
  const displayTitle = t('attendanceChart') || 'Attendance Chart';
  const resolvedReportDate =
    reportDate || formatOverseerReportDate(new Date(), selectedLanguage || 'en');
  const exportWidth = EXPORT_PAD * 2 + EXPORT_Y_AXIS + chartWidth;
  const exportHeight =
    EXPORT_PAD * 2 +
    EXPORT_TITLE_H +
    EXPORT_LEGEND_H +
    SVG_TOTAL_HEIGHT +
    EXPORT_AXIS_CAPTION;
  const exportPlotOffsetY = EXPORT_PAD + EXPORT_TITLE_H + EXPORT_LEGEND_H;

  const renderPlot = (interactive: boolean) => (
    <>
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
              {interactive ? (
                <Circle
                  cx={dot.cx}
                  cy={dot.cy}
                  r={14}
                  fill="transparent"
                  onPress={() =>
                    handleDotPress(series.key, series.label, series.color, dot)
                  }
                />
              ) : null}
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
    </>
  );

  const finishSave = useCallback((ok: boolean, err?: unknown) => {
    capturingRef.current = false;
    setShowExportSvg(false);
    setSaving(false);
    if (ok) {
      Alert.alert(t('success'), t('chartSavedAsJpeg'));
      return;
    }
    const message = err instanceof Error ? err.message : '';
    if (message === CHART_SAVE_PERMISSION_DENIED) {
      return;
    }
    Alert.alert(t('error'), t('chartSaveFailed'));
  }, [t]);

  const captureExport = useCallback(() => {
    if (capturingRef.current) {
      return;
    }
    capturingRef.current = true;
    requestAnimationFrame(() => {
      setTimeout(() => {
        saveSvgChartAsJpeg(exportSvgRef.current, {
          width: exportWidth,
          height: exportHeight,
          filePrefix: 'attendance-chart',
        })
          .then(() => finishSave(true))
          .catch(err => finishSave(false, err));
      }, 80);
    });
  }, [exportHeight, exportWidth, finishSave]);

  const handleSaveJpeg = () => {
    if (saving || !points.length) {
      return;
    }
    setSaving(true);
    setShowExportSvg(true);
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={displayTitle} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : loadError ? (
          <ApiErrorState error={loadError} onRetry={load} />
        ) : points.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.infoText, {color: C.textSecondary}]}>{t('noDataFound')}</Text>
          </View>
        ) : (
          <>
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
              <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
                <OverseerChartTitleBlock
                  title={displayTitle}
                  pastorName={pastorName}
                  regionNation={regionNation}
                  reportDate={resolvedReportDate}
                  reportingPeriod={reportingPeriod}
                  style={styles.titleInCard}
                  action={
                    <TouchableOpacity
                      onPress={handleSaveJpeg}
                      disabled={saving}
                      style={[styles.saveBtn, saving ? styles.saveBtnDisabled : null]}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                      accessibilityRole="button"
                      accessibilityLabel={t('saveAsJpeg') || 'Save as JPEG'}>
                      {saving ? (
                        <ActivityIndicator color={COLORS.mainColor} size="small" />
                      ) : (
                        <Text style={[styles.saveBtnText, {color: COLORS.mainColor}]}>
                          {t('saveAsJpeg') || 'Save as JPEG'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  }
                />
                <View
                  style={[styles.headerDivider, {backgroundColor: C.inputBorder}]}
                />
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
                        {renderPlot(true)}
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
                <Text style={[styles.axisCaption, {color: C.textSecondary}]}>
                  {t('chartAxisMonths') || 'Months'}
                </Text>
              </View>
            </ScrollView>
            {showExportSvg ? (
              <View
                collapsable={false}
                onLayout={captureExport}
                pointerEvents="none"
                style={[
                  styles.exportOffscreen,
                  {width: exportWidth, height: exportHeight},
                ]}>
                <Svg
                  ref={exportSvgRef}
                  width={exportWidth}
                  height={exportHeight}>
                  <Rect
                    x={0}
                    y={0}
                    width={exportWidth}
                    height={exportHeight}
                    fill={C.surface}
                  />
                  <SvgText
                    x={EXPORT_PAD}
                    y={EXPORT_PAD + 16}
                    fill={C.textPrimary}
                    fontSize={fs(16)}
                    fontWeight="700">
                    {displayTitle}
                  </SvgText>
                  <SvgText
                    x={EXPORT_PAD}
                    y={EXPORT_PAD + 38}
                    fill={C.textPrimary}
                    fontSize={fs(12)}
                    fontWeight="500">
                    {`${t('forPastor') || 'For Pastor'}: ${pastorName || '-'}`}
                  </SvgText>
                  <SvgText
                    x={EXPORT_PAD + exportWidth / 2}
                    y={EXPORT_PAD + 38}
                    fill={C.textPrimary}
                    fontSize={fs(12)}
                    fontWeight="500">
                    {`${t('regionNation') || 'Region / Nation'}: ${regionNation || '-'}`}
                  </SvgText>
                  <SvgText
                    x={EXPORT_PAD}
                    y={EXPORT_PAD + 58}
                    fill={C.textPrimary}
                    fontSize={fs(12)}
                    fontWeight="500">
                    {`${t('reportDate') || 'Report Date'}: ${resolvedReportDate}`}
                  </SvgText>
                  <SvgText
                    x={EXPORT_PAD + exportWidth / 2}
                    y={EXPORT_PAD + 58}
                    fill={C.textPrimary}
                    fontSize={fs(12)}
                    fontWeight="500">
                    {`${t('reportingPeriod') || 'Reporting Period'}: ${reportingPeriod || '-'}`}
                  </SvgText>
                  {legend.map((item, idx) => {
                    const lx = EXPORT_PAD + idx * 210;
                    const ly = EXPORT_PAD + EXPORT_TITLE_H + 8;
                    return (
                      <React.Fragment key={`export-legend-${item.key}`}>
                        <Rect
                          x={lx}
                          y={ly - 8}
                          width={10}
                          height={10}
                          fill={item.color}
                        />
                        <SvgText
                          x={lx + 16}
                          y={ly}
                          fill={C.textSecondary}
                          fontSize={fs(11)}
                          fontWeight="500">
                          {item.label}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  {yTicks.map(tick => (
                    <SvgText
                      key={`export-y-${tick.value}`}
                      x={EXPORT_PAD + EXPORT_Y_AXIS - 4}
                      y={exportPlotOffsetY + tick.y + 3}
                      fill={C.textSecondary}
                      fontSize={fs(9)}
                      fontWeight="500"
                      textAnchor="end">
                      {formatAxisValue(tick.value)}
                    </SvgText>
                  ))}
                  <G transform={`translate(${EXPORT_PAD + EXPORT_Y_AXIS}, ${exportPlotOffsetY})`}>
                    {renderPlot(false)}
                  </G>
                  <SvgText
                    x={exportWidth / 2}
                    y={exportHeight - EXPORT_PAD}
                    fill={C.textSecondary}
                    fontSize={fs(11)}
                    fontWeight="500"
                    textAnchor="middle">
                    {t('chartAxisMonths') || 'Months'}
                  </SvgText>
                </Svg>
              </View>
            ) : null}
          </>
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
  saveBtn: {
    paddingVertical: ms(2),
    minHeight: ms(24),
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: ms(10),
  },
  titleInCard: {
    marginBottom: 0,
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
    borderRadius: rs(2),
    marginRight: ms(6),
  },
  legendLabel: {
    fontSize: fs(12),
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
  axisCaption: {
    marginTop: ms(4),
    fontSize: fs(12),
    textAlign: 'center',
    fontWeight: '500',
  },
  exportOffscreen: {
    position: 'absolute',
    left: -4096,
    top: 0,
    opacity: 1,
  },
});
