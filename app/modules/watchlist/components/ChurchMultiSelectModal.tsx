import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {getChurchesList, ChurchListItem} from '../../church/services/church.service';
import SearchInput from '../../../shared/components/SearchInput';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';

interface Props {
  visible: boolean;
  selected: Record<number, string>;
  onClose: () => void;
  onDone: (selected: Record<number, string>) => void;
}

const PAGE_SIZE = 50;

const mergeById = (current: ChurchListItem[], more: ChurchListItem[]) => {
  const seen = new Set(current.map(item => item.id));
  return [...current, ...more.filter(item => !seen.has(item.id))];
};

export const ChurchMultiSelectModal: React.FC<Props> = ({
  visible,
  selected,
  onClose,
  onDone,
}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  // iOS: the full-screen modal starts under the status bar / home indicator.
  // Android: the (non-translucent) modal window already sits between the
  // status and navigation bars, so the same padding left blank bands.
  const topInset =
    Platform.OS === 'ios' ? Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0) : 0;
  const bottomInset =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0)
      : 0;
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ChurchListItem[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  // Copy the selection only when the picker opens: a parent re-render passed
  // a new `selected` object and wiped the ticks made since.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    if (visible) {
      setDraft(selectedRef.current);
      setQuery('');
    }
  }, [visible]);

  /**
   * Churches in pages of 50 (2,700+ on staging). Only the first 50 were ever
   * loaded, so a church further down could only be found by searching.
   */
  const fetchPage = useCallback(
    async (nextPage: number) => {
      if (!visible) {
        return;
      }
      const requestId = ++requestRef.current;
      if (nextPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const data = await getChurchesList({
          page: nextPage,
          limit: PAGE_SIZE,
          sort_by: 'name',
          sort_desc: false,
          search: query.trim() || undefined,
          disabled: false,
        });
        if (requestId !== requestRef.current) {
          return;
        }
        const rows = data?.items ?? [];
        setItems(current => (nextPage === 1 ? rows : mergeById(current, rows)));
        setHasNext(Boolean(data?.has_next));
        setPage(nextPage);
        setLoadError(null);
      } catch (error) {
        console.error('Error loading churches for watch list:', error);
        if (requestId !== requestRef.current) {
          return;
        }
        if (nextPage === 1) {
          setItems([]);
          setLoadError(error);
        }
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, visible],
  );

  const loadChurches = useCallback(() => fetchPage(1), [fetchPage]);

  const loadMore = () => {
    if (hasNext && !loading && !loadingMore) {
      fetchPage(page + 1);
    }
  };

  // Ticked churches first while not searching, so the ones already in the
  // watch list can be seen and unticked (they were often not in the first page).
  const rows = useMemo(() => {
    if (query.trim()) {
      return items;
    }
    const pinned = Object.entries(draft).map(([id, name]) => ({id: Number(id), name}));
    const pinnedIds = new Set(pinned.map(p => p.id));
    return [...pinned, ...items.filter(item => !pinnedIds.has(item.id))] as ChurchListItem[];
    // Pinned on open / search only, not on every tick (rows would jump).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, visible]);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  const toggle = (church: ChurchListItem) => {
    setDraft(current => {
      const next = {...current};
      if (next[church.id]) {
        delete next[church.id];
      } else {
        next[church.id] = (church.name ?? '').trim();
      }
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: C.background,
            paddingTop: topInset,
            paddingBottom: bottomInset,
          },
        ]}>
        <View style={[styles.header, {borderBottomColor: C.border}]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, {color: C.textSecondary}]}>
              {t('cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, {color: C.textPrimary}]}>
            {t('selectChurches')}
          </Text>
          <TouchableOpacity
            onPress={() => onDone(draft)}
            accessibilityRole="button"
            style={[styles.headerButton, styles.headerButtonEnd]}>
            <Text style={[styles.headerButtonText, {color: COLORS.mainColor}]}>
              {t('done')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchChurches')}
          />
          <Text style={[styles.count, {color: C.textSecondary}]}>
            {t('selectedChurches')}: {Object.keys(draft).length}
          </Text>
          <FlatList
            data={rows}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator color={COLORS.mainColor} style={styles.more} /> : null
            }
            keyExtractor={item => String(item.id)}
            keyboardShouldPersistTaps="handled"
            onRefresh={loadChurches}
            refreshing={loading && rows.length > 0}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator color={COLORS.mainColor} style={styles.more} />
              ) : loadError ? (
                <ApiErrorState error={loadError} onRetry={loadChurches} />
              ) : (
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  {t('noChurchesFound')}
                </Text>
              )
            }
            renderItem={({item}) => {
              const checked = Boolean(draft[item.id]);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: checked ? C.bgSelectedOption : C.surface,
                      borderColor: checked ? COLORS.mainColor : C.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked ? COLORS.mainColor : C.inputBorder,
                        backgroundColor: checked ? COLORS.mainColor : C.inputBg,
                      },
                    ]}>
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.churchName, {color: C.textPrimary}]}>
                    {(item.name ?? '').trim() || `#${item.id}`}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  header: {
    height: ws(50),
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(12),
  },
  headerButton: {
    minWidth: ws(64),
    paddingVertical: ms(8),
  },
  // "Done" against the right edge, mirroring "Cancel" on the left.
  headerButtonEnd: {alignItems: 'flex-end'},
  headerButtonText: {fontSize: fs(13), fontWeight: '600'},
  title: {fontSize: fs(14), fontWeight: '700'},
  content: {flex: 1, padding: ms(16)},
  count: {fontSize: fs(11), marginBottom: ms(10)},
  row: {
    minHeight: ws(48),
    borderWidth: 1,
    borderRadius: rs(8),
    marginBottom: ms(8),
    padding: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: ws(21),
    height: ws(21),
    borderRadius: rs(4),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10),
  },
  checkmark: {color: COLORS.white, fontSize: fs(13), fontWeight: '700'},
  churchName: {flex: 1, fontSize: fs(12)},
  empty: {textAlign: 'center', marginTop: ms(30)},
  listContent: {flexGrow: 1},
  more: {marginVertical: ms(12)},
});

export default ChurchMultiSelectModal;
