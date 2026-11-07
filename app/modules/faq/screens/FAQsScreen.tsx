import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, StyleSheet, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listFAQs, FAQItem} from '../services/faq.service';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import api from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  StatusBadge,
  listContentStyle,
} from '../../../shared/components/crud';
import {ms} from '../../../shared/utils/scale';

export const FAQsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  // The FAQ API returns every match in one array (no paging), so the list is
  // paged on the device: switching pages needs no request.
  const [items, setItems] = useState<FAQItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [userRoleId, setUserRoleId] = useState<number | null>(null);

  // Fetch user role to check permissions
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const roleId = res?.data?.data?.role?.id;
        if (typeof roleId === 'number') {
          setUserRoleId(roleId);
        }
      } catch (e) {
        console.error('Error fetching user role:', e);
      }
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / DEFAULT_PAGE_LIMIT));
  const getPageItems = useCallback(
    (pageNumber: number) =>
      items.slice(
        (pageNumber - 1) * DEFAULT_PAGE_LIMIT,
        pageNumber * DEFAULT_PAGE_LIMIT,
      ),
    [items],
  );

  // Search hits the API (question_header filter): wait until typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Only the newest request may write. Before, a search typed while a
  // request was running was dropped (the list kept the old results).
  const requestRef = useRef(0);
  const fetchData = useCallback(
    async (reset = false) => {
      const requestId = ++requestRef.current;
      const isCurrent = () => requestId === requestRef.current;
      setLoading(true);
      try {
        const res = await listFAQs({question_header: debouncedQuery});
        if (!isCurrent()) {
          return;
        }
        const next = res?.data ?? [];
        setItems(next);
        // New search → first page; a reload keeps the page if it still exists.
        const lastPage = Math.max(1, Math.ceil(next.length / DEFAULT_PAGE_LIMIT));
        setPage(current => (reset ? 1 : Math.min(current, lastPage)));
        setLoadError(null);
      } catch (e) {
        if (isCurrent()) {
          console.error(e);
          setLoadError(e);
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    },
    [debouncedQuery],
  );

  const reload = useCallback(() => fetchData(), [fetchData]);

  useEffect(() => {
    fetchData(true);
    return () => {
      requestRef.current += 1;
    };
  }, [fetchData]);

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) {
      return;
    }
    setPage(targetPage);
  };

  // Back from add / edit / delete (also an edit made from the detail screen).
  useReloadOnReturn(() => fetchData(), {
    dataKey: 'faqs',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleView = (item: FAQItem) => {
    navigation.navigate('FAQDetail', {faqId: item.id});
  };

  const canManage = isSuperAdmin(userRoleId);

  const openActions = (item: FAQItem) => {
    setSelectedFAQ(item);
    setActionsVisible(true);
  };

  const renderItem = ({item}: {item: FAQItem}) => {
    const tags = (item.tags ?? []).filter(tag => tag.tag_name);
    return (
      <EntityListCard
        title={item.question_header?.trim() || `#${item.id}`}
        trailingText={`#${item.id}`}
        onPress={() => handleView(item)}
        // Edit / delete are super-admin only, so the sheet is too.
        onMorePress={canManage ? () => openActions(item) : undefined}>
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag, idx) => (
              <StatusBadge key={idx} label={tag.tag_name} tone="neutral" />
            ))}
          </View>
        )}
      </EntityListCard>
    );
  };

  const keyExtractor = (item: FAQItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('faq') || 'FAQ'} showMenu>
      <ListToolbar
        countText={
          loadError && items.length === 0
            ? undefined
            : `${items.length} ${(t('faq') || 'FAQ')}`
        }
        addRoute={canManage ? 'AddFAQ' : undefined}
      />

      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        // This screen waits for typing to pause itself.
        debounce={false}
        placeholder={t('search') || 'Search by question...'}
      />

      <View style={styles.list}>
        {/* Same single-child pager as the other CRUD lists: the swipeable
            renderPage carousel wraps the list in a GestureDetector, and on
            Android the cards' "..." button stopped opening the action sheet. */}
        <PaginatedListPager
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}>
          <FlatList
            data={getPageItems(page)}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            nestedScrollEnabled={Platform.OS === 'android'}
            style={styles.flex}
            contentContainerStyle={listContentStyle}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              isInitialLoading || !loading ? (
                <ListLoadState
                  loading={isInitialLoading}
                  error={loadError}
                  onRetry={reload}>
                  <ListEmptyState
                    title={t('noDataFound') || 'No data found'}
                    hint={searchQuery || !canManage ? undefined : t('emptyListHint')}
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
        title={selectedFAQ?.question_header || t('faq') || 'FAQ'}
        onRequestClose={() => {
          setActionsVisible(false);
          setSelectedFAQ(null);
        }}
        actions={((): ActionItem[] => {
          const list: ActionItem[] = [];
          list.push({
            label: t('view') || 'View',
            icon: 'view',
            onPress: () => {
              if (selectedFAQ) {
                navigation.navigate('FAQDetail', {faqId: selectedFAQ.id});
              }
              setActionsVisible(false);
              setSelectedFAQ(null);
            },
          });
          // Only show edit and delete for admin
          if (canManage) {
            list.push({
              label: t('edit') || 'Edit',
              icon: 'edit',
              onPress: () => {
                if (selectedFAQ) {
                  navigation.navigate('EditFAQ', {faqId: selectedFAQ.id});
                }
                setActionsVisible(false);
                setSelectedFAQ(null);
              },
            });
            list.push({
              label: t('delete') || 'Delete',
              icon: 'delete',
              type: 'danger',
              onPress: () => {
                if (selectedFAQ) {
                  navigation.navigate('DeleteFAQ', {faqId: selectedFAQ.id});
                }
                setActionsVisible(false);
                setSelectedFAQ(null);
              },
            });
          }
          return list;
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
    marginTop: ms(8),
  },
  flex: {
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
});

export default FAQsScreen;
