import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, Platform, StyleSheet} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listAllLanguages, LanguageItem} from '../services/language.service';
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
import {filterLanguages} from '../utils/language.utils';

export const LanguagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [allItems, setAllItems] = useState<LanguageItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageItem | null>(null);
  // Only the newest load may write (pull-to-refresh vs. return from a save).
  const requestRef = useRef(0);

  /**
   * Load every language once; search and pages are local. The API search only
   * matched the start of names and kept the unfiltered total, so a search
   * showed 6 pages of which 5 were empty. Keystrokes typed while a request
   * was running were also dropped.
   */
  const fetchData = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setLoading(true);
    try {
      const items = await listAllLanguages();
      if (!isCurrent()) {
        return;
      }
      setAllItems(items);
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

  // Back from add / edit / delete: reload, staying on the same page.
  useReloadOnReturn(fetchData, {
    dataKey: 'languages',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const filtered = useMemo(() => filterLanguages(allItems, query), [allItems, query]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_LIMIT));
  // After a delete the last page can disappear: show the new last page.
  const currentPage = Math.min(page, totalPages);
  const items = useMemo(
    () => filtered.slice((currentPage - 1) * DEFAULT_PAGE_LIMIT, currentPage * DEFAULT_PAGE_LIMIT),
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
    if (targetPage >= 1 && targetPage <= totalPages) {
      setPage(targetPage);
    }
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
      title={item.name?.trim() || `#${item.id}`}
      trailingText={`#${item.id}`}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}
    />
  );

  const keyExtractor = (item: LanguageItem) => String(item.id);

  const isInitialLoading = loading && allItems.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('languages')} showMenu>
      <ListToolbar
        countText={
          loadError && !allItems.length
            ? undefined
            : `${total} ${t('languages').toLowerCase()}`
        }
        addRoute="AddLanguage"
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

const styles = StyleSheet.create({
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
});

export default LanguagesScreen;
