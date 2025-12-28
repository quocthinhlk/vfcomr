import React from 'react';
import {Datepicker, Text} from '@ui-kitten/components';
import {View, StyleSheet} from 'react-native';
import {useThemedColors} from '../../styles/theme';
import {useThemeMode} from '../../context/ThemeContext';
import {fs, ms, rs} from '../../utils/scale';

interface FormDatePickerProps {
  label: string;
  date: Date | null;
  onSelect: (date: Date) => void;
  error?: string;
}

export default function FormDatePicker({
  label,
  date,
  onSelect,
  error,
}: FormDatePickerProps) {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  return (
    <View style={styles.wrapper}>
      <Datepicker
        label={label}
        date={date === null ? undefined : date}
        onSelect={onSelect}
        status={error ? 'danger' : 'basic'}
        style={{backgroundColor: 'transparent'}}
        controlStyle={{
          backgroundColor: theme === 'dark' ? C.inputBg : '#fff',
          borderColor: C.inputBorder,
          borderWidth: 1,
          borderRadius: rs(6),
        }}
      />
      {error && (
        <Text status="danger" style={styles.errorText}>
          {error}
        </Text>
      )}
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