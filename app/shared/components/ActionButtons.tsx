import React from 'react';
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  Text as RNText,
  TouchableOpacity,
  TextStyle,
  View,
} from 'react-native';
import {COLORS} from '../constants/colors';
import {fs, ms, rs} from '../utils/scale';
import {FORM_INPUT_HEIGHT} from '../styles/form';

interface ActionButtonProps {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Stretch to the container width instead of sharing a row (flex: 1). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

type BaseButtonProps = ActionButtonProps & {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const BaseActionButton: React.FC<BaseButtonProps> = ({
  label,
  onPress,
  disabled,
  fullWidth,
  style,
  backgroundColor,
  borderColor,
  textColor,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        fullWidth && styles.fullWidth,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}>
      <RNText style={[styles.btnText, {color: textColor}]}>
        {label || ''}
      </RNText>
    </TouchableOpacity>
  );
};

export const SaveButton: React.FC<ActionButtonProps> = ({
  label = 'Save',
  onPress,
  disabled,
  style,
}) => (
  <BaseActionButton
    label={label}
    onPress={onPress}
    disabled={disabled}
    style={style}
    backgroundColor={COLORS.mainColor}
    borderColor={COLORS.mainColor}
    textColor={COLORS.white}
  />
);

export const CancelButton: React.FC<ActionButtonProps> = ({
  label = 'Cancel',
  onPress,
  disabled,
  style,
}) => (
  <BaseActionButton
    label={label}
    onPress={onPress}
    disabled={disabled}
    style={style}
    backgroundColor={COLORS.white}
    borderColor="#ccc"
    textColor={COLORS.black}
  />
);

export const DeleteButton: React.FC<ActionButtonProps> = ({
  label = 'Delete',
  onPress,
  disabled,
  fullWidth,
  style,
}) => (
  <BaseActionButton
    label={label}
    onPress={onPress}
    disabled={disabled}
    fullWidth={fullWidth}
    style={style}
    backgroundColor={COLORS.dangerColor}
    borderColor={COLORS.dangerColor}
    textColor={COLORS.white}
  />
);

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: FORM_INPUT_HEIGHT,
    borderRadius: rs(3),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(10),
  },
  fullWidth: {
    flex: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  btnText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
});

export default { SaveButton, CancelButton, DeleteButton }; 