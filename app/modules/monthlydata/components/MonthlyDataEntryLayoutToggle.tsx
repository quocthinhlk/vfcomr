import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import type {MonthlyDataEntryColumnLayout} from '../constants/monthlyDataEntryLayout';

const ICON = 13;
const BTN = hs(20);
const SW = 1.15;

type LayoutIconProps = {
  variant: 'single' | 'double';
  color: string;
};

/** Minimal list vs columns glyph (no box — reads cleaner at small size). */
function LayoutGlyph({variant, color}: LayoutIconProps) {
  if (variant === 'single') {
    return (
      <Svg width={ICON} height={ICON} viewBox="0 0 14 14" fill="none">
        <Path
          d="M2.5 4h9M2.5 7h9M2.5 10h9"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 14 14" fill="none">
      <Path
        d="M2.5 4h3.25M2.5 7h3.25M8.25 4H11.5M8.25 7H11.5"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

type Props = {
  value: MonthlyDataEntryColumnLayout;
  onChange: (layout: MonthlyDataEntryColumnLayout) => void;
  style?: StyleProp<ViewStyle>;
};

export function MonthlyDataEntryLayoutToggle({value, onChange, style}: Props) {
  const {t} = useTranslation();
  const C = useThemedColors();

  const singleLabel = t('monthlyDataEntryLayoutSingle') || '1 column';
  const doubleLabel = t('monthlyDataEntryLayoutDouble') || '2 columns';

  const renderBtn = (
    layout: MonthlyDataEntryColumnLayout,
    variant: 'single' | 'double',
    label: string,
  ) => {
    const on = value === layout;
    return (
      <Pressable
        onPress={() => onChange(layout)}
        style={({pressed}) => [
          styles.btn,
          on && {backgroundColor: `${COLORS.mainColor}22`},
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{selected: on}}
        accessibilityLabel={label}
        hitSlop={4}>
        <LayoutGlyph
          variant={variant}
          color={on ? COLORS.mainColor : C.textSecondary}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.wrap, {borderColor: C.border}, style]}
      accessibilityRole="tablist">
      {renderBtn('single', 'single', singleLabel)}
      <View style={[styles.sep, {backgroundColor: C.border}]} />
      {renderBtn('double', 'double', doubleLabel)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BTN,
    borderRadius: rs(3),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  btn: {
    width: BTN + ms(2),
    height: BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.65,
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    height: hs(14),
    opacity: 0.8,
  },
});
