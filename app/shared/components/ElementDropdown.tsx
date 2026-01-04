import React, { useMemo, useRef } from 'react';
import { TouchableOpacity, Text as RNText, TextInput, ViewStyle, Keyboard, Platform, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useThemedColors } from '../styles/theme';
import { fs, ws, hs, ms, rs } from '../utils/scale';
import { FORM_INPUT_HEIGHT } from '../styles/form';

export interface ElementDropdownItem { label: string; value: string | number }

interface ElementDropdownProps {
  data: ElementDropdownItem[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  dropdownContainerStyle?: ViewStyle; // style for dropdown list container
  optionItemStyle?: ViewStyle; // style override for option rows
  activeItemColor?: string; // background for selected row in dropdown
  error?: boolean;
  search?: boolean;
  onSearchText?: (text: string) => void;
  onEndReached?: () => void;
  onFocus?: () => void;
  onOpen?: () => void; // allow parent to scroll before opening
}

const ElementDropdown: React.FC<ElementDropdownProps> = ({
  data,
  value,
  onChange,
  placeholder = 'Select option',
  containerStyle,
  dropdownContainerStyle,
  optionItemStyle,
  activeItemColor,
  error = false,
  search = true,
  onSearchText,
  onEndReached,
  onFocus,
  onOpen,
}) => {
  const C = useThemedColors();
  const searchRef = useRef<TextInput>(null);

  const themed = useMemo(() =>
    StyleSheet.create({
      dropdown: {
        borderWidth: 1,
        borderRadius: rs(3),
        height: FORM_INPUT_HEIGHT,
        paddingLeft: ms(12),
        paddingRight: ms(5),
        backgroundColor: C.inputBg,
        borderColor: C.inputBorder,
      },
      dropdownContainer: {
        borderColor: C.inputBorder,
        backgroundColor: C.surface,
      },
      searchInput: {
        paddingHorizontal: ms(12),
        paddingVertical: ms(8),
        fontSize: fs(16),
        color: C.inputText,
        borderBottomColor: C.surfaceBorder,
        borderBottomWidth: 1,
        backgroundColor: C.surface,
      },
      downArrow: {
        fontSize: fs(16),
        color: C.textSecondary,
        marginRight: ms(8),
        marginBottom: ms(5),
      },
      clearButton: { paddingHorizontal: 0, marginRight: ms(8) },
      clearText: { fontSize: fs(20), color: C.textSecondary },
      selectedText: { fontSize: fs(14), color: C.textPrimary },
      placeholderText: { fontSize: fs(14), color: C.textSecondary, lineHeight: fs(14) },
      itemText: { fontSize: fs(14), color: C.textPrimary, lineHeight: fs(15) },
      itemContainer: { paddingVertical: ms(1), minHeight: hs(32), justifyContent: 'center', backgroundColor: C.surface },
    })
  , [C]);
  const renderRightIcon = () => {
    if (!value) {
      return <RNText style={themed.downArrow}>⌵</RNText>;
    }

    return (
      <TouchableOpacity onPress={() => onChange(null)} style={themed.clearButton}>
        <RNText style={themed.clearText}>×</RNText>
      </TouchableOpacity>
    );
  };

  return (
    <Dropdown
      style={[ themed.dropdown, error ? { borderColor: '#db2d2d' } : null, containerStyle ]}
      containerStyle={[themed.dropdownContainer, dropdownContainerStyle]}
      data={data}
      labelField="label"
      valueField="value"
      placeholder={placeholder}
      value={value as any}
      search={search}
      searchPlaceholder={placeholder}
      onChange={item => {
        // Preserve selected label in internal display by setting value to match items
        onChange((item?.value as any) ?? null);
      }}
      onChangeText={text => onSearchText && onSearchText(text)}
      renderInputSearch={(onSearch) => (
        <TextInput
          ref={searchRef}
          placeholder={placeholder}
          autoFocus
          style={themed.searchInput}
          onChangeText={(t) => {
            onSearch(t);
            onSearchText && onSearchText(t);
          }}
        />
      )}
      flatListProps={
        onEndReached
          ? { onEndReached: onEndReached, onEndReachedThreshold: 0.2 }
          : undefined
      }
      renderRightIcon={renderRightIcon}
      selectedTextStyle={themed.selectedText}
      placeholderStyle={themed.placeholderText}
      itemTextStyle={themed.itemText}
      itemContainerStyle={[themed.itemContainer, optionItemStyle]}
      // activeColor={activeItemColor as any}
      activeColor={C.bgSelectedOption}
      dropdownPosition="auto"
      onFocus={() => {
        // Ensure keyboard shows for search input on both iOS and Android
        onOpen && onOpen();
        onFocus && onFocus();
        try {
          // Delay to allow dropdown to mount input
          setTimeout(() => searchRef.current?.focus(), Platform.OS === 'android' ? 80 : 0);
        } catch {}
      }}
    />
  );
};

export default ElementDropdown;