import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, Platform, StyleSheet} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  listChurchRegions,
  ChurchRegionItem,
} from '../services/churchregion.service';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  CardMeta,
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {filterRegions, parentNames} from '../utils/churchRegion.utils';

export const ChurchRegionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [allItems, setAllItems] = useState<ChurchRegionItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<ChurchRegionItem | null>(null);
  // Only the newest load may write (pull-to-refresh vs. return from a save).
  const requestRef = useRef(0);

  /**
   * The API returns every region at once: load once, then search and page
   * locally. Before, every keystroke re-fetched all regions and a keystroke
   * typed while a fetch was running was dropped (stale results).
   */
  const fetchData = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setLoading(true);
    try {
      const res = await listChurchRegions();
      if (!isCurrent()) {
        return;
      }
      setAllItems(res?.data?.items ?? []);
      setLoadError(null);
    } catch (e) {
      if (isCurrent()) {
        console.error(e);
        // A failed load shows a recoverable error, never the empty state.
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      requestRef.current += 1;
    };
  }, [fetchData]);

  // Back from add / edit / delete: reload so the change shows.
  useReloadOnReturn(fetchData, {
    dataKey: 'churchRegions',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const parents = useMemo(() => parentNames(allItems), [allItems]);
  const filtered = useMemo(
    () => filterRegions(allItems, query, parents),
    [allItems, query, parents],
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_LIMIT));
  const currentPage = Math.min(page, totalPages);
  const items = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * DEFAULT_PAGE_LIMIT,
        currentPage * DEFAULT_PAGE_LIMIT,
      ),
    [filtered, currentPage],
  );

  const onQueryChange = (text: string) => {
    setQuery(text);
    setPage(1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) {
      return;
    }
    setPage(targetPage);
  };

  const handleEdit = (item: ChurchRegionItem) => {
    navigation.navigate('EditChurchRegion', {churchRegionId: item.id});
  };

  const openActions = (item: ChurchRegionItem) => {
    setSelectedRegion(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedRegion(null);
  };

  const renderItem = ({item}: {item: ChurchRegionItem}) => (
    <EntityListCard
      // A name of spaces (the API accepts it) would make an empty card.
      title={item.name?.trim() || `#${item.id}`}
      trailingText={`#${item.id}`}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}>
      {parents.get(item.id) ? (
        <CardMeta>
          {t('geoRegionsUnder')}: {parents.get(item.id)}
        </CardMeta>
      ) : null}
    </EntityListCard>
  );

  const keyExtractor = (item: ChurchRegionItem) => String(item.id);

  const isInitialLoading = loading && allItems.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('churchApostolicRegions')} showMenu>
      <ListToolbar
        countText={
          loadError && !allItems.length
            ? undefined
            : `${total} ${t('churchApostolicRegions').toLowerCase()}`
        }
        addRoute="AddChurchRegion"
      />

      <SearchInput
        value={query}
        onChangeText={onQueryChange}
        // Local search: show matches at once.
        debounce={false}
        placeholder={t('search')}
      />

      <View style={styles.listWrap}>
        <PaginatedListPager
          page={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            nestedScrollEnabled={Platform.OS === 'android'}
            style={styles.list}
            contentContainerStyle={listContentStyle}
            // With the search keyboard open the first tap on a card only
            // closed the keyboard (Android).
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              // Pull-to-refresh with no items: show nothing until it settles.
              isInitialLoading || !loading ? (
                <ListLoadState
                  loading={isInitialLoading}
                  error={loadError}
                  onRetry={fetchData}>
                  <ListEmptyState
                    title={t('noDataFound')}
                    hint={query ? undefined : t('emptyListHint')}
                  />
                </ListLoadState>
              ) : null
            }
          />
        </PaginatedListPager>
      </View>

      <ListPageBar
        page={currentPage}
        totalPages={totalPages}
        loading={loading}
        onPageChange={goToPage}
      />

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedRegion?.name || t('churchApostolicRegions')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (routeName: string) => () => {
            if (selectedRegion) {
              navigation.navigate(routeName, {
                churchRegionId: selectedRegion.id,
              });
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditChurchRegion')},
            {
              label: t('delete'),
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteChurchRegion'),
            },
          ];
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
});

export default ChurchRegionsScreen;
