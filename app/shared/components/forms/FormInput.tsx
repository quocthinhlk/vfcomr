import React from 'react';
import {Input, Text} from '@ui-kitten/components';
import {View, StyleSheet} from 'react-native';
import {fs, ms} from '../../utils/scale';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  onBlur?: () => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  error?: string;
}

export default function FormInput({
  label,
  value,
  onChangeText,
  onBlur,
  keyboardType = 'default',
  error,
}: FormInputProps) {
  return (
    <View style={styles.wrapper}>
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        status={error ? 'danger' : 'basic'}
      />
      {error && <Text style={styles.errorText} status="danger">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: ms(8),
    flex: 1,
  },
  errorText: {
    marginTop: ms(4),
    fontSize: fs(12),
  },
});