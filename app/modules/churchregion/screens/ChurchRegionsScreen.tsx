import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  listChurchRegions,
  ChurchRegionItem,
} from '../services/churchregion.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';

export const ChurchRegionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<ChurchRegionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<ChurchRegionItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listChurchRegions({});
        const full = res?.data?.items ?? [];
        const filtered = query
          ? full.filter((i: ChurchRegionItem) =>
              i.name?.toLowerCase().includes(query.trim().toLowerCase()),
            )
          : full;
        const total = filtered.length;
        const totalPages = Math.max(
          1,
          Math.ceil(total / DEFAULT_PAGE_LIMIT),
        );
        const validPage = Math.min(Math.max(1, targetPage), totalPages);
        const start = (validPage - 1) * DEFAULT_PAGE_LIMIT;
        const end = start + DEFAULT_PAGE_LIMIT;
        const pageSlice = filtered.slice(start, end);

        setTotalPages(totalPages);
        setTotal(total);
        setPage(validPage);
        setItems(pageSlice);
        setLoadError(null);
      } catch (e) {
        console.error(e);
        // A failed load shows a recoverable error, never the empty state.
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, query],
  );

  useEffect(() => {
    setItems([]);
    fetchData(1, true);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        // Clear the reload flag
        navigation.setParams({reload: undefined});
        setItems([]);
        fetchData(1, true);
      }
    }, [route.params?.reload]),
  );

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
      title={item.name}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}
    />
  );

  const keyExtractor = (item: ChurchRegionItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('churchApostolicRegions')} showMenu>
      <ListToolbar
        countText={
          loadError && !total
            ? undefined
            : `${total} ${t('churchApostolicRegions').toLowerCase()}`
        }
        addRoute="AddChurchRegion"
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
            contentContainerStyle={listContentStyle}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              // Pull-to-refresh with no items: show nothing until it settles.
              isInitialLoading || !loading ? (
                <ListLoadState
                  loading={isInitialLoading}
                  error={loadError}
                  onRetry={() => fetchData(1, true)}>
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
        page={page}
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

export default ChurchRegionsScreen;
