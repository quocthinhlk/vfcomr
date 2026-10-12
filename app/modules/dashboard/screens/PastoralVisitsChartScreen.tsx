import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {G, Line, Rect, Text as SvgText} from 'react-native-svg';
import {useFocusEffect, useRoute} from '@react-navigation/native';
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
  PastoralVisitWeekPoint,
} from '../services/overseerIndicators.service';
import {OverseerChartTitleBlock} from '../components/OverseerChartTitleBlock';
import {ChartSaveButton} from '../components/ChartSaveButton';
import {
  CHART_EXPORT_PAD,
  CHART_EXPORT_TITLE_H,
  ChartExportTitleTexts,
  chartExportOffscreenStyle,
} from '../components/ChartExportTitleTexts';
import {
  formatCompactChartDate,
  formatOverseerReportDate,
  formatReportingPeriod,
  pickGraphHeaderValue,
  yearFromIsoDate,
} from '../utils/overseerChartHeader';
import {useChartJpegExport} from '../utils/useChartJpegExport';

type Row = {dates: string; visitDays: number; sortKey: number; churches: string[]};

const TIP_ICON = require('../../../assets/images/icon/tip.png');

const CHART_HEIGHT = 240;
const X_LABEL_START_BELOW_AXIS = ms(20);
const X_LABEL_AREA = ms(96) + X_LABEL_START_BELOW_AXIS;
const SVG_TOTAL_HEIGHT = CHART_HEIGHT + X_LABEL_AREA;
const PADDING_LEFT = 42;
const PADDING_RIGHT = 14;
const PADDING_Y = 16;
const BAR_SLOT = 24;
const BAR_WIDTH = 16;
const X_LABEL_EVERY = 4;
const Y_AXIS_WIDTH = 34;

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
      });
    }
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(locale || 'en', {
    month: 'short',
    day: 'numeric',
  });
};

function parseSortKey(p: PastoralVisitWeekPoint): number {
  const d = String(p.dates ?? '').trim();
  if (d) {
    const t = new Date(d).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const y = Number(p.week_key?.year) || 0;
  const w = Number(p.week_key?.week) || 0;
  return y * 1000 + w;
}

function extractChurchNames(p: PastoralVisitWeekPoint): string[] {
  const raw =
    p.churches ??
    p.church_names ??
    p.visited_churches ??
    (p as {church_list?: unknown}).church_list;

  if (!raw) {
    return [];
  }

  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map(name => name.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(item => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        return String(item.church_name ?? item.name ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

function normaliseRows(list: PastoralVisitWeekPoint[]): Row[] {
  return list
    .map((p, idx) => {
      const visitDays =
        p.visit_days == null ? 0 : Math.max(0, Number(p.visit_days) || 0);
      const dates = String(p.dates ?? '').trim();
      return {
        dates,
        visitDays,
        sortKey: parseSortKey(p) || idx,
        churches: extractChurchNames(p),
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

export default function PastoralVisitsChartScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  // Offline / server error must not look like "No data found".
  const [loadError, setLoadError] = useState<unknown>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [pastorName, setPastorName] = useState('');
  const [regionNation, setRegionNation] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');

  // Set when opened from the Admin dashboard for a chosen overseer.
  const route = useRoute<any>();
  const overseerId: number | undefined = route.params?.overseerId;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getOverseerIndicators(overseerId);
      const graph = data?.pastoral_visits_graph;
      const list = graph?.data;
      const raw = Array.isArray(list) ? [...list] : [];
      const normalised = normaliseRows(raw);
      setRows(normalised);
      setPastorName(pickGraphHeaderValue(graph, ['pastor_name', 'for_pastor']));
      setRegionNation(
        pickGraphHeaderValue(graph, ['region_nation', 'region', 'nation']),
      );
      setReportDate(pickGraphHeaderValue(graph, ['report_date']));
      setReportingPeriod(
        pickGraphHeaderValue(graph, ['reporting_period', 'period']) ||
          formatReportingPeriod(normalised.map(row => yearFromIsoDate(row.dates))),
      );
    } catch (e) {
      setRows([]);
      setLoadError(e);
    } finally {
      setLoading(false);
    }

    try {
      const header = await getOverseerChartHeaderInfo(overseerId);
      setPastorName(prev => prev || header.pastorName);
      setRegionNation(prev => prev || header.regionNation);
    } catch {
      // Chart can render without header metadata.
    }
  }, [overseerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    setSelectedBarIndex(null);
  }, [rows]);

  const chartLayout = useMemo(() => {
    const n = Math.max(rows.length, 1);
    const chartWidth = Math.max(360, PADDING_LEFT + n * BAR_SLOT + PADDING_RIGHT);
    const plotBottomY = CHART_HEIGHT - PADDING_Y;
    const usable = CHART_HEIGHT - PADDING_Y * 2;
    const values = rows.map(r => r.visitDays);
    const rawMax = Math.max(...values, 1);
    const yStep = getNiceStep(rawMax / 6);
    const max = Math.max(yStep, Math.ceil(rawMax / yStep) * yStep);

    const ticks = Array.from({length: Math.round(max / yStep) + 1}, (_, idx) => {
      const value = max - idx * yStep;
      const ratio = max === 0 ? 0 : value / max;
      return {
        value,
        y: plotBottomY - ratio * usable,
      };
    });

    const bars = rows.map((row, i) => {
      const cx = PADDING_LEFT + i * BAR_SLOT + (BAR_SLOT - BAR_WIDTH) / 2;
      const h = max === 0 ? 0 : (row.visitDays / max) * usable;
      const yTop = plotBottomY - h;
      return {
        key: `b-${i}-${row.sortKey}`,
        cx,
        yTop,
        h,
        v: row.visitDays,
        dateLabel: formatShortDate(row.dates, selectedLanguage || 'en'),
        index: i,
      };
    });

    const xLabels = rows
      .map((row, i) => ({i, label: formatShortDate(row.dates, selectedLanguage || 'en')}))
      .filter((_, i) => i % X_LABEL_EVERY === 0 || i === rows.length - 1);

    return {
      chartWidth,
      plotBottomY,
      yTicks: ticks,
      bars,
      xLabels,
    };
  }, [rows, selectedLanguage]);

  const formatAxisValue = (value: number) =>
    Math.round(value).toLocaleString(selectedLanguage || 'en');

  const selectedRow =
    selectedBarIndex != null ? rows[selectedBarIndex] ?? null : null;

  const selectedDetailText = useMemo(() => {
    if (!selectedRow) {
      return '';
    }
    const churchLabel = selectedRow.churches.join(', ') || '-';
    return `${t('chartTooltipDate') || 'Date'}: ${formatCompactChartDate(
      selectedRow.dates,
      selectedLanguage || 'en',
    )}  ${t('church')}: ${churchLabel}   ${t('chartTooltipDays')}: ${selectedRow.visitDays}`;
  }, [selectedRow, selectedLanguage, t]);

  const detailBannerPosition = useMemo(() => {
    if (selectedBarIndex == null) {
      return null;
    }
    const bar = chartLayout.bars[selectedBarIndex];
    if (!bar) {
      return null;
    }
    const barCenterX = PADDING_LEFT + selectedBarIndex * BAR_SLOT + BAR_SLOT / 2;
    const maxWidth = ms(280);
    let left = barCenterX + ms(8);
    if (left + maxWidth > chartLayout.chartWidth - PADDING_RIGHT - ms(4)) {
      left = barCenterX - maxWidth - ms(8);
    }
    left = Math.max(
      PADDING_LEFT,
      Math.min(left, chartLayout.chartWidth - PADDING_RIGHT - ms(4)),
    );
    const top = Math.max(PADDING_Y + ms(4), bar.yTop + ms(6));
    return {left, top, maxWidth};
  }, [chartLayout.bars, chartLayout.chartWidth, selectedBarIndex]);

  const handleBarPress = (index: number) => {
    setSelectedBarIndex(prev => (prev === index ? null : index));
  };

  const displayTitle = t('pastoralVisits') || 'Church Visits Chart';
  const resolvedReportDate =
    reportDate ||
    formatOverseerReportDate(new Date(), selectedLanguage || 'en');
  const exportWidth =
    CHART_EXPORT_PAD * 2 + Y_AXIS_WIDTH + chartLayout.chartWidth;
  const exportHeight =
    CHART_EXPORT_PAD * 2 + CHART_EXPORT_TITLE_H + SVG_TOTAL_HEIGHT;
  const exportPlotOffsetY = CHART_EXPORT_PAD + CHART_EXPORT_TITLE_H;

  const {exportSvgRef, saving, showExportSvg, captureExport, handleSaveJpeg} =
    useChartJpegExport({
      filePrefix: 'church-visits-chart',
      width: exportWidth,
      height: exportHeight,
      canSave: rows.length > 0,
    });

  const renderPlot = (interactive: boolean) => (
    <>
      {rows.map((_, i) => {
        const x = PADDING_LEFT + i * BAR_SLOT + BAR_SLOT / 2;
        return (
          <Line
            key={`v-${i}`}
            x1={x}
            y1={PADDING_Y}
            x2={x}
            y2={chartLayout.plotBottomY}
            stroke={C.inputBorder}
            strokeWidth={0.5}
            opacity={0.2}
          />
        );
      })}
      {chartLayout.yTicks.map(tick => (
        <Line
          key={`h-${tick.value}`}
          x1={PADDING_LEFT}
          y1={tick.y}
          x2={chartLayout.chartWidth - PADDING_RIGHT}
          y2={tick.y}
          stroke={C.inputBorder}
          strokeWidth={0.8}
          opacity={0.55}
        />
      ))}
      <Line
        x1={PADDING_LEFT}
        y1={chartLayout.plotBottomY}
        x2={chartLayout.chartWidth - PADDING_RIGHT}
        y2={chartLayout.plotBottomY}
        stroke={C.inputBorder}
        strokeWidth={1.5}
      />
      <Line
        x1={PADDING_LEFT}
        y1={PADDING_Y}
        x2={PADDING_LEFT}
        y2={chartLayout.plotBottomY}
        stroke={C.inputBorder}
        strokeWidth={1.5}
      />
      {chartLayout.bars.map(b =>
        b.h > 0.5 ? (
          <Rect
            key={b.key}
            x={b.cx}
            y={b.yTop}
            width={BAR_WIDTH}
            height={b.h}
            fill={COLORS.mainColor}
            rx={rs(2)}
            ry={rs(2)}
            opacity={selectedBarIndex === b.index ? 1 : 0.92}
            stroke={selectedBarIndex === b.index ? '#ffffff' : undefined}
            strokeWidth={selectedBarIndex === b.index ? 1 : 0}
          />
        ) : null,
      )}
      {interactive
        ? chartLayout.bars.map(b => (
            <Rect
              key={`hit-${b.key}`}
              x={PADDING_LEFT + b.index * BAR_SLOT}
              y={PADDING_Y}
              width={BAR_SLOT}
              height={chartLayout.plotBottomY - PADDING_Y}
              fill="transparent"
              onPress={() => handleBarPress(b.index)}
            />
          ))
        : null}
      {chartLayout.bars.map(b =>
        b.h > ms(14) && b.v > 0 ? (
          <SvgText
            key={`t-${b.key}`}
            x={b.cx + BAR_WIDTH / 2}
            y={b.yTop + ms(2)}
            fill="#fff"
            fontSize={fs(8)}
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="hanging">
            {String(b.v)}
          </SvgText>
        ) : null,
      )}
      {chartLayout.xLabels.map(({i, label}) => {
        const tx = PADDING_LEFT + i * BAR_SLOT + BAR_SLOT / 2;
        const labelBaseY = chartLayout.plotBottomY + X_LABEL_START_BELOW_AXIS;
        return (
          <G
            key={`xl-${i}`}
            transform={`translate(${tx}, ${labelBaseY}) rotate(-45)`}>
            <SvgText
              x={0}
              y={0}
              fill={C.textPrimary}
              fontSize={fs(9)}
              fontWeight="500"
              textAnchor="end"
              alignmentBaseline="middle">
              {label}
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
        ) : loadError ? (
          <ApiErrorState error={loadError} onRetry={load} />
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
            {rows.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.infoText, {color: C.textSecondary}]}>
                  {t('noDataFound')}
                </Text>
              </View>
            ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              horizontal={rows.length > 8}
              showsHorizontalScrollIndicator>
                <View style={styles.chartRow}>
                <View style={[styles.yAxisWrap, {height: SVG_TOTAL_HEIGHT}]}>
                  {chartLayout.yTicks.map(tick => (
                    <View
                      key={`${tick.value}-${tick.y}`}
                      style={[styles.yAxisTickWrap, {top: tick.y - ms(7)}]}>
                      <Text style={[styles.yAxisLabel, {color: C.textSecondary}]}>
                        {formatAxisValue(tick.value)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.chartPlotWrap,
                    {width: chartLayout.chartWidth},
                  ]}>
                  <Svg width={chartLayout.chartWidth} height={SVG_TOTAL_HEIGHT}>
                    {renderPlot(true)}
                  </Svg>
                  {selectedRow && detailBannerPosition ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.detailBanner,
                        {
                          left: detailBannerPosition.left,
                          top: detailBannerPosition.top,
                          maxWidth: detailBannerPosition.maxWidth,
                        },
                      ]}>
                      <Text style={styles.detailBannerText}>
                        {selectedDetailText}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </ScrollView>
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
                  {chartLayout.yTicks.map(tick => (
                    <SvgText
                      key={`export-y-${tick.value}`}
                      x={CHART_EXPORT_PAD + Y_AXIS_WIDTH - 4}
                      y={exportPlotOffsetY + tick.y + 3}
                      fill={C.textSecondary}
                      fontSize={fs(9)}
                      fontWeight="500"
                      textAnchor="end">
                      {formatAxisValue(tick.value)}
                    </SvgText>
                  ))}
                  <G
                    transform={`translate(${CHART_EXPORT_PAD + Y_AXIS_WIDTH}, ${exportPlotOffsetY})`}>
                    {renderPlot(false)}
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
  chartRow: {flexDirection: 'row', alignItems: 'flex-start'},
  yAxisWrap: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
  },
  yAxisTickWrap: {position: 'absolute', right: 0},
  yAxisLabel: {fontSize: fs(9)},
  chartPlotWrap: {
    position: 'relative',
  },
  detailBanner: {
    position: 'absolute',
    alignSelf: 'flex-start',
    backgroundColor: '#2b2b2b',
    borderRadius: rs(4),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    zIndex: 10,
  },
  detailBannerText: {
    color: '#ffffff',
    fontSize: fs(11),
    lineHeight: fs(15),
    fontWeight: '500',
  },
});
