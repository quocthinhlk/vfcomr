import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  RefreshControl,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS} from '../../../shared/constants/colors';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useNavigation} from '@react-navigation/native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {
  getChurchesList,
  ChurchListItem,
} from '../services/church.service';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
} from '../../../shared/components/crud';
import {ChurchIcon} from '../../../shared/components/icons/UiIcons';
import {ChurchListCard} from '../components/ChurchListCard';
import ActionSheetModal from '../../../shared/components/ActionSheetModal';
import SearchInput from '../../../shared/components/SearchInput';

export const CloneChurchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [items, setItems] = useState<ChurchListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  // Church whose "…" menu is open.
  const [selectedChurch, setSelectedChurch] = useState<ChurchListItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const params = {
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          sort_by: 'id',
          sort_desc: true,
          search: query && query.trim() ? query.trim() : undefined,
        };
        let data = await getChurchesList(params);
        // On first open the API sometimes returns pagination totals that
        // contradict the page itself (e.g. total: 1 with 10 items) while other
        // requests (users/me) run concurrently. Retry once when that happens.
        const looksInconsistent = (d: any) => {
          if (!d) {
            return false;
          }
          const count = d.items?.length ?? 0;
          return (
            (Number(d.total) || 0) < count ||
            (!!d.has_next && (Number(d.total_pages) || 1) <= (Number(d.page) || targetPage))
          );
        };
        if (looksInconsistent(data)) {
          data = await getChurchesList(params);
        }
        const nextItems = (data?.items ?? []) as ChurchListItem[];
        setTotalPages(data?.total_pages ?? 1);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        setItems(reset ? nextItems : [...items, ...nextItems]);
        setLoadError(null);
      } catch (e) {
        // Surface the failure as a recoverable error, never as "no churches".
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, query, items],
  );

  useEffect(() => {
    setItems([]);
    fetchData(1, true);
  }, [query]);

  const onRefresh = async () => {
    setRefreshing(true);
    setItems([]);
    await fetchData(1, true);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) {
      return;
    }
    setItems([]);
    fetchData(targetPage, true);
  };

  const renderItem = ({item}: {item: ChurchListItem}) => (
    <ChurchListCard
      item={item}
      onPress={() => navigation.navigate('AddCloneChurch', {id: item.id})}
      onMorePress={() => setSelectedChurch(item)}
      moreAccessibilityLabel={`${item.name}: ${t('cloneChurch')}, ${t('churchDetail')}`}
    />
  );

  const keyExtractor = (item: ChurchListItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('addNewClonedChurch')} />

        {/* <View style={styles.headerRow}>
          <Text style={styles.title}>Churches</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddChurch')}>
            <Text style={styles.addButtonText}>+ Add New</Text>
          </TouchableOpacity>
        </View> */}

        <ListToolbar
          countText={
            loadError && !total ? undefined : `${total} ${t('churches').toLowerCase()}`
          }
        />

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search')}
          onSubmitEditing={() => goToPage(1)}
        />

        <View style={{flex: 1, minHeight: 0}}>
          <PaginatedListPager
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}>
            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              nestedScrollEnabled={Platform.OS === 'android'}
              style={{flex: 1}}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <ListLoadState
                  loading={loading}
                  error={loadError}
                  onRetry={() => fetchData(page, true)}>
                  <ListEmptyState icon={ChurchIcon} title={t('noChurchesFound')} />
                </ListLoadState>
              }
            />
          </PaginatedListPager>
        </View>
        <ListPageBar
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPageChange={goToPage}
        />
      </View>
      <ActionSheetModal
        visible={!!selectedChurch}
        title={selectedChurch?.name || t('cloneChurch')}
        onRequestClose={() => setSelectedChurch(null)}
        actions={[
          {
            label: t('cloneChurch'),
            icon: 'copy',
            onPress: () => {
              if (selectedChurch) {
                navigation.navigate('AddCloneChurch', {id: selectedChurch.id});
              }
              setSelectedChurch(null);
            },
          },
          {
            label: t('churchDetail'),
            icon: 'view',
            onPress: () => {
              if (selectedChurch) {
                navigation.navigate('ChurchDetail', {id: selectedChurch.id, fromClone: true});
              }
              setSelectedChurch(null);
            },
          },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  moreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Record id after the title, like the shared list cards.
  listId: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {fontSize: fs(16), fontWeight: '600'},
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: rs(6),
  },
  addButtonText: {color: '#fff', fontWeight: '600'},
  search: {
    height: hs(40),
    borderWidth: 1,
    borderRadius: rs(6),
    paddingHorizontal: ms(12),
    marginBottom: ms(10),
    marginTop: ms(6),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemCol: {flex: 1, paddingRight: 8},
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  name: {fontSize: fs(14), fontWeight: '600', marginBottom: ms(2)},
  meta: {fontSize: fs(12)},
  badge: {
    paddingVertical: ms(2),
    paddingHorizontal: ms(8),
    borderRadius: rs(999),
  },
  badgePrimary: {backgroundColor: COLORS.mainColor},
  badgeInfo: {backgroundColor: '#0ea5e9'},
  badgeTextPrimary: {
    color: '#fff',
    fontSize: fs(11),
    fontWeight: '700',
  },
  badgeTextInfo: {color: '#fff', fontSize: fs(11), fontWeight: '700'},
  actionRow: {flexDirection: 'row', alignItems: 'center', gap: ms(6)},
  actionBtn: {
    width: ws(25),
    height: ws(25),
    borderRadius: rs(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: COLORS.successColor,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerColor,
  },
  copyBtn: {
    backgroundColor: COLORS.mainColor,
  },
  listContent: {flexGrow: 1},
  pageNumbersContainer: {flexDirection: 'row', alignItems: 'center'},
  pageNumber: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(3),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ms(8),
  },
  pageNumberActive: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  pageNumberDisabled: {opacity: 0.5},
  pageNumberText: {fontWeight: '600', fontSize: fs(12)},
  pageNumberTextActive: {color: '#fff'},
});

export default CloneChurchScreen;
