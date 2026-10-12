import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {Path} from 'react-native-svg';
import SearchInput from '../../../shared/components/SearchInput';
import {
  CenteredLoader,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';
import {
  PencilIcon,
  TrashIcon,
} from '../../../shared/components/icons/UiIcons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {
  deleteWatchList,
  enrichWatchListChurches,
  listWatchLists,
  WatchListChurchRow,
  WatchListItem,
} from '../services/watchList.service';

const PAGE_SIZE = 10;

type WatchListView = Omit<WatchListItem, 'churches'> & {
  churches: WatchListChurchRow[];
};

function formatTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

function sortChurches(rows: WatchListChurchRow[], sortBy: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortBy === 'id') {
      return a.church_id - b.church_id;
    }
    if (sortBy === 'name') {
      return a.church_name.localeCompare(b.church_name);
    }
    const byCountry = a.country_name.localeCompare(b.country_name);
    if (byCountry !== 0) {
      return byCountry;
    }
    return a.church_name.localeCompare(b.church_name);
  });
  return copy;
}

function HeartIcon({color, size}: {color: string; size: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={color}
      />
    </Svg>
  );
}

const WatchListPanel: React.FC<{
  item: WatchListView;
  onEdit: () => void;
  onDelete: () => void;
  onOpenChurch: (church: WatchListChurchRow) => void;
}> = ({item, onEdit, onDelete, onOpenChurch}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = sortChurches(item.churches, item.sort_by);
    if (!needle) {
      return sorted;
    }
    return sorted.filter(church => {
      const haystack = [
        String(church.church_id),
        church.church_name,
        church.country_name,
        church.city_name,
        church.pastor_name,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [item.churches, item.sort_by, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  const onSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: C.surface,
          borderColor: C.surfaceBorder,
          shadowOpacity: T.shadowOpacity,
        },
      ]}>
      <View style={[styles.panelHeader, {borderBottomColor: C.surfaceBorder}]}>
        <HeartIcon color="#e2557b" size={ms(18)} />
        <Text style={[styles.panelTitle, {color: C.textPrimary}]} numberOfLines={2}>
          {t('watchList')}: {item.name}
          <Text style={[styles.listId, {color: C.textSecondary}]}>{`  #${item.id}`}</Text>
        </Text>
        <TouchableOpacity
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={t('edit')}
          hitSlop={{top: 10, bottom: 10, left: 8, right: 8}}
          style={styles.iconButton}>
          <PencilIcon color={T.successText} size={ms(18)} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('delete')}
          hitSlop={{top: 10, bottom: 10, left: 8, right: 8}}
          style={styles.iconButton}>
          <TrashIcon color={T.dangerText} size={ms(18)} />
        </TouchableOpacity>
      </View>

      <SearchInput
        value={query}
        onChangeText={onSearch}
        placeholder={t('search')}
        containerStyle={styles.search}
      />

      {pageRows.length === 0 ? (
        <Text style={[styles.emptyRow, {color: C.textSecondary}]}>
          {t('noChurchesFound')}
        </Text>
      ) : (
        pageRows.map(church => (
          <TouchableOpacity
            key={church.church_id}
            activeOpacity={0.7}
            onPress={() => onOpenChurch(church)}
            style={[styles.churchRow, {borderBottomColor: C.surfaceBorder}]}>
            <Text style={[styles.churchName, {color: C.textPrimary}]}>
              {church.church_name}
            </Text>
            {church.is_msc || church.enable_cpm || church.is_mother_church ? (
              <View style={styles.badgeRow}>
                {church.is_msc ? (
                  <StatusBadge label={t('msc')} tone="danger" />
                ) : null}
                {church.enable_cpm ? (
                  <StatusBadge label={t('houseCp')} tone="success" />
                ) : null}
                {church.is_mother_church ? (
                  <StatusBadge label={t('mother')} tone="brand" />
                ) : null}
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Text
                style={[styles.churchMeta, {color: C.textSecondary}]}
                numberOfLines={2}>
                {[church.country_name, church.city_name, church.pastor_name]
                  .filter(Boolean)
                  .join('  ·  ') || '—'}
              </Text>
              <Text style={[styles.churchId, {color: C.textSecondary}]}>
                #{church.church_id}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Text style={[styles.showing, {color: C.textSecondary}]}>
        {formatTemplate(t('showingEntries'), {from, to, total})}
      </Text>
      <View style={styles.pager}>
        <ListPageBar
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </View>
    </View>
  );
};

export const WatchListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [items, setItems] = useState<WatchListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const hasItemsRef = useRef(false);
  hasItemsRef.current = items.length > 0;

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const response = await listWatchLists();
      const lists = Array.isArray(response.data) ? response.data : [];
      const flat = lists.flatMap(list => list.churches ?? []);
      const enriched = await enrichWatchListChurches(flat);
      let cursor = 0;
      setItems(
        lists.map(list => {
          const count = (list.churches ?? []).length;
          const churches = enriched.slice(cursor, cursor + count);
          cursor += count;
          return {...list, churches};
        }),
      );
      setLoadError(null);
    } catch (error) {
      console.error('Error loading watch lists:', error);
      setLoadError(error);
      // With nothing loaded the screen shows a recoverable error state;
      // keep the Alert only when a refresh fails over already-loaded lists.
      if (hasItemsRef.current) {
        Alert.alert(
          tRef.current('error'),
          error instanceof Error
            ? error.message
            : tRef.current('failedToLoadWatchLists'),
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmDelete = (item: WatchListView) => {
    Alert.alert(
      t('deleteWatchList'),
      t('deleteWatchListConfirm').replace('{name}', item.name),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWatchList(item.id);
              setItems(current => current.filter(value => value.id !== item.id));
            } catch (error) {
              Alert.alert(
                t('error'),
                error instanceof Error ? error.message : t('deleteFailed'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer title={t('watchList')} showMenu>
      <ListToolbar
        countText={
          (loading || loadError) && items.length === 0
            ? undefined
            : `${items.length} ${t('watchLists').toLowerCase()}`
        }
        addRoute="WatchListForm"
      />

      {loading && items.length === 0 ? (
        <CenteredLoader />
      ) : (
        <ScrollView
          contentContainerStyle={listContentStyle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
              tintColor={COLORS.mainColor}
            />
          }>
          {items.length === 0 ? (
            <ListLoadState error={loadError} onRetry={() => load()}>
              <ListEmptyState title={t('noWatchLists')} hint={t('emptyListHint')} />
            </ListLoadState>
          ) : (
              items.map(item => (
                <WatchListPanel
                  key={item.id}
                  item={item}
                  onEdit={() =>
                    navigation.navigate('WatchListForm', {watchListId: item.id})
                  }
                  onDelete={() => confirmDelete(item)}
                  onOpenChurch={async church => {
                    try {
                      await AsyncStorage.setItem(
                        'selectedChurchId',
                        String(church.church_id),
                      );
                      await AsyncStorage.setItem(
                        'selectedChurchName',
                        church.church_name,
                      );
                      if (church.country_name) {
                        await AsyncStorage.setItem(
                          'selectedChurchCountryName',
                          church.country_name,
                        );
                      } else {
                        await AsyncStorage.removeItem('selectedChurchCountryName');
                      }
                    } catch {
                      // Dashboard can still open from the route params.
                    }
                    navigation.navigate('DashboardPastorLeader', {
                      church_id: church.church_id,
                      church_name: church.church_name,
                      church_country_name: church.country_name || undefined,
                    });
                  }}
                />
              ))
            )}
          </ScrollView>
        )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Record id after the title, like the shared list cards.
  listId: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(12),
    marginBottom: ms(14),
    shadowColor: '#000',
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: {flex: 1, fontSize: fs(15), fontWeight: '600'},
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {marginHorizontal: ms(12), marginTop: ms(10)},
  churchRow: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  churchName: {
    fontSize: fs(14),
    fontWeight: '600',
    lineHeight: fs(19),
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
    marginTop: ms(6),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(8),
    marginTop: ms(4),
  },
  churchMeta: {flex: 1, fontSize: fs(13), lineHeight: fs(18)},
  churchId: {fontSize: fs(12), lineHeight: fs(18)},
  emptyRow: {
    textAlign: 'center',
    fontSize: fs(13),
    paddingVertical: ms(16),
  },
  showing: {
    textAlign: 'right',
    fontSize: fs(12),
    marginTop: ms(10),
    paddingHorizontal: ms(12),
  },
  pager: {
    paddingHorizontal: ms(12),
  },
});
