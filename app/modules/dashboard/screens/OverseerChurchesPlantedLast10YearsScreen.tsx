import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {G, Line, Rect, Text as SvgText} from 'react-native-svg';
import {useFocusEffect} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import type {TranslationKey} from '../../../shared/translations';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getOverseerChartHeaderInfo,
  getOverseerIndicators,
  OverseerChurchPlantedYear,
} from '../services/overseerIndicators.service';
import {OverseerChartTitleBlock} from '../components/OverseerChartTitleBlock';
import {ChartSaveButton} from '../components/ChartSaveButton';
import {
  CHART_EXPORT_LEGEND_H,
  CHART_EXPORT_PAD,
  CHART_EXPORT_TITLE_H,
  ChartExportTitleTexts,
  chartExportOffscreenStyle,
} from '../components/ChartExportTitleTexts';
import {
  formatOverseerReportDate,
  formatReportingPeriod,
  pickGraphHeaderValue,
} from '../utils/overseerChartHeader';
import {useChartJpegExport} from '../utils/useChartJpegExport';

/** Normalised row for divergent chart (planted up, closed down). */
type PlantedClosedYearRow = {
  year: number;
  planted: number;
  closed: number;
  isYtd: boolean;
};

const CHART_HEIGHT = 300;
const X_LABEL_REGION = 42;
const SVG_HEIGHT = CHART_HEIGHT;
const PADDING_LEFT = 52;
const PADDING_RIGHT = 14;
const PADDING_Y = 14;
const BAR_SLOT = 46;
const BAR_WIDTH = 28;
const PLOT_BOTTOM_Y = CHART_HEIGHT - X_LABEL_REGION - 6;

const TIP_ICON = require('../../../assets/images/icon/tip.png');

const PLANTED_COLOR = COLORS.successColor;
const PLANTED_YTD_COLOR = 'rgba(40, 167, 69, 0.42)';
const CLOSED_COLOR = '#bdbdbd';

const getNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
};

const buildTicksFromZero = (maxValue: number): {ticks: number[]; scaleMax: number} => {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return {ticks: [0], scaleMax: 0};
  }
  const step = getNiceStep(maxValue / 4);
  const scaleMax = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= scaleMax + 1e-9; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return {ticks, scaleMax};
};

function normaliseYearRows(list: OverseerChurchPlantedYear[]): PlantedClosedYearRow[] {
  return list.map((row: any) => {
    const planted = Math.max(
      0,
      Number(row.planted ?? row.count ?? 0) || 0,
    );
    const closed = Math.max(
      0,
      Number(
        row.closed ?? row.closed_count ?? row.disabled_count ?? 0,
      ) || 0,
    );
    const isYtd = Boolean(
      row.is_ytd ?? row.ytd ?? row.is_ytd_year ?? row.year_to_date,
    );
    return {
      year: Number(row.year) || 0,
      planted,
      closed,
      isYtd,
    };
  });
}

export default function OverseerChurchesPlantedLast10YearsScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<PlantedClosedYearRow[]>([]);
  const [pastorName, setPastorName] = useState('');
  const [regionNation, setRegionNation] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOverseerIndicators();
      const graph = data?.church_planted_graph;
      const list = graph?.data;
      const raw = Array.isArray(list) ? [...list] : [];
      raw.sort((a, b) => a.year - b.year);
      const normalised = normaliseYearRows(raw);
      setYears(normalised);
      setPastorName(pickGraphHeaderValue(graph, ['pastor_name', 'for_pastor']));
      setRegionNation(
        pickGraphHeaderValue(graph, ['region_nation', 'region', 'nation']),
      );
      setReportDate(pickGraphHeaderValue(graph, ['report_date']));
      setReportingPeriod(
        pickGraphHeaderValue(graph, ['reporting_period', 'period']) ||
          formatReportingPeriod(normalised.map(row => row.year)),
      );
    } catch {
      setYears([]);
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

  const chartLayout = useMemo(() => {
    const n = Math.max(years.length, 1);
    const chartWidth = Math.max(340, PADDING_LEFT + n * BAR_SLOT + PADDING_RIGHT);
    const baselineY = PADDING_Y + (PLOT_BOTTOM_Y - PADDING_Y) / 2;
    const upperSpan = baselineY - PADDING_Y;
    const lowerSpan = PLOT_BOTTOM_Y - baselineY;

    const maxPlanted = Math.max(...years.map(y => y.planted), 0);
    const maxClosed = Math.max(...years.map(y => y.closed), 0);
    /** One scale for both directions so 1 closed unit uses the same pixels as 1 planted unit. */
    const combinedMax = Math.max(maxPlanted, maxClosed, 1);
    const sharedScale = buildTicksFromZero(combinedMax);
    const scaleMax = sharedScale.scaleMax <= 0 ? 1 : sharedScale.scaleMax;

    const yPlantedTickYs = sharedScale.ticks.map(v => ({
      value: v,
      y: baselineY - (v / scaleMax) * upperSpan,
    }));
    const yClosedTickYs = sharedScale.ticks
      .filter(v => v > 0)
      .map(v => ({
        value: v,
        y: baselineY + (v / scaleMax) * lowerSpan,
      }));

    const gridYs = new Map<number, number>();
    yPlantedTickYs.forEach(({y}) => gridYs.set(Math.round(y * 10) / 10, y));
    yClosedTickYs.forEach(({y}) => gridYs.set(Math.round(y * 10) / 10, y));
    gridYs.set(Math.round(baselineY * 10) / 10, baselineY);

    const bars = years.map((row, i) => {
      const cx = PADDING_LEFT + i * BAR_SLOT + (BAR_SLOT - BAR_WIDTH) / 2;
      const hPlanted =
        scaleMax > 0 ? (row.planted / scaleMax) * upperSpan : 0;
      const hClosed =
        scaleMax > 0 ? (row.closed / scaleMax) * lowerSpan : 0;
      const yPlantedTop = baselineY - hPlanted;
      const plantedFill = row.isYtd ? PLANTED_YTD_COLOR : PLANTED_COLOR;
      return {
        key: `y-${row.year}-${i}`,
        year: row.year,
        cx,
        baselineY,
        hPlanted,
        yPlantedTop,
        hClosed,
        plantedFill,
        isYtd: row.isYtd,
        planted: row.planted,
        closed: row.closed,
      };
    });

    return {
      chartWidth,
      baselineY,
      plotBottomY: PLOT_BOTTOM_Y,
      upperSpan,
      lowerSpan,
      scaleMax,
      yPlantedTickYs,
      yClosedTickYs,
      gridLineYs: [...gridYs.values()].sort((a, b) => a - b),
      bars,
    };
  }, [years]);

  const formatAxisValue = (value: number) =>
    Math.round(value).toLocaleString(selectedLanguage || 'en');

  const trOr = (key: TranslationKey, fallback: string) => {
    const s = String(t(key) ?? '').trim();
    return s && s !== key ? s : fallback;
  };

  const displayTitle = trOr(
    'churchesPlantedLast10Years',
    'Churches Planted last 10 years',
  );
  const plantedAxisLabel = trOr(
    'numberOfChurchesPlantedAxis',
    'Number of Churches Planted',
  );
  const closedAxisLabel = trOr(
    'numberOfChurchesClosedAxis',
    'Number of Churches Closed',
  );
  const legendPlanted = trOr('churchesPlantedLegend', 'Churches Planted');
  const legendClosed = trOr('churchesClosedLegend', 'Churches Closed');
  const legendYtd = trOr('ytdYearToDate', 'YTD Year To Date');

  const upperAxisCenterY = (PADDING_Y + chartLayout.baselineY) / 2;
  const lowerAxisCenterY =
    (chartLayout.baselineY + chartLayout.plotBottomY) / 2;

  const resolvedReportDate =
    reportDate ||
    formatOverseerReportDate(new Date(), selectedLanguage || 'en');
  const exportWidth = CHART_EXPORT_PAD * 2 + chartLayout.chartWidth;
  const exportHeight =
    CHART_EXPORT_PAD * 2 +
    CHART_EXPORT_TITLE_H +
    CHART_EXPORT_LEGEND_H +
    SVG_HEIGHT;
  const exportPlotOffsetY =
    CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + CHART_EXPORT_LEGEND_H;

  const {exportSvgRef, saving, showExportSvg, captureExport, handleSaveJpeg} =
    useChartJpegExport({
      filePrefix: 'churches-planted-chart',
      width: exportWidth,
      height: exportHeight,
      canSave: years.length > 0,
    });

  const renderPlantedPlot = () => (
    <>
                  {/* Upper Y ticks (planted) */}
                  {chartLayout.yPlantedTickYs.map(({value, y}) => (
                    <SvgText
                      key={`pt-${value}`}
                      x={PADDING_LEFT - 6}
                      y={y + 3}
                      fill={C.textSecondary}
                      fontSize={fs(9)}
                      fontWeight="500"
                      textAnchor="end">
                      {formatAxisValue(value)}
                    </SvgText>
                  ))}
                  {/* Lower Y ticks (closed, shown negative) */}
                  {chartLayout.yClosedTickYs.map(({value, y}) => (
                    <SvgText
                      key={`ct-${value}`}
                      x={PADDING_LEFT - 6}
                      y={y + 3}
                      fill={C.textSecondary}
                      fontSize={fs(9)}
                      fontWeight="500"
                      textAnchor="end">
                      {value === 0 ? '0' : `-${formatAxisValue(value)}`}
                    </SvgText>
                  ))}

                  {/* Rotated axis titles */}
                  <G transform={`translate(12, ${upperAxisCenterY})`}>
                    <SvgText
                      fill={C.textSecondary}
                      fontSize={fs(8)}
                      textAnchor="middle"
                      transform="rotate(-90)">
                      {plantedAxisLabel}
                    </SvgText>
                  </G>
                  <G transform={`translate(12, ${lowerAxisCenterY})`}>
                    <SvgText
                      fill={C.textSecondary}
                      fontSize={fs(8)}
                      textAnchor="middle"
                      transform="rotate(-90)">
                      {closedAxisLabel}
                    </SvgText>
                  </G>

                  {/* Horizontal grid */}
                  {chartLayout.gridLineYs.map((y, idx) => (
                    <Line
                      key={`grid-${idx}-${y}`}
                      x1={PADDING_LEFT}
                      y1={y}
                      x2={chartLayout.chartWidth - PADDING_RIGHT}
                      y2={y}
                      stroke={C.inputBorder}
                      strokeWidth={0.8}
                      opacity={0.55}
                    />
                  ))}

                  {/* Baseline */}
                  <Line
                    x1={PADDING_LEFT}
                    y1={chartLayout.baselineY}
                    x2={chartLayout.chartWidth - PADDING_RIGHT}
                    y2={chartLayout.baselineY}
                    stroke={C.textSecondary}
                    strokeWidth={1.2}
                    opacity={0.85}
                  />

                  {/* Y axis line */}
                  <Line
                    x1={PADDING_LEFT}
                    y1={PADDING_Y}
                    x2={PADDING_LEFT}
                    y2={chartLayout.plotBottomY}
                    stroke={C.inputBorder}
                    strokeWidth={1}
                  />

                  {chartLayout.bars.map(b => (
                    <React.Fragment key={b.key}>
                      {b.hClosed > 0.5 ? (
                        <Rect
                          x={b.cx}
                          y={b.baselineY}
                          width={BAR_WIDTH}
                          height={b.hClosed}
                          fill={CLOSED_COLOR}
                          rx={rs(2)}
                          ry={rs(2)}
                        />
                      ) : null}
                      {b.hPlanted > 0.5 ? (
                        <Rect
                          x={b.cx}
                          y={b.yPlantedTop}
                          width={BAR_WIDTH}
                          height={b.hPlanted}
                          fill={b.plantedFill}
                          rx={rs(2)}
                          ry={rs(2)}
                        />
                      ) : null}
                      {b.hPlanted > 10 ? (
                        <SvgText
                          x={b.cx + BAR_WIDTH / 2}
                          y={b.baselineY - b.hPlanted / 2}
                          fill={b.isYtd ? '#1a4d1f' : '#fff'}
                          fontSize={fs(11)}
                          fontWeight="700"
                          textAnchor="middle"
                          alignmentBaseline="middle">
                          {String(b.planted)}
                        </SvgText>
                      ) : b.planted > 0 ? (
                        <SvgText
                          x={b.cx + BAR_WIDTH / 2}
                          y={b.baselineY - Math.max(b.hPlanted / 2, 8)}
                          fill={C.textPrimary}
                          fontSize={fs(10)}
                          fontWeight="600"
                          textAnchor="middle"
                          alignmentBaseline="middle">
                          {String(b.planted)}
                        </SvgText>
                      ) : null}
                      {b.hClosed > 10 ? (
                        <SvgText
                          x={b.cx + BAR_WIDTH / 2}
                          y={b.baselineY + b.hClosed / 2}
                          fill={C.textPrimary}
                          fontSize={fs(11)}
                          fontWeight="700"
                          textAnchor="middle"
                          alignmentBaseline="middle">
                          {b.closed > 0 ? `-${b.closed}` : '0'}
                        </SvgText>
                      ) : b.closed > 0 ? (
                        <SvgText
                          x={b.cx + BAR_WIDTH / 2}
                          y={b.baselineY + Math.max(b.hClosed / 2, 8)}
                          fill={C.textPrimary}
                          fontSize={fs(10)}
                          fontWeight="600"
                          textAnchor="middle"
                          alignmentBaseline="middle">
                          {`-${b.closed}`}
                        </SvgText>
                      ) : null}
                    </React.Fragment>
                  ))}

                  {chartLayout.bars.map(b => {
                    const tx = b.cx + BAR_WIDTH / 2;
                    const yearY = PLOT_BOTTOM_Y + ms(10);
                    return (
                      <G key={`xl-${b.key}`}>
                        {b.isYtd ? (
                          <SvgText
                            x={tx}
                            y={yearY - ms(14)}
                            fill={C.textSecondary}
                            fontSize={fs(9)}
                            fontWeight="700"
                            textAnchor="middle"
                            alignmentBaseline="middle">
                            YTD
                          </SvgText>
                        ) : null}
                        <SvgText
                          x={tx}
                          y={yearY}
                          fill={C.textPrimary}
                          fontSize={fs(11)}
                          fontWeight="600"
                          textAnchor="middle"
                          alignmentBaseline="middle">
                          {String(b.year)}
                        </SvgText>
                      </G>
                    );
                  })}
    </>
  );

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
        ) : (
          <View style={styles.content}>
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
            <View
              style={[
                styles.card,
                {backgroundColor: C.surface, borderColor: C.inputBorder},
              ]}>
              <OverseerChartTitleBlock
                title={displayTitle}
                pastorName={pastorName}
                regionNation={regionNation}
                reportDate={resolvedReportDate}
                reportingPeriod={reportingPeriod}
                style={styles.titleInCard}
                action={
                  <ChartSaveButton saving={saving} onPress={handleSaveJpeg} />
                }
              />
              <View
                style={[styles.headerDivider, {backgroundColor: C.inputBorder}]}
              />
              {years.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.infoText, {color: C.textSecondary}]}>
                    {t('noDataFound')}
                  </Text>
                </View>
              ) : (
                <>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendSwatch, {backgroundColor: PLANTED_COLOR}]}
                />
                <Text style={[styles.legendText, {color: C.textSecondary}]}>
                  {legendPlanted}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendSwatch, {backgroundColor: CLOSED_COLOR}]}
                />
                <Text style={[styles.legendText, {color: C.textSecondary}]}>
                  {legendClosed}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    styles.legendSwatchYtd,
                    {backgroundColor: PLANTED_COLOR},
                  ]}
                />
                <Text style={[styles.legendText, {color: C.textSecondary}]}>
                  {legendYtd}
                </Text>
              </View>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              horizontal={years.length > 6}
              showsHorizontalScrollIndicator>
              <View style={{width: chartLayout.chartWidth}}>
                <Svg width={chartLayout.chartWidth} height={SVG_HEIGHT}>
                  {renderPlantedPlot()}
                </Svg>
              </View>
            </ScrollView>
                </>
              )}
            </View>
            {showExportSvg ? (
              <View
                collapsable={false}
                onLayout={captureExport}
                pointerEvents="none"
                style={[
                  chartExportOffscreenStyle,
                  {width: exportWidth, height: exportHeight},
                ]}>
                <Svg ref={exportSvgRef} width={exportWidth} height={exportHeight}>
                  <Rect
                    x={0}
                    y={0}
                    width={exportWidth}
                    height={exportHeight}
                    fill={C.surface}
                  />
                  <ChartExportTitleTexts
                    title={displayTitle}
                    pastorName={pastorName}
                    regionNation={regionNation}
                    reportDate={resolvedReportDate}
                    reportingPeriod={reportingPeriod}
                    fill={C.textPrimary}
                  />
                  <Rect
                    x={CHART_EXPORT_PAD}
                    y={CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + 6}
                    width={10}
                    height={10}
                    fill={PLANTED_COLOR}
                  />
                  <SvgText
                    x={CHART_EXPORT_PAD + 16}
                    y={CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + 15}
                    fill={C.textSecondary}
                    fontSize={fs(11)}
                    fontWeight="500">
                    {legendPlanted}
                  </SvgText>
                  <Rect
                    x={CHART_EXPORT_PAD + 160}
                    y={CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + 6}
                    width={10}
                    height={10}
                    fill={CLOSED_COLOR}
                  />
                  <SvgText
                    x={CHART_EXPORT_PAD + 176}
                    y={CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + 15}
                    fill={C.textSecondary}
                    fontSize={fs(11)}
                    fontWeight="500">
                    {legendClosed}
                  </SvgText>
                  <Rect
                    x={CHART_EXPORT_PAD + 310}
                    y={CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + 6}
                    width={10}
                    height={10}
                    fill={PLANTED_COLOR}
                    opacity={0.45}
                  />
                  <SvgText
                    x={CHART_EXPORT_PAD + 326}
                    y={CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H + 15}
                    fill={C.textSecondary}
                    fontSize={fs(11)}
                    fontWeight="500">
                    {legendYtd}
                  </SvgText>
                  <G transform={`translate(${CHART_EXPORT_PAD}, ${exportPlotOffsetY})`}>
                    {renderPlantedPlot()}
                  </G>
                </Svg>
              </View>
            ) : null}
          </View>
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
  content: {
    flex: 1,
    paddingTop: ms(8),
    paddingBottom: ms(20),
  },
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
  scroll: {flexGrow: 0},
  scrollContent: {flexGrow: 1},
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    minWidth: '100%',
  },
  titleInCard: {
    marginBottom: 0,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: ms(10),
  },
  emptyWrap: {
    minHeight: ms(80),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(12),
    lineHeight: fs(19),
  },
  churchName: {
    fontSize: fs(13),
    fontWeight: '700',
    lineHeight: fs(20),
    marginBottom: ms(8),
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: ms(12),
    gap: ms(14),
    alignItems: 'center',
  },
  legendItem: {flexDirection: 'row', alignItems: 'center'},
  legendSwatch: {
    width: ms(10),
    height: ms(10),
    borderRadius: rs(2),
    marginRight: ms(6),
  },
  legendSwatchYtd: {opacity: 0.45},
  legendText: {fontSize: fs(11)},
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {fontSize: fs(14)},
});
