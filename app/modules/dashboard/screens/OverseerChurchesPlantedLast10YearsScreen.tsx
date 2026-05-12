import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import Svg, {Line, Rect, Text as SvgText} from 'react-native-svg';
import {useFocusEffect} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  getOverseerIndicators,
  OverseerChurchPlantedYear,
} from '../services/overseerIndicators.service';

const CHART_HEIGHT = 240;
const X_LABEL_AREA = ms(52);
const SVG_TOTAL_HEIGHT = CHART_HEIGHT + X_LABEL_AREA;
const PADDING_X = 36;
const PADDING_Y = 16;
const PADDING_RIGHT = 16;
const Y_AXIS_WIDTH = 34;
const BAR_SLOT = 44;
const BAR_WIDTH = 28;
const DISABLED_COLOR = '#9e9e9e';

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

export default function OverseerChurchesPlantedLast10YearsScreen() {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [graphTitle, setGraphTitle] = useState('');
  const [years, setYears] = useState<OverseerChurchPlantedYear[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOverseerIndicators();
      const graph = data?.church_planted_graph;
      setGraphTitle(graph?.graph_title?.trim() || '');
      const list = graph?.data;
      const raw = Array.isArray(list) ? [...list] : [];
      raw.sort((a, b) => a.year - b.year);
      setYears(raw);
    } catch {
      setYears([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const {chartWidth, yTicks, bars, plotBottomY} = useMemo(() => {
    const n = Math.max(years.length, 1);
    const width = Math.max(320, PADDING_X + n * BAR_SLOT + PADDING_RIGHT);
    const plotBottom = CHART_HEIGHT - PADDING_Y;
    const usable = CHART_HEIGHT - PADDING_Y * 2;

    const totals = years.map(y => (y.count ?? 0) + (y.disabled_count ?? 0));
    const rawMax = Math.max(...totals, 1);
    const yStep = getNiceStep(rawMax / 6);
    const max = Math.max(yStep, Math.ceil(rawMax / yStep) * yStep);

    const ticks = Array.from({length: Math.round(max / yStep) + 1}, (_, idx) => {
      const value = max - idx * yStep;
      const ratio = max === 0 ? 0 : value / max;
      return {value, y: plotBottom - ratio * usable};
    });

    const barElements = years.map((row, i) => {
      const cx = PADDING_X + i * BAR_SLOT + (BAR_SLOT - BAR_WIDTH) / 2;
      const c = Math.max(0, row.count ?? 0);
      const d = Math.max(0, row.disabled_count ?? 0);
      const hActive = max === 0 ? 0 : (c / max) * usable;
      const hDisabled = max === 0 ? 0 : (d / max) * usable;
      const yActiveTop = plotBottom - hActive;
      const yDisabledTop = yActiveTop - hDisabled;
      return {
        key: `y-${row.year}`,
        year: row.year,
        cx,
        yActiveTop,
        hActive,
        yDisabledTop,
        hDisabled,
      };
    });

    return {
      chartWidth: width,
      yTicks: ticks,
      bars: barElements,
      plotBottomY: plotBottom,
    };
  }, [years]);

  const formatAxisValue = (value: number) =>
    Math.round(value).toLocaleString(selectedLanguage || 'en');

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header
          title={
            t('churchesPlantedLast10Years')?.trim() || 'Churches Planted (Last 10 Years)'
          }
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.mainColor} />
          </View>
        ) : years.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.infoText, {color: C.textSecondary}]}>{t('noDataFound')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            horizontal={years.length > 6}
            showsHorizontalScrollIndicator>
            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              {graphTitle ? (
                <Text style={[styles.subtitle, {color: C.textSecondary}]} numberOfLines={3}>
                  {graphTitle}
                </Text>
              ) : null}

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, {backgroundColor: COLORS.mainColor}]} />
                  <Text style={[styles.legendText, {color: C.textSecondary}]}>
                    {t('churchesPlanting') || 'Planted'}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, {backgroundColor: DISABLED_COLOR}]} />
                  <Text style={[styles.legendText, {color: C.textSecondary}]}>
                    {t('disabled') || 'Disabled'}
                  </Text>
                </View>
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

                <View style={{width: chartWidth}}>
                  <Svg width={chartWidth} height={SVG_TOTAL_HEIGHT}>
                    {yTicks.map(tick => (
                      <Line
                        key={`h-${tick.value}`}
                        x1={PADDING_X}
                        y1={tick.y}
                        x2={chartWidth - PADDING_RIGHT}
                        y2={tick.y}
                        stroke={C.inputBorder}
                        strokeWidth={0.8}
                        opacity={0.55}
                      />
                    ))}
                    <Line
                      x1={PADDING_X}
                      y1={plotBottomY}
                      x2={chartWidth - PADDING_RIGHT}
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
                    {bars.map(b => (
                      <React.Fragment key={b.key}>
                        {b.hDisabled > 0.5 ? (
                          <Rect
                            x={b.cx}
                            y={b.yDisabledTop}
                            width={BAR_WIDTH}
                            height={b.hDisabled}
                            fill={DISABLED_COLOR}
                            rx={rs(3)}
                            ry={rs(3)}
                          />
                        ) : null}
                        {b.hActive > 0.5 ? (
                          <Rect
                            x={b.cx}
                            y={b.yActiveTop}
                            width={BAR_WIDTH}
                            height={b.hActive}
                            fill={COLORS.mainColor}
                            rx={rs(3)}
                            ry={rs(3)}
                          />
                        ) : null}
                      </React.Fragment>
                    ))}
                    {bars.map(b => {
                      const tx = b.cx + BAR_WIDTH / 2;
                      const y = plotBottomY + ms(8);
                      return (
                        <SvgText
                          key={`lbl-${b.year}`}
                          x={tx}
                          y={y}
                          fill={C.textPrimary}
                          fontSize={fs(10)}
                          fontWeight="600"
                          textAnchor="middle"
                          alignmentBaseline="hanging">
                          {String(b.year)}
                        </SvgText>
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
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: ms(10),
    gap: ms(16),
  },
  legendItem: {flexDirection: 'row', alignItems: 'center'},
  legendSwatch: {width: ms(10), height: ms(10), borderRadius: rs(2), marginRight: ms(6)},
  legendText: {fontSize: fs(12)},
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {fontSize: fs(14)},
  chartRow: {flexDirection: 'row', alignItems: 'flex-start'},
  yAxisWrap: {
    width: Y_AXIS_WIDTH,
    height: SVG_TOTAL_HEIGHT,
    position: 'relative',
  },
  yAxisTickWrap: {position: 'absolute', right: 0},
  yAxisLabel: {fontSize: fs(9)},
});
