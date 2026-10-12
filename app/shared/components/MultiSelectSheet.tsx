import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemedColors} from '../styles/theme';
import {useUiTokens} from '../styles/uiTokens';
import {useTranslation} from '../hooks/useTranslation';
import {getApiErrorMessage} from '../utils/apiErrorHandler';
import {CheckIcon} from './icons/UiIcons';
import {fs, hs, ms, rs, ws} from '../utils/scale';

export type MultiSelectOption = {id: number; name: string; path?: string};

type Props = {
  visible: boolean;
  title: string;
  /** Small helper line under the title. */
  note?: string;
  /**
   * Loads options. Called once with '' for a fixed list (`remoteSearch` off,
   * filtered on the device), or on every search for server-side search.
   */
  loadOptions: (search: string) => Promise<MultiSelectOption[]>;
  remoteSearch?: boolean;
  /** Already chosen: hidden, since duplicates are not allowed. */
  excludeIds?: number[];
  saveLabel: string;
  /** Resolve to close the sheet; throw to keep it open and show the error. */
  onSave: (ids: number[]) => Promise<void>;
  onClose: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

/** Bottom sheet to pick several items (search + checkboxes + Save). */
export const MultiSelectSheet: React.FC<Props> = ({
  visible,
  title,
  note,
  loadOptions,
  remoteSearch = false,
  excludeIds = [],
  saveLabel,
  onSave,
  onClose,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {height: screenH} = useWindowDimensions();

  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Map<number, MultiSelectOption>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const requestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = useRef(new Animated.Value(screenH)).current;

  const fetchOptions = useCallback(
    async (search: string) => {
      const id = ++requestRef.current;
      setLoading(true);
      setLoadError('');
      try {
        const next = await loadOptions(search);
        if (id === requestRef.current) {
          setOptions(next);
        }
      } catch (e) {
        if (id === requestRef.current) {
          setLoadError(getApiErrorMessage(e, t));
        }
      } finally {
        if (id === requestRef.current) {
          setLoading(false);
        }
      }
    },
    [loadOptions, t],
  );

  // Fresh state every time the sheet opens.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setQuery('');
    setSelected(new Map());
    setSaveError('');
    setOptions([]);
    fetchOptions('');
    slide.setValue(screenH);
    Animated.timing(slide, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, fetchOptions, slide, screenH]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const onQueryChange = (text: string) => {
    setQuery(text);
    if (!remoteSearch) {
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => fetchOptions(text.trim()), SEARCH_DEBOUNCE_MS);
  };

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(
      o =>
        !excluded.has(o.id) &&
        (remoteSearch || !q || `${o.name} ${o.path ?? ''}`.toLowerCase().includes(q)),
    );
  }, [options, excluded, query, remoteSearch]);

  const toggle = (option: MultiSelectOption) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(option.id)) {
        next.delete(option.id);
      } else {
        next.set(option.id, option);
      }
      return next;
    });
  };

  const save = async () => {
    if (!selected.size || saving) {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSave([...selected.keys()]);
      onClose();
    } catch (e) {
      setSaveError(getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({item}: {item: MultiSelectOption}) => {
    const checked = selected.has(item.id);
    return (
      <Pressable
        onPress={() => toggle(item)}
        accessibilityRole="checkbox"
        accessibilityState={{checked}}
        accessibilityLabel={item.path ? `${item.name}, ${item.path}` : item.name}
        style={({pressed}) => [styles.row, (checked || pressed) && {backgroundColor: T.brandTint}]}>
        <View
          style={[
            styles.checkbox,
            {borderColor: checked ? T.brandText : C.border},
            checked && {backgroundColor: T.brandText},
          ]}>
          {checked ? <CheckIcon color={T.sheetBg} size={ws(14)} /> : null}
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, {color: C.textPrimary}]}>{item.name}</Text>
          {item.path ? (
            <Text style={[styles.rowPath, {color: C.textSecondary}]}>{item.path}</Text>
          ) : null}
        </View>
        <Text style={[styles.rowId, {color: C.textSecondary}]}>#{item.id}</Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(0,0,0,${T.backdropOpacity})`}]}
          onPress={saving ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: T.sheetBg,
              height: Math.round(screenH * 0.82),
              paddingBottom: Math.max(insets.bottom, ms(12)),
              transform: [{translateY: slide}],
            },
          ]}>
          <View style={[styles.handle, {backgroundColor: C.border}]} />
          <Text style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
            {title}
          </Text>
          {note ? <Text style={[styles.note, {color: C.textSecondary}]}>{note}</Text> : null}

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

          <FlatList
            data={visibleOptions}
            keyExtractor={o => String(o.id)}
            renderItem={renderItem}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            windowSize={9}
            extraData={selected}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator style={styles.empty} color={T.brandText} />
              ) : (
                <Text style={[styles.emptyText, {color: loadError ? T.dangerText : C.textSecondary}]}>
                  {loadError || t('noDataFound')}
                </Text>
              )
            }
          />

          {saveError ? (
            <Text style={[styles.saveError, {color: T.dangerText}]} accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          ) : null}

          <View style={[styles.footer, {borderTopColor: C.border}]}>
            <Text style={[styles.count, {color: C.textSecondary}]}>
              {selected.size
                ? t('selectedCount').replace('{count}', String(selected.size))
                : t('selectItemsToAdd')}
            </Text>
            <Pressable
              onPress={save}
              disabled={!selected.size || saving}
              accessibilityRole="button"
              accessibilityState={{disabled: !selected.size || saving, busy: saving}}
              style={({pressed}) => [
                styles.saveButton,
                // Always clearly visible: grey until something is picked, then brand blue.
                {backgroundColor: selected.size ? T.brandText : T.neutralTint},
                pressed && styles.pressed,
              ]}>
              {saving ? (
                <ActivityIndicator color={T.sheetBg} size="small" />
              ) : (
                <Text style={[styles.saveText, {color: selected.size ? T.sheetBg : T.neutralText}]}>
                  {selected.size ? `${saveLabel} (${selected.size})` : saveLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    flex: 1,
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
  rowId: {
    fontSize: fs(11),
    fontWeight: '500',
  },
  empty: {
    marginTop: ms(24),
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: ms(24),
    fontSize: fs(14),
  },
  saveError: {
    fontSize: fs(13),
    paddingTop: ms(8),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    paddingTop: ms(12),
    marginTop: ms(4),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  count: {
    fontSize: fs(13),
  },
  saveButton: {
    minWidth: ws(110),
    minHeight: 44,
    paddingHorizontal: ms(18),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});

export default MultiSelectSheet;
