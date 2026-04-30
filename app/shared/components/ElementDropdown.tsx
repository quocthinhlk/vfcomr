import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  TouchableOpacity,
  Text as RNText,
  TextInput,
  View,
  ViewStyle,
  Keyboard,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
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
  renderItem?: (item: ElementDropdownItem) => React.ReactElement | null;
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
  renderItem,
}) => {
  const C = useThemedColors();
  const searchRef = useRef<TextInput>(null);
  const anchorRef = useRef<View>(null);
  const {height: windowH} = useWindowDimensions();
  const [keyboardH, setKeyboardH] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<'auto' | 'top' | 'bottom'>('auto');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined);

  const blurAnyFocusedInput = () => {
    try {
      // RN 0.62+ (Fabric-friendly)
      const focused = (TextInput as any)?.State?.currentlyFocusedInput?.();
      if (focused?.blur) {
        focused.blur();
        return;
      }
    } catch {}
    try {
      // Legacy fallback
      const focusedField = (TextInput as any)?.State?.currentlyFocusedField?.();
      if (focusedField != null) {
        (TextInput as any)?.State?.blurTextInput?.(focusedField);
      }
    } catch {}
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardH(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardH(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        backgroundColor: C.inputBg,
      },
      searchInput: {
        paddingHorizontal: ms(12),
        paddingVertical: ms(8),
        fontSize: fs(16),
        color: C.inputText,
        borderBottomColor: C.surfaceBorder,
        borderBottomWidth: 1,
        backgroundColor: C.inputBg,
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
      itemContainer: { paddingVertical: ms(1), minHeight: hs(32), justifyContent: 'center', backgroundColor: C.inputBg },
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

  const computeBestPosition = () => {
    const margin = ms(12);
    try {
      anchorRef.current?.measureInWindow((_x, y, _w, h) => {
        const usableBottom = Math.max(0, windowH - keyboardH);
        const below = usableBottom - (y + h) - margin;
        const above = y - margin;
        const pos: 'top' | 'bottom' = below >= above ? 'bottom' : 'top';
        setDropdownPosition(pos);

        const available = pos === 'bottom' ? below : above;
        const maxH = Math.max(hs(180), Math.floor(available));
        setDropdownMaxHeight(maxH);
      });
    } catch {
      setDropdownPosition('auto');
      setDropdownMaxHeight(undefined);
    }
  };

  return (
    <View ref={anchorRef}>
      <Dropdown
        style={[themed.dropdown, error ? {borderColor: C.error || '#ff4444'} : null, containerStyle]}
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
          // Prevent previously-focused TextInput from regaining focus and auto-scrolling
          blurAnyFocusedInput();
          Keyboard.dismiss();
        }}
        // NOTE: do not forward Dropdown's internal search text events here.
        // We handle search via `renderInputSearch` below to avoid duplicate calls.
        renderItem={renderItem as any}
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
        dropdownPosition={dropdownPosition as any}
        maxHeight={dropdownMaxHeight as any}
        onFocus={() => {
          // Ensure dropdown is fully visible near keyboard/screen edges
          onOpen && onOpen();
          onFocus && onFocus();
          // Avoid auto-scroll back to previously focused input
          blurAnyFocusedInput();
          Keyboard.dismiss();
          computeBestPosition();
          try {
            // Delay to allow dropdown to mount input
            setTimeout(() => searchRef.current?.focus(), Platform.OS === 'android' ? 80 : 0);
          } catch {}
        }}
      />
    </View>
  );
};

export default ElementDropdown;