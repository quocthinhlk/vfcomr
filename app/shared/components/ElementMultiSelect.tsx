import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {MultiSelect} from 'react-native-element-dropdown';
import {useThemedColors} from '../styles/theme';
import {FORM_INPUT_HEIGHT} from '../styles/form';
import {fs, hs, ms, rs} from '../utils/scale';
import type {ElementDropdownItem} from './ElementDropdown';

interface Props {
  data: ElementDropdownItem[];
  /** Selected values (numbers or strings, matching `data[].value`). */
  value: Array<string | number>;
  onChange: (value: Array<string | number>) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Multi-value counterpart of ElementDropdown (same look): pick several items
 * from a searchable list; picks show as removable chips under the field.
 */
const ElementMultiSelect: React.FC<Props> = ({
  data,
  value,
  onChange,
  placeholder = 'Select options',
  error = false,
  disabled = false,
  containerStyle,
  accessibilityLabel,
}) => {
  const C = useThemedColors();

  // MultiSelect works with string values; map back to the original type.
  const byKey = useMemo(() => {
    const map = new Map<string, string | number>();
    data.forEach(item => map.set(String(item.value), item.value));
    return map;
  }, [data]);
  const stringData = useMemo(
    () => data.map(item => ({...item, value: String(item.value)})),
    [data],
  );
  const selected = useMemo(() => value.map(v => String(v)), [value]);

  const themed = useMemo(
    () =>
      StyleSheet.create({
        field: {
          borderWidth: 1,
          borderRadius: rs(3),
          minHeight: FORM_INPUT_HEIGHT,
          paddingLeft: ms(12),
          paddingRight: ms(8),
          backgroundColor: C.inputBg,
          borderColor: error ? C.error || '#ff4444' : C.inputBorder,
          opacity: disabled ? 0.6 : 1,
        },
        list: {borderColor: C.inputBorder, backgroundColor: C.inputBg},
        placeholder: {fontSize: fs(14), color: C.textSecondary},
        itemText: {fontSize: fs(14), color: C.textPrimary},
        search: {fontSize: fs(16), color: C.inputText, height: hs(40)},
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: rs(14),
          borderWidth: 1,
          borderColor: C.inputBorder,
          backgroundColor: C.bgSelectedOption,
          paddingVertical: ms(4),
          paddingLeft: ms(10),
          paddingRight: ms(6),
          marginTop: ms(8),
          marginRight: ms(8),
          maxWidth: '100%',
        },
        chipText: {fontSize: fs(13), color: C.textPrimary, flexShrink: 1},
        chipRemove: {fontSize: fs(16), color: C.textSecondary, marginLeft: ms(6)},
      }),
    [C, error, disabled],
  );

  return (
    <View style={styles.wrap}>
      <MultiSelect
        style={[themed.field, containerStyle]}
        containerStyle={themed.list}
        data={stringData}
        labelField="label"
        valueField="value"
        value={selected}
        onChange={next => onChange(next.map(key => byKey.get(key) ?? key))}
        placeholder={placeholder}
        searchPlaceholder={placeholder}
        search
        disable={disabled}
        placeholderStyle={themed.placeholder}
        selectedTextStyle={themed.itemText}
        itemTextStyle={themed.itemText}
        inputSearchStyle={themed.search}
        activeColor={C.bgSelectedOption}
        maxHeight={hs(320)}
        accessibilityLabel={accessibilityLabel}
        renderSelectedItem={(item, unSelect) => (
          <Pressable
            onPress={() => !disabled && unSelect?.(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.label}`}
            style={themed.chip}>
            <Text style={themed.chipText} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={themed.chipRemove}>×</Text>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {flexShrink: 1},
});

export default ElementMultiSelect;
