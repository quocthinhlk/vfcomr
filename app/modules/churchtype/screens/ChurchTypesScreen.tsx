import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  listChurchTypes,
  ChurchTypeItem,
} from '../services/churchtype.service';
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

export const ChurchTypesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<ChurchTypeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<ChurchTypeItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listChurchTypes({search: query});
        const full = res?.data?.items ?? [];
        const filtered = query
          ? full.filter(i =>
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

  const handleEdit = (item: ChurchTypeItem) => {
    navigation.navigate('EditChurchType', {churchTypeId: item.id});
  };

  const openActions = (item: ChurchTypeItem) => {
    setSelectedType(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedType(null);
  };

  const renderItem = ({item}: {item: ChurchTypeItem}) => (
    <EntityListCard
      title={item.name}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}
    />
  );

  const keyExtractor = (item: ChurchTypeItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('churchTypes')} showMenu>
      <ListToolbar
        countText={
          loadError && !total
            ? undefined
            : `${total} ${t('churchTypes').toLowerCase()}`
        }
        addRoute="AddChurchType"
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
        title={selectedType?.name || t('churchTypes')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (routeName: string) => () => {
            if (selectedType) {
              navigation.navigate(routeName, {
                churchTypeId: selectedType.id,
              });
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditChurchType')},
            {
              label: t('delete'),
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteChurchType'),
            },
          ];
        })()}
      />
    </ScreenContainer>
  );
};

export default ChurchTypesScreen;
