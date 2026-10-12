import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listLanguages, LanguageItem} from '../services/language.service';
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

export const LanguagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<LanguageItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listLanguages({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query.trim(),
        });
        setTotalPages(res?.data?.total_pages ?? 1);
        setTotal(res?.data?.total ?? 0);
        setPage(res?.data?.page ?? targetPage);
        setItems(res?.data?.items ?? []);
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

  const handleEdit = (item: LanguageItem) => {
    navigation.navigate('EditLanguage', {languageId: item.id});
  };

  const openActions = (item: LanguageItem) => {
    setSelectedLanguage(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedLanguage(null);
  };

  const renderItem = ({item}: {item: LanguageItem}) => (
    <EntityListCard
      title={item.name}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}
    />
  );

  const keyExtractor = (item: LanguageItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('languages')} showMenu>
      <ListToolbar
        countText={
          loadError && !total
            ? undefined
            : `${total} ${t('languages').toLowerCase()}`
        }
        addRoute="AddLanguage"
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
        title={selectedLanguage?.name || t('languages')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (target: string) => () => {
            if (selectedLanguage) {
              navigation.navigate(target, {languageId: selectedLanguage.id});
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditLanguage')},
            {
              label: t('delete'),
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteLanguage'),
            },
          ];
        })()}
      />
    </ScreenContainer>
  );
};

export default LanguagesScreen;
