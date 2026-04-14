import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText, ViewStyle, TextStyle } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import { useThemedColors } from '../styles/theme';

export interface SelectListItem { key: number | string; value: string }

interface SelectListWithClearProps {
  data: SelectListItem[];
  selectedId: number | string | null;
  onChange: (id: number | string | null, label: string) => void;
  placeholder?: string;
  boxStyles?: ViewStyle;
  dropdownStyles?: ViewStyle;
  inputStyles?: TextStyle;
  loadMoreKey?: string;
  onLoadMore?: () => void;
  onSearchText?: (text: string) => void;
}

export const SelectListWithClear: React.FC<SelectListWithClearProps> = ({
  data,
  selectedId,
  onChange,
  placeholder = 'Select... (optional)',
  boxStyles,
  dropdownStyles,
  inputStyles,
  loadMoreKey,
  onLoadMore,
  onSearchText,
}) => {
  const C = useThemedColors();
  const [selectKey, setSelectKey] = useState(0);
  const [hasSelection, setHasSelection] = useState<boolean>(selectedId != null);

  const labelById = useMemo(() => {
    const map = new Map<string | number, string>();
    data.forEach(d => map.set(d.key, d.value));
    return map;
  }, [data]);

  const computedBoxStyle: ViewStyle = {
    ...styles.box,
    backgroundColor: C.inputBg,
    borderColor: C.inputBorder,
    ...(boxStyles || {}),
  };
  const computedDropdownStyle: ViewStyle = {
    ...styles.dropdown,
    backgroundColor: C.inputBg,
    borderColor: C.inputBorder,
    ...(dropdownStyles || {}),
  };
  const computedInputStyle: TextStyle = {
    ...styles.input,
    color: C.inputText,
    ...(inputStyles || {}),
  };
  const defaultOption = selectedId != null ? { key: selectedId as any, value: labelById.get(selectedId) || '' } : undefined;

  return (
    <View style={styles.wrapper} pointerEvents='box-none'>
      <SelectList
        key={selectKey}
        setSelected={(val: any) => {
          // Handle Load More sentinel
          if (loadMoreKey && val === loadMoreKey) {
            onLoadMore && onLoadMore();
            setSelectKey(k => k + 1); // remount to keep current value
            return;
          }
          const nextId = (val === '' || val == null) ? null : val;
          const label = nextId != null ? (labelById.get(nextId) || '') : '';
          setHasSelection(nextId != null);
          onChange(nextId, label);
        }}
        data={data}
        save='key'
        search
        searchPlaceholder='Search...'
        placeholder={placeholder}
        boxStyles={computedBoxStyle}
        dropdownStyles={computedDropdownStyle}
        inputStyles={computedInputStyle}
        defaultOption={defaultOption as any}
      />
      {hasSelection ? (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.clearIconWrap}
          onPress={() => {
            setHasSelection(false);
            onChange(null, '');
            setSelectKey(k => k + 1);
          }}
        >
          <RNText style={[styles.clearIconText, {color: C.textSecondary}]}>×</RNText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  box: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    height: 44,
    paddingLeft: 12,
    paddingRight: 40,
    marginBottom: 12,
  },
  dropdown: {
    borderColor: '#ddd',
    zIndex: 1000,
    elevation: 10,
  },
  input: {
    color: '#000',
  },
  clearIconWrap: {
    position: 'absolute',
    right: 8,
    top: 6,
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    elevation: 20,
  },
  clearIconText: {
    fontSize: 18,
    color: '#999',
  },
});

export default SelectListWithClear;
