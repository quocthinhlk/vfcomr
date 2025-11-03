import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, Text as RNText } from 'react-native';
import { Button } from '@ui-kitten/components';
import { COLORS } from '../constants/colors';

interface ActionButtonProps {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SaveButton: React.FC<ActionButtonProps> = ({ label = 'Save', onPress, disabled, style }) => {
  return (
    <Button
      status='primary'
      style={[styles.btn, styles.saveBtn, style]}
      onPress={onPress}
      disabled={disabled}
    >
      {label}
    </Button>
  );
};

export const CancelButton: React.FC<ActionButtonProps> = ({ label = 'Cancel', onPress, disabled, style }) => {
  return (
    <Button
      status='basic'
      style={[styles.btn, styles.cancelBtn, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <RNText style={styles.cancelBtnText}>{label}</RNText>
    </Button>
  );
};

export const DeleteButton: React.FC<ActionButtonProps> = ({ label = 'Delete', onPress, disabled, style }) => {
  return (
    <Button
      status='danger'
      style={[styles.btn, styles.deleteBtn, style]}
      onPress={onPress}
      disabled={disabled}
    >
      {label}
    </Button>
  );
};

const styles = StyleSheet.create({
  btn: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  cancelBtn: {
    borderColor: '#ccc',
  },
  cancelBtnText: {
    color: COLORS.mainColor,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerColor,
    borderColor: COLORS.dangerColor,
  },
});

export default { SaveButton, CancelButton, DeleteButton }; 