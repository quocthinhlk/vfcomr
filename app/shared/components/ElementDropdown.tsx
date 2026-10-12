import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text as RNText,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemedColors} from '../styles/theme';
import {useUiTokens} from '../styles/uiTokens';
import {useTranslation} from '../hooks/useTranslation';
import {CheckIcon} from './icons/UiIcons';
import {fs, ws, hs, ms, rs} from '../utils/scale';
import {FORM_INPUT_HEIGHT} from '../styles/form';

export interface ElementDropdownItem {
  label: string;
  value: string | number;
  color?: string;
  /** Secondary line under the label (e.g. a parent path). */
  description?: string;
  /** Small text on the right of the row (e.g. "#12"). */
  meta?: string;
}

interface ElementDropdownProps {
  data: ElementDropdownItem[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  /** Sheet title; defaults to `placeholder`. */
  title?: string;
  /** Small helper line under the sheet title. */
  note?: string;
  containerStyle?: ViewStyle;
  dropdownContainerStyle?: ViewStyle; // style for the sheet
  optionItemStyle?: ViewStyle; // style override for option rows
  activeItemColor?: string; // background for selected row
  error?: boolean;
  search?: boolean;
  disabled?: boolean;
  onSearchText?: (text: string) => void;
  onEndReached?: () => void;
  onFocus?: () => void;
  onOpen?: () => void;
  renderItem?: (item: ElementDropdownItem) => React.ReactElement | null;
}

/** Select field that opens a bottom sheet (search + list), styled like MultiSelectSheet. */
const ElementDropdown: React.FC<ElementDropdownProps> = ({
  data,
  value,
  onChange,
  placeholder = 'Select option',
  title,
  note,
  containerStyle,
  dropdownContainerStyle,
  optionItemStyle,
  activeItemColor,
  error = false,
  search = true,
  disabled = false,
  onSearchText,
  onEndReached,
  onFocus,
  onOpen,
  renderItem,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {height: screenH} = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Remote search can replace `data`; keep the picked item so its label still shows.
  const lastPickedRef = useRef<ElementDropdownItem | null>(null);
  const slide = useRef(new Animated.Value(screenH)).current;
  const [keyboardH, setKeyboardH] = useState(0);

  // Track the keyboard ourselves so the sheet shrinks instead of being pushed off the top.
  useEffect(() => {
    if (!open) {
      return;
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => setKeyboardH(e?.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardH(0));
    return () => {
      showSub.remove();
      hideSub.remove();
      setKeyboardH(0);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    slide.setValue(screenH);
    Animated.timing(slide, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, screenH]);

  const selectedItem = useMemo(() => {
    if (value === null || value === undefined) {
      return null;
    }
    const found = data.find(item => item.value === value);
    if (found) {
      return found;
    }
    return lastPickedRef.current?.value === value ? lastPickedRef.current : null;
  }, [data, value]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return data;
    }
    return data.filter(item =>
      `${item.label} ${item.description ?? ''}`.toLowerCase().includes(q),
    );
  }, [data, query]);

  const themed = useMemo(
    () =>
      StyleSheet.create({
        field: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderRadius: rs(3),
          height: FORM_INPUT_HEIGHT,
          paddingLeft: ms(12),
          paddingRight: ms(5),
          backgroundColor: C.inputBg,
          borderColor: C.inputBorder,
        },
        downArrow: {
          fontSize: fs(16),
          color: C.textSecondary,
          marginRight: ms(8),
          marginBottom: ms(5),
        },
        clearText: {fontSize: fs(20), color: C.textSecondary},
        selectedText: {flex: 1, fontSize: fs(14), color: C.textPrimary},
        placeholderText: {flex: 1, fontSize: fs(14), color: C.textSecondary},
      }),
    [C],
  );

  const openSheet = () => {
    if (disabled) {
      return;
    }
    onOpen && onOpen();
    onFocus && onFocus();
    Keyboard.dismiss();
    setQuery('');
    setOpen(true);
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    setOpen(false);
    if (query && onSearchText) {
      // Reset remote search so the next open starts from the full list.
      onSearchText('');
    }
  };

  const pick = (item: ElementDropdownItem) => {
    lastPickedRef.current = item;
    onChange(item.value ?? null);
    closeSheet();
  };

  const onQueryChange = (text: string) => {
    setQuery(text);
    onSearchText && onSearchText(text);
  };

  const renderRightIcon = () => {
    if (disabled) {
      return <RNText style={[themed.downArrow, {opacity: 0.5}]}>⌵</RNText>;
    }
    if (!value) {
      return <RNText style={themed.downArrow}>⌵</RNText>;
    }
    return (
      <TouchableOpacity
        onPress={() => onChange(null)}
        style={styles.clearButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Clear">
        <RNText style={themed.clearText}>×</RNText>
      </TouchableOpacity>
    );
  };

  const renderRow = ({item}: {item: ElementDropdownItem}) => {
    const checked = item.value === value;
    const activeBg = activeItemColor || T.brandTint;
    return (
      <Pressable
        onPress={() => pick(item)}
        accessibilityRole="radio"
        accessibilityState={{checked}}
        accessibilityLabel={item.description ? `${item.label}, ${item.description}` : item.label}
        style={({pressed}) => [
          styles.row,
          optionItemStyle,
          (checked || pressed) && {backgroundColor: activeBg},
        ]}>
        {renderItem ? (
          <View style={styles.rowText}>{renderItem(item)}</View>
        ) : (
          <>
            <View
              style={[
                styles.checkbox,
                {borderColor: checked ? T.brandText : C.border},
                checked && {backgroundColor: T.brandText},
              ]}>
              {checked ? <CheckIcon color={T.sheetBg} size={ws(14)} /> : null}
            </View>
            <View style={styles.rowText}>
              <RNText style={[styles.rowTitle, {color: item.color || C.textPrimary}]}>
                {item.label}
              </RNText>
              {item.description ? (
                <RNText style={[styles.rowPath, {color: C.textSecondary}]}>{item.description}</RNText>
              ) : null}
            </View>
            {item.meta ? (
              <RNText style={[styles.rowMeta, {color: C.textSecondary}]}>{item.meta}</RNText>
            ) : null}
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View>
      <Pressable
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{disabled, expanded: open}}
        accessibilityLabel={selectedItem?.label || placeholder}
        style={[
          themed.field,
          error ? {borderColor: C.error || '#ff4444'} : null,
          disabled ? {opacity: 0.6} : null,
          containerStyle,
        ]}>
        {selectedItem ? (
          <RNText
            style={[themed.selectedText, selectedItem.color ? {color: selectedItem.color} : null]}
            numberOfLines={1}>
            {selectedItem.label}
          </RNText>
        ) : (
          <RNText style={themed.placeholderText} numberOfLines={1}>
            {placeholder}
          </RNText>
        )}
        {renderRightIcon()}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={closeSheet}>
        <View style={[styles.modal, Platform.OS === 'ios' && {paddingBottom: keyboardH}]}>
          <Pressable
            style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(0,0,0,${T.backdropOpacity})`}]}
            onPress={closeSheet}
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
          />
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: T.sheetBg,
                maxHeight: Math.round(
                  Math.min(screenH * 0.82, screenH - keyboardH - insets.top - ms(12)),
                ),
                paddingBottom: keyboardH ? ms(12) : Math.max(insets.bottom, ms(12)),
                transform: [{translateY: slide}],
              },
              dropdownContainerStyle,
            ]}>
            <View style={[styles.handle, {backgroundColor: C.border}]} />
            <RNText style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
              {title || placeholder}
            </RNText>
            {note ? <RNText style={[styles.note, {color: C.textSecondary}]}>{note}</RNText> : null}

            {search ? (
              <TextInput
                value={query}
                onChangeText={onQueryChange}
                placeholder={t('search')}
                placeholderTextColor={C.textSecondary}
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.search, {backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText}]}
                accessibilityLabel={t('search')}
              />
            ) : null}

            <FlatList
              data={visibleItems}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              renderItem={renderRow}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              windowSize={9}
              extraData={value}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.2}
              ListEmptyComponent={
                <RNText style={[styles.emptyText, {color: C.textSecondary}]}>{t('noDataFound')}</RNText>
              }
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  clearButton: {paddingHorizontal: 0, marginRight: ms(8)},
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    paddingTop: ms(8),
    paddingHorizontal: ms(16),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: ms(12),
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  note: {
    marginTop: ms(4),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  search: {
    marginTop: ms(10),
    height: hs(44),
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    fontSize: fs(15),
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: ms(8),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    minHeight: 52,
    paddingVertical: ms(8),
    paddingHorizontal: ms(8),
    borderRadius: rs(10),
  },
  checkbox: {
    width: ws(22),
    height: ws(22),
    borderRadius: rs(6),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  rowPath: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  rowMeta: {
    fontSize: fs(11),
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: ms(24),
    fontSize: fs(14),
  },
});

export default ElementDropdown;
