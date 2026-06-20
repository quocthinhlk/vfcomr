import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {fs, ms, rs} from '../../../shared/utils/scale';

const TOOLTIP_MAX_WIDTH = ms(240);
const TOOLTIP_EST_WIDTH = ms(210);
const HORIZONTAL_OFFSET = ms(10);
const VERTICAL_OFFSET = ms(6);

type Props = {
  cx: number;
  cy: number;
  text: string;
  chartWidth: number;
  chartHeight: number;
};

export function getChartPointTooltipPosition(
  cx: number,
  cy: number,
  chartWidth: number,
  chartHeight: number,
) {
  let left = cx + HORIZONTAL_OFFSET;
  if (left + TOOLTIP_EST_WIDTH > chartWidth - ms(8)) {
    left = cx - TOOLTIP_EST_WIDTH - HORIZONTAL_OFFSET;
  }
  left = Math.max(ms(4), Math.min(left, chartWidth - TOOLTIP_EST_WIDTH - ms(4)));

  let top = cy + VERTICAL_OFFSET;
  top = Math.max(ms(4), Math.min(top, chartHeight - ms(36)));

  return {left, top};
}

export function ChartPointTooltip({cx, cy, text, chartWidth, chartHeight}: Props) {
  const position = getChartPointTooltipPosition(cx, cy, chartWidth, chartHeight);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: position.left,
          top: position.top,
          maxWidth: TOOLTIP_MAX_WIDTH,
        },
      ]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: '#2b2b2b',
    borderRadius: rs(6),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: ms(2)},
    shadowOpacity: 0.25,
    shadowRadius: ms(4),
    elevation: 4,
  },
  text: {
    color: '#ffffff',
    fontSize: fs(11),
    lineHeight: fs(15),
    fontWeight: '500',
  },
});
