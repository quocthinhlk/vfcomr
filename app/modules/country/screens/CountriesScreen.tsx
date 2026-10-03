import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listCountries, CountryItem} from '../services/country.service';
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listCountries({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query,
        });
        const nextItems = res?.data?.items ?? [];
        setTotalPages(res?.data?.total_pages ?? 1);
        setTotal(res?.data?.total ?? 0);
        setPage(res?.data?.page ?? targetPage);
        setItems(reset ? nextItems : [...items, ...nextItems]);
      } catch (e) {
        console.error(e);
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
      title={item.name}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}
    />
  );

  const keyExtractor = (item: CountryItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('countries')} showMenu>
      <ListToolbar
        countText={`${total} ${t('countries').toLowerCase()}`}
        addRoute="AddCountry"
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

