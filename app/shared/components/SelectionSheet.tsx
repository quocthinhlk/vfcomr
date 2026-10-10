import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemedColors} from '../styles/theme';
import {useUiTokens} from '../styles/uiTokens';
import {useTranslation} from '../hooks/useTranslation';
import {CheckIcon} from './icons/UiIcons';
import {fs, hs, ms, rs, ws} from '../utils/scale';

export type SelectionSheetItem = {
  key: string | number;
  title: string;
  subtitle?: string;
  /** Photo; the title's initials are shown when missing or broken. */
  imageUrl?: string;
  /** Extra content under the subtitle (e.g. badges). */
  extra?: React.ReactNode;
};

type Props = {
  visible: boolean;
  title: string;
  items: SelectionSheetItem[];
  selectedKey?: string | number | null;
  onSelect: (key: string | number) => void;
  onClose: () => void;
};

// Show a search box once the list is long enough to need it.
const SEARCH_THRESHOLD = 6;

// Letters/digits only: "Demo - Victory…" → "DV", not "D-" (works for accented text too).
const isAlnum = (ch: string) => ch.toLowerCase() !== ch.toUpperCase() || /[0-9]/.test(ch);
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map(part => Array.from(part).find(isAlnum) ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .map(ch => ch.toUpperCase())
    .join('');

/** Photo, or initials on a brand tint (no grey placeholder). */
export const InitialsAvatar: React.FC<{name: string; uri?: string; size: number}> = ({
  name,
  uri,
  size,
}) => {
  const T = useUiTokens();
  const [failed, setFailed] = useState(false);
  const shape = {width: size, height: size, borderRadius: size / 2};
  if (uri && !failed) {
    return (
      <Image
        source={{uri}}
        onError={() => setFailed(true)}
        style={shape}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[shape, styles.initials, {backgroundColor: T.brandTint}]}>
      <Text style={[styles.initialsText, {color: T.brandText}]} allowFontScaling={false}>
        {initialsOf(name)}
      </Text>
    </View>
  );
};

/**
 * Bottom sheet for picking one item (overseer, church…): slides up, avatar +
 * title + subtitle rows, the current one tinted with a check, search when the
 * list is long. Dismiss by tapping outside or Android back.
 */
export const SelectionSheet: React.FC<Props> = ({
  visible,
  title,
  items,
  selectedKey,
  onSelect,
  onClose,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {height: screenH} = useWindowDimensions();
  const [query, setQuery] = useState('');
  // React Native's own Modal (what these popups used before): the backdrop
  // fades in while the sheet slides up from the bottom edge.
  const slide = useRef(new Animated.Value(screenH)).current;
  useEffect(() => {
    if (visible) {
      slide.setValue(screenH);
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenH, slide]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(item =>
      `${item.title} ${item.subtitle ?? ''}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const close = () => {
    onClose();
    setQuery('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(0,0,0,${T.backdropOpacity})`}]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('cancel') || 'Close'}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: T.sheetBg,
              paddingBottom: Math.max(insets.bottom, ms(12)),
              transform: [{translateY: slide}],
            },
          ]}
          accessibilityViewIsModal>
        <View style={[styles.handle, {backgroundColor: C.border}]} />
        <Text style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
          {title}
        </Text>

        {items.length >= SEARCH_THRESHOLD ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search')}
            placeholderTextColor={C.textSecondary}
            style={[
              styles.search,
              {backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText},
            ]}
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel={t('search')}
          />
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={item => String(item.key)}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[styles.empty, {color: C.textSecondary}]}>{t('noDataFound')}</Text>
          }
          renderItem={({item}) => {
            const active = selectedKey != null && item.key === selectedKey;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.key);
                  close();
                }}
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
                style={({pressed}) => [
                  styles.row,
                  (active || pressed) && {backgroundColor: T.brandTint},
                ]}>
                <InitialsAvatar name={item.title} uri={item.imageUrl} size={ws(44)} />
                <View style={styles.rowText}>
                  <Text
                    style={[
                      styles.rowTitle,
                      {color: active ? T.brandText : C.textPrimary},
                      active && styles.rowTitleActive,
                    ]}
                    numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={[styles.rowSubtitle, {color: C.textSecondary}]}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  {item.extra}
                </View>
                <View style={styles.check}>
                  {active ? <CheckIcon color={T.brandText} size={ws(18)} /> : null}
                </View>
              </Pressable>
            );
          }}
        />
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
    maxHeight: '80%',
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
    marginBottom: ms(12),
  },
  search: {
    height: hs(44),
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    fontSize: fs(15),
    marginBottom: ms(8),
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    minHeight: 64,
    paddingVertical: ms(10),
    paddingHorizontal: ms(8),
    borderRadius: rs(12),
    marginBottom: ms(2),
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  rowTitleActive: {
    fontWeight: '700',
  },
  rowSubtitle: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  check: {
    width: ws(24),
    alignItems: 'center',
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: ms(24),
    fontSize: fs(14),
  },
});

export default SelectionSheet;
