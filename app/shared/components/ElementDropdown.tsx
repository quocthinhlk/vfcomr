import React, { useMemo, useRef } from 'react';
import { TouchableOpacity, Text as RNText, TextInput, ViewStyle, StyleSheet, Keyboard, Platform } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useThemedColors } from '../styles/theme';

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
        borderRadius: 6,
        height: 44,
        paddingLeft: 12,
        paddingRight: 5,
        backgroundColor: C.inputBg,
        borderColor: C.inputBorder,
      },
      dropdownContainer: {
        borderColor: C.inputBorder,
        backgroundColor: C.surface,
      },
      searchInput: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: C.inputText,
        borderBottomColor: C.surfaceBorder,
        borderBottomWidth: 1,
        backgroundColor: C.surface,
      },
      downArrow: {
        fontSize: 22,
        color: C.textSecondary,
        marginRight: 8,
      },
      clearButton: { paddingHorizontal: 0, marginRight: 8 },
      clearText: { fontSize: 20, color: C.textSecondary },
      selectedText: { fontSize: 14, color: C.textPrimary },
      placeholderText: { fontSize: 16, color: C.textSecondary },
      itemText: { fontSize: 14, color: C.textPrimary, lineHeight: 0 },
      itemContainer: { paddingVertical: 1, minHeight: 26, backgroundColor: C.surface },
    })
  , [C]);
  const renderRightIcon = () => {
    if (!value) {
      return <RNText style={themed.downArrow}>›</RNText>;
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