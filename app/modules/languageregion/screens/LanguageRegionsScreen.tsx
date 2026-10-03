import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  listLanguageRegions,
  LanguageRegionItem,
} from '../services/languageregion.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  CenteredLoader,
  EntityListCard,
  ListEmptyState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';

export const LanguageRegionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<LanguageRegionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<LanguageRegionItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listLanguageRegions();
        const full = res?.data?.items ?? [];
        const filtered = query
          ? full.filter((i: LanguageRegionItem) =>
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
      } catch (e) {
        console.error(e);
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

  const handleEdit = (item: LanguageRegionItem) => {
    navigation.navigate('EditLanguageRegion', {languageRegionId: item.id});
  };

  const openActions = (item: LanguageRegionItem) => {
    setSelectedRegion(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedRegion(null);
  };

  const renderItem = ({item}: {item: LanguageRegionItem}) => (
    <EntityListCard
      title={item.name}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}>
      {item.disabled ? (
        <StatusBadge label={t('disabled')} tone="neutral" />
      ) : (
        <StatusBadge label={t('active')} tone="success" />
      )}
    </EntityListCard>
  );

  const keyExtractor = (item: LanguageRegionItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('languageRegions')} showMenu>
      <ListToolbar
        countText={`${total} ${t('languageRegions').toLowerCase()}`}
        addRoute="AddLanguageRegion"
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
              isInitialLoading ? (
                <CenteredLoader />
              ) : !loading ? (
                <ListEmptyState
                  title={t('noDataFound')}
                  hint={query ? undefined : t('emptyListHint')}
                />
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
        title={selectedRegion?.name || t('languageRegions')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (target: string) => () => {
            if (selectedRegion) {
              navigation.navigate(target, {
                languageRegionId: selectedRegion.id,
              });
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditLanguageRegion')},
            {
              label: t('delete'),
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteLanguageRegion'),
            },
          ];
        })()}
      />
    </ScreenContainer>
  );
};

export default LanguageRegionsScreen;
