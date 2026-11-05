import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, Platform, StyleSheet} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listCountries, CountryItem} from '../services/country.service';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
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

export const CountriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<CountryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);
  // Only the newest request may write. Before, a request started while
  // another was running was dropped (the list kept the old search), and
  // answers arriving out of order could show the wrong page.
  const requestRef = useRef(0);
  const pageRef = useRef(1);

  const fetchData = useCallback(
    async (targetPage: number) => {
      const requestId = ++requestRef.current;
      const isCurrent = () => requestId === requestRef.current;
      setLoading(true);
      try {
        const res = await listCountries({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query,
        });
        if (!isCurrent()) {
          return;
        }
        const pages = Math.max(1, res?.data?.total_pages ?? 1);
        // A page past the end (e.g. the last item of the last page was
        // deleted): show the new last page instead of an empty list.
        if (targetPage > pages && (res?.data?.total ?? 0) > 0) {
          fetchData(pages);
          return;
        }
        setItems(res?.data?.items ?? []);
        setTotalPages(pages);
        setTotal(res?.data?.total ?? 0);
        setPage(res?.data?.page ?? targetPage);
        pageRef.current = res?.data?.page ?? targetPage;
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
    },
    [query],
  );

  // New search: back to page 1.
  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  // Back from add / edit / delete: reload the page the user was on.
  useReloadOnReturn(() => fetchData(pageRef.current), {
    dataKey: 'countries',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(page);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) {
      return;
    }
    fetchData(targetPage);
  };

  const handleEdit = (item: CountryItem) => {
    navigation.navigate('EditCountry', {countryId: item.id});
  };

  const openActions = (item: CountryItem) => {
    setSelectedCountry(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedCountry(null);
  };

  const renderItem = ({item}: {item: CountryItem}) => (
    <EntityListCard
      title={item.name?.trim() || `#${item.id}`}
      trailingText={`#${item.id}`}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}
    />
  );

  const keyExtractor = (item: CountryItem) => String(item.id);

  // Spinner only before anything was shown; later loads keep the old page
  // on screen instead of flashing an empty list.
  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('countries')} showMenu>
      <ListToolbar
        countText={
          loadError && !total
            ? undefined
            : `${total} ${t('countries').toLowerCase()}`
        }
        addRoute="AddCountry"
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('search')}
      />

      <View style={styles.listWrap}>
        <PaginatedListPager
          page={page}
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
                  onRetry={() => fetchData(page)}>
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
        title={selectedCountry?.name || t('country')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (routeName: string) => () => {
            if (selectedCountry) {
              navigation.navigate(routeName, {
                countryId: selectedCountry.id,
              });
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditCountry')},
            {
              label: t('delete'),
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteCountry'),
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
