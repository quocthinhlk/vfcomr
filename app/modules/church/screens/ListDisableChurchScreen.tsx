import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS} from '../../../shared/constants/colors';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useNavigation, useRoute} from '@react-navigation/native';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {FlatListWithVerticalScrollbar} from '../../../shared/components/FlatListWithVerticalScrollbar';
import {
  getChurchesList,
  ChurchListItem,
} from '../services/church.service';
import {ChurchListCard} from '../components/ChurchListCard';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
} from '../../../shared/components/crud';
import {ChurchIcon} from '../../../shared/components/icons/UiIcons';
import SearchInput from '../../../shared/components/SearchInput';

export const ChurchesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const [items, setItems] = useState<ChurchListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<ChurchListItem | null>(null);
  const requestId = useRef(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchData = useCallback(async (targetPage: number) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const q = queryRef.current.trim();
      const params = {
        page: targetPage,
        limit: DEFAULT_PAGE_LIMIT,
        sort_by: 'id',
        sort_desc: true,
        search: q || undefined,
        disabled: true,
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
      if (looksInconsistent(data) && id === requestId.current) {
        data = await getChurchesList(params);
      }
      if (id !== requestId.current) {
        return;
      }
      const nextItems = (data?.items ?? []) as ChurchListItem[];
      const limit = Number(data?.limit) || DEFAULT_PAGE_LIMIT;
      const reportedTotal = Number(data?.total);
      const reportedPages = Number(data?.total_pages);
      const nextTotal = Number.isFinite(reportedTotal)
        ? Math.max(reportedTotal, nextItems.length)
        : nextItems.length;
      const nextPages =
        Number.isFinite(reportedPages) && reportedPages > 0
          ? reportedPages
          : Math.max(1, Math.ceil(nextTotal / limit));
      setItems(nextItems);
      setTotal(nextTotal);
      setTotalPages(Math.max(nextPages, Math.ceil(nextTotal / limit) || 1));
      setPage(Number(data?.page ?? targetPage) || targetPage);
      setLoadError(null);
    } catch (e) {
      // Surface the failure as a recoverable error, never as "no churches".
      if (id === requestId.current) {
        // The error + retry is shown in place of the list: keeping the old rows
        // (or the previous search's results) hid the failure completely.
        setItems([]);
        setLoadError(e);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [query, fetchData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        // Same rule as the church list: some accounts only expose role_id.
        const r = resolveRoleIdFromUser(res?.data?.data);
        if (r != null) {
          setRoleId(r);
        }
      } catch {}
    })();
  }, []);

  // Reload after a church was enabled / edited / disabled anywhere (a `reload`
  // param or markDataChanged('churches')); a plain Back keeps the list.
  useReloadOnReturn(() => fetchData(1), {
    dataKey: 'churches',
    reload: route?.params?.refresh || route?.params?.reload,
    clearReload: () => navigation.setParams({refresh: false, reload: undefined}),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) {
      return;
    }
    fetchData(targetPage);
  };

  const renderItem = ({item}: {item: ChurchListItem}) => (
    <ChurchListCard
      item={item}
      onPress={() => navigation.navigate('ChurchDetail', {id: item.id})}
      onMorePress={() => {
        setSelectedChurch(item);
        setActionsVisible(true);
      }}
      moreAccessibilityLabel={`${item.name}: ${t('churchDetail')}, ${t('editChurch')}, ${t('enableChurch')}`}
    />
  );

  const keyExtractor = (item: ChurchListItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      {/* The KAV already sits under the header and above the bottom safe area,
          so no extra offset (it left a gap above the keyboard). Android resizes
          the window itself (adjustResize). */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1, minHeight: 0, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('disabledChurches')} />

        <ListToolbar
          countText={
            loadError && !total
              ? undefined
              : `${total} ${(total === 1 ? t('church') : t('churches')).toLowerCase()}`
          }
        />

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search')}
          onSubmitEditing={() => goToPage(1)}
        />

        <View style={styles.listScrollWrap}>
          <PaginatedListPager
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}>
            <FlatListWithVerticalScrollbar
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentInsetAdjustmentBehavior="always"
              contentContainerStyle={styles.listContent}
              nestedScrollEnabled={Platform.OS === 'android'}
              style={styles.listScroll}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <ListLoadState
                  loading={loading}
                  error={loadError}
                  onRetry={() => fetchData(page)}>
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

        <ActionSheetModal
          visible={actionsVisible}
          title={selectedChurch?.name || t('church')}
          onRequestClose={() => { setActionsVisible(false); setSelectedChurch(null); }}
          actions={((): ActionItem[] => {
            const list: ActionItem[] = [];
            list.push({ label: t('churchDetail'), icon: 'view', onPress: () => { if (selectedChurch) navigation.navigate('ChurchDetail', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            list.push({ label: t('editChurch'), icon: 'edit', onPress: () => { if (selectedChurch) navigation.navigate('EditChurch', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            if (isSuperAdmin(roleId)) {
              list.push({ label: t('enableChurch') || 'Enable Church', type: 'danger', onPress: () => { if (selectedChurch) navigation.navigate('EnableChurch', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            }
            return list;
          })()}
        />
        </View>
      </KeyboardAvoidingView>
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
    minHeight: 0,
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  listScrollWrap: {
    flex: 1,
    minHeight: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: ms(24),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  title: {fontSize: fs(16), fontWeight: '600'},
  subTitle: {
    marginTop: ms(6),
    marginBottom: ms(10),
    fontSize: fs(12),
  },
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: rs(3),
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
  actionRow: {flexDirection: 'row', alignItems: 'center', gap: ms(6)},
  actionBtn: {
    width: ws(25),
    height: ws(25),
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: COLORS.successColor,
  },
  deleteBtn: {
    backgroundColor: COLORS.mainColor,
  },
  copyBtn: {
    backgroundColor: COLORS.mainColor,
  },
  pagination: {paddingVertical: ms(12), alignItems: 'flex-end'},
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
});

export default ChurchesListScreen;
