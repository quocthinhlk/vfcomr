// app/shared/components/AppButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { fs, ms, rs } from '../utils/scale';
import { COLORS } from '../constants/colors';
import { FORM_INPUT_HEIGHT } from '../styles/form';

type ButtonVariant = 'primary' | 'secondary' | 'gray';

interface AppButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function AppButton({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: AppButtonProps) {
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button, styles[variant]];
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }
    if (style) {
      baseStyle.push(style);
    }
    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseTextStyle: TextStyle[] = [styles.text, styles[`${variant}Text` as keyof typeof styles] as TextStyle];
    if (disabled || loading) {
      baseTextStyle.push(styles.disabledText);
    }
    if (textStyle) {
      baseTextStyle.push(textStyle);
    }
    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={variant === 'gray' ? COLORS.black : COLORS.white} />
      ) : (
        <Text style={getTextStyle()}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: FORM_INPUT_HEIGHT,
    borderRadius: rs(3),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  secondary: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  gray: {
    backgroundColor: COLORS.lightGray,
    borderColor: COLORS.lightGray,
  },
  text: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  primaryText: {
    color: COLORS.white,
  },
  secondaryText: {
    color: COLORS.white,
  },
  grayText: {
    color: COLORS.black,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

