import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useUiTokens} from '../../styles/uiTokens';
import {fs, ms, rs, ws} from '../../utils/scale';
import {UiIconProps} from '../icons/UiIcons';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

type Props = {
  label: string;
  tone?: BadgeTone;
  /** Optional leading icon component from UiIcons. */
  icon?: React.FC<UiIconProps>;
};

/** Pill-shaped status chip. Pair colour with text/icon, never colour alone. */
export const StatusBadge: React.FC<Props> = ({label, tone = 'neutral', icon: Icon}) => {
  const T = useUiTokens();
  const map = {
    brand: [T.brandText, T.brandTint],
    success: [T.successText, T.successTint],
    warning: [T.warningText, T.warningTint],
    danger: [T.dangerText, T.dangerTint],
    neutral: [T.neutralText, T.neutralTint],
  } as const;
  const [color, bg] = map[tone];
  return (
    <View style={[styles.badge, {backgroundColor: bg}]}>
      {Icon && <Icon size={ws(12)} color={color} />}
      <Text style={[styles.text, {color}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: ms(4),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: rs(999),
  },
  text: {
    fontSize: fs(11),
    fontWeight: '600',
  },
});
