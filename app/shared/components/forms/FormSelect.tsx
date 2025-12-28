import React from 'react';
import {Select, SelectItem, Text} from '@ui-kitten/components';
import {View, StyleSheet} from 'react-native';
import {fs, ms} from '../../utils/scale';

interface Option {
  label: string;
  value: any;
}

interface FormSelectProps {
  label: string;
  selectedIndex: any;
  onSelect: (index: any) => void;
  options: Option[];
  valueLabel: string;
  error?: string;
}

export default function FormSelect({
  label,
  selectedIndex,
  onSelect,
  options,
  valueLabel,
  error,
}: FormSelectProps) {
  return (
    <View style={styles.wrapper}>
      <Text category="label" style={styles.label}>{label}</Text>
      <Select
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        value={valueLabel}
        status={error ? 'danger' : 'basic'}
      >
        {options.map((opt, i) => (
          <SelectItem key={i} title={opt.label} />
        ))}
      </Select>
      {error && <Text style={styles.errorText} status="danger">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: ms(8),
    flex: 1,
  },
  label: {
    marginBottom: ms(4),
  },
  errorText: {
    fontSize: fs(12),
    marginTop: ms(4),
  },
});