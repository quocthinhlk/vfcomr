import React from 'react';
import {StyleProp, Text, TextStyle, View, ViewStyle} from 'react-native';
import {ms, rs} from './scale';

type ThemeLikeColors = {
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  inputBorder: string;
};

export type HierarchyDropdownItem = {label: string; value: string | number};

export function getHierarchyDepthAndLabel(rawLabel: string): {
  depth: number;
  cleanLabel: string;
} {
  const match = rawLabel.match(/^(-+)\s*(.*)$/);
  if (!match) {
    return {depth: 0, cleanLabel: rawLabel.trim()};
  }
  const dashes = match[1] || '';
  const rest = (match[2] || '').trim();
  return {depth: dashes.length, cleanLabel: rest || rawLabel.trim()};
}

const DEPTH_COLORS = [
  undefined,
  '#C62828', // red
  '#1565C0', // blue
  '#2E7D32', // green
  '#6A1B9A', // purple
  '#EF6C00', // orange
];

export function getHierarchyDropdownItemStyles(
  label: string,
  C: ThemeLikeColors,
): {containerStyle: StyleProp<ViewStyle>; textStyle: StyleProp<TextStyle>; displayLabel: string} {
  const {depth, cleanLabel} = getHierarchyDepthAndLabel(label);
  const color = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)] ?? C.textPrimary;
  const indent = ms(Math.min(depth, 6) * 10);
  const d = Math.min(depth, 6);
  const horizontalPrefix = depth > 0 ? `${'-'.repeat(d)} ` : '';

  return {
    displayLabel: `${horizontalPrefix}${cleanLabel}`,
    containerStyle: [
      {
        paddingLeft: indent,
        paddingRight: ms(12),
        borderRadius: rs(2),
        marginVertical: ms(2),
      },
    ],
    textStyle: [
      {
        color,
        fontWeight: depth === 0 ? '700' : depth === 1 ? '700' : '600',
      },
    ],
  };
}

export function createHierarchyDropdownRenderItem(C: ThemeLikeColors) {
  return (item: HierarchyDropdownItem) => {
    const {containerStyle, textStyle, displayLabel} =
      getHierarchyDropdownItemStyles(item.label, C);
    return (
      <View style={containerStyle}>
        <Text style={textStyle}>{displayLabel}</Text>
      </View>
    );
  };
}

