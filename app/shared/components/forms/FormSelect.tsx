import React from 'react';
import {Select, SelectItem, Text} from '@ui-kitten/components';
import {View, StyleSheet} from 'react-native';
import {useThemedColors} from '../../styles/theme';
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
  const C = useThemedColors();

  return (
    <View style={styles.wrapper}>
      <Text category="label" style={styles.label}>{label}</Text>
      <Select
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        value={valueLabel}
        status={error ? 'danger' : 'basic'}
        style={[
          styles.control,
          {
            backgroundColor: C.inputBg,
            borderColor: C.inputBorder,
          },
        ]}
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
  control: {
    borderRadius: 6,
  },
  errorText: {
    fontSize: fs(12),
    marginTop: ms(4),
  },
});