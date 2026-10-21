import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Platform, RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  CardMeta,
  CenteredLoader,
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {listUsers, ListUsersItem} from '../../user/services/user.service';

/**
 * Push Mail > Search (old web: users/listuserstoconfigure): every user, searchable;
 * tapping one opens their push report settings.
 */
export const PushMailSearchScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<ListUsersItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState<unknown>(null);

  const fetchData = useCallback(
    async (targetPage: number) => {
      try {
        setLoading(true);
        const response = await listUsers({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query.trim(),
        });
        const data = response?.data;
        setItems(data?.items ?? []);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        setTotalPages(Math.max(1, data?.total_pages ?? 1));
        setLoadError(null);
      } catch (error) {
        console.error('Failed to load users for push mail:', error);
        setLoadError(error);
        setItems([]);
        setTotal(0);
        setPage(1);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    fetchData(1);
    // Search runs on submit, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const renderItem = ({item}: {item: ListUsersItem}) => {
    const name = String(item.name ?? '').trim() || '-';
    const roleCountry = [item.role_name, item.country_name].filter(Boolean).join(' · ');
    const contact = [item.email, item.mobile_phone].filter(Boolean).join(' · ');
    return (
      <EntityListCard
        title={name}
        trailingText={`#${item.id}`}
        onPress={() => navigation.navigate('PushReportConfig', {userId: item.id, name})}>
        {roleCountry ? <CardMeta lines={1}>{roleCountry}</CardMeta> : null}
        {contact ? <CardMeta lines={1}>{contact}</CardMeta> : null}
      </EntityListCard>
    );
  };

  const isInitialLoad = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('pushMail')} showMenu>
      <ListToolbar
        countText={
          loadError && items.length === 0 ? undefined : `${total} ${t('users').toLowerCase()}`
        }
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('search')}
        onSubmitEditing={() => fetchData(1)}
      />

      <View style={{flex: 1, minHeight: 0}}>
        <PaginatedListPager page={page} totalPages={totalPages} onPageChange={goToPage}>
          <FlatList
            data={isInitialLoad ? [] : items}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={Platform.OS === 'android'}
            style={{flex: 1}}
            contentContainerStyle={listContentStyle}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.mainColor]}
                tintColor={COLORS.mainColor}
              />
            }
            ListEmptyComponent={
              isInitialLoad ? (
                <CenteredLoader />
              ) : !loading ? (
                <ListLoadState error={loadError} onRetry={() => fetchData(page)}>
                  <ListEmptyState
                    hint={query ? t('tryDifferentSearchKeyword') : t('emptyListHint')}
                  />
                </ListLoadState>
              ) : null
            }
          />
        </PaginatedListPager>
      </View>

      <ListPageBar page={page} totalPages={totalPages} loading={loading} onPageChange={goToPage} />
    </ScreenContainer>
  );
};

export default PushMailSearchScreen;
