import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {G, Line, Rect, Text as SvgText} from 'react-native-svg';
import {useFocusEffect} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getOverseerIndicators,
  PastoralVisitWeekPoint,
} from '../services/overseerIndicators.service';

type Row = {dates: string; visitDays: number; sortKey: number};

const CHART_HEIGHT = 240;
const X_LABEL_START_BELOW_AXIS = ms(20);
const X_LABEL_AREA = ms(96) + X_LABEL_START_BELOW_AXIS;
const SVG_TOTAL_HEIGHT = CHART_HEIGHT + X_LABEL_AREA;
const PADDING_LEFT = 42;
const PADDING_RIGHT = 14;
const PADDING_Y = 16;
const BAR_SLOT = 13;
const BAR_WIDTH = 9;
const X_LABEL_EVERY = 6;
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
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

export default function PastoralVisitsChartScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [graphTitle, setGraphTitle] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOverseerIndicators();
      const graph = data?.pastoral_visits_graph;
      setGraphTitle(graph?.graph_title?.trim() || '');
      const list = graph?.data;
      const raw = Array.isArray(list) ? [...list] : [];
      setRows(normaliseRows(raw));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('pastoralVisits')} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.loadingWrap}>
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
            <View
              style={[
                styles.card,
                {backgroundColor: C.surface, borderColor: C.inputBorder},
              ]}>
              {graphTitle ? (
                <Text
                  style={[styles.subtitle, {color: C.textSecondary}]}
                  numberOfLines={3}>
                  {graphTitle}
                </Text>
              ) : null}

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

                <View style={{width: chartLayout.chartWidth}}>
                  <Svg width={chartLayout.chartWidth} height={SVG_TOTAL_HEIGHT}>
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
                          opacity={0.92}
                        />
                      ) : null,
                    )}

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
                      const labelBaseY =
                        chartLayout.plotBottomY + X_LABEL_START_BELOW_AXIS;
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
                  </Svg>
                </View>
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
  scroll: {flexGrow: 0},
  scrollContent: {paddingTop: ms(8), paddingBottom: ms(20), flexGrow: 1},
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    minWidth: '100%',
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
  chartRow: {flexDirection: 'row', alignItems: 'flex-start'},
  yAxisWrap: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
  },
  yAxisTickWrap: {position: 'absolute', right: 0},
  yAxisLabel: {fontSize: fs(9)},
});
