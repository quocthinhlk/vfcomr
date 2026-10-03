import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {Path} from 'react-native-svg';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import SearchInput from '../../../shared/components/SearchInput';
import {EditSvgIcon} from '../../../shared/components/icons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
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
    <View style={[styles.panel, {backgroundColor: C.surface, borderColor: C.border}]}>
      <View style={[styles.panelHeader, {borderBottomColor: C.border}]}>
        <HeartIcon color="#e2557b" size={ms(18)} />
        <Text style={[styles.panelTitle, {color: C.textPrimary}]} numberOfLines={2}>
          {t('watchList')}: {item.name}
        </Text>
        <TouchableOpacity
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={t('edit')}
          hitSlop={{top: 10, bottom: 10, left: 8, right: 8}}
          style={styles.iconButton}>
          <EditSvgIcon width={ms(16)} height={ms(16)} color={C.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('delete')}
          hitSlop={{top: 10, bottom: 10, left: 8, right: 8}}
          style={styles.iconButton}>
          <Text style={styles.deleteMark}>×</Text>
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
            style={[styles.churchRow, {borderBottomColor: C.border}]}>
            <Text style={styles.churchName}>
              {church.church_name}
              {church.is_msc ? (
                <Text style={styles.badgeMsc}> [{t('msc')}]</Text>
              ) : null}
              {church.enable_cpm ? (
                <Text style={styles.badgeHouse}> [{t('houseCp')}]</Text>
              ) : null}
              {church.is_mother_church ? (
                <Text style={styles.badgeMother}> [{t('mother')}]</Text>
              ) : null}
            </Text>
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
        <PagerButton
          label={t('pagerFirst')}
          disabled={currentPage <= 1}
          onPress={() => setPage(1)}
        />
        <PagerButton
          label={t('pagerPrev')}
          disabled={currentPage <= 1}
          onPress={() => setPage(current => Math.max(1, current - 1))}
        />
        <PagerButton label={String(currentPage)} active onPress={() => undefined} />
        <PagerButton
          label={t('next')}
          disabled={currentPage >= totalPages}
          onPress={() => setPage(current => Math.min(totalPages, current + 1))}
        />
        <PagerButton
          label={t('pagerLast')}
          disabled={currentPage >= totalPages}
          onPress={() => setPage(totalPages)}
        />
      </View>
    </View>
  );
};

const PagerButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}> = ({label, onPress, disabled, active}) => {
  const C = useThemedColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || active}
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled, selected: !!active}}
      style={[
        styles.pagerButton,
        {
          backgroundColor: active ? COLORS.mainColor : C.surface,
          borderColor: active ? COLORS.mainColor : C.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
      <Text
        style={[
          styles.pagerLabel,
          {color: active ? COLORS.white : C.textPrimary},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const WatchListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [items, setItems] = useState<WatchListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (error) {
      console.error('Error loading watch lists:', error);
      Alert.alert(
        tRef.current('error'),
        error instanceof Error
          ? error.message
          : tRef.current('failedToLoadWatchLists'),
      );
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
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('watchList')} />
        <View style={styles.addRow}>
          <AddNewHeaderButton
            name="WatchListForm"
            text={t('createWatchList')}
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: COLORS.mainColor,
            }}
            textStyle={{color: COLORS.mainColor}}
          />
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={items.length === 0 ? styles.emptyList : styles.listContent}
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
              <Text style={[styles.empty, {color: C.textSecondary}]}>
                {t('noWatchLists')}
              </Text>
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: ms(16)},
  addRow: {
    alignItems: 'flex-end',
    marginTop: ms(8),
    marginBottom: ms(10),
  },
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  listContent: {paddingBottom: ms(24)},
  emptyList: {flexGrow: 1, justifyContent: 'center'},
  empty: {textAlign: 'center', fontSize: fs(12)},
  panel: {
    borderWidth: 1,
    borderRadius: rs(8),
    marginBottom: ms(14),
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: {flex: 1, fontSize: fs(14), fontWeight: '700'},
  iconButton: {
    minWidth: ms(32),
    minHeight: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteMark: {
    color: COLORS.dangerColor,
    fontSize: fs(22),
    fontWeight: '600',
    lineHeight: fs(24),
  },
  search: {marginHorizontal: ms(12), marginTop: ms(10)},
  churchRow: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  churchName: {
    color: COLORS.mainColor,
    fontSize: fs(13),
    fontWeight: '600',
    lineHeight: fs(18),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(8),
    marginTop: ms(3),
  },
  churchMeta: {flex: 1, fontSize: fs(12), lineHeight: fs(16)},
  churchId: {fontSize: fs(11), fontWeight: '600', lineHeight: fs(16)},
  badgeMsc: {color: '#b42318', fontWeight: '700', fontSize: fs(11)},
  badgeHouse: {color: '#1b7f3b', fontWeight: '700', fontSize: fs(11)},
  badgeMother: {color: '#1d4ed8', fontWeight: '700', fontSize: fs(11)},
  emptyRow: {
    textAlign: 'center',
    fontSize: fs(12),
    paddingVertical: ms(16),
  },
  showing: {
    textAlign: 'right',
    fontSize: fs(11),
    marginTop: ms(10),
    paddingHorizontal: ms(12),
  },
  pager: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: ms(6),
    paddingHorizontal: ms(12),
    paddingTop: ms(8),
    paddingBottom: ms(12),
  },
  pagerButton: {
    minHeight: ms(32),
    paddingHorizontal: ms(8),
    borderWidth: 1,
    borderRadius: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerLabel: {fontSize: fs(11), fontWeight: '600'},
});
