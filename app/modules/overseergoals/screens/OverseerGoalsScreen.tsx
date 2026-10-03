import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, RefreshControl, View, Platform} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
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
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {
  listOverseerGoalPeriods,
  OverseerGoalPeriodItem,
} from '../services/overseerGoals.service';

export const OverseerGoalsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [items, setItems] = useState<OverseerGoalPeriodItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const getSafeText = (value?: string | null) => {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  };

  const fetchData = useCallback(
    async (targetPage: number) => {
      try {
        setLoading(true);
        const response = await listOverseerGoalPeriods({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query,
        });

        const data = response?.data;
        setItems(data?.items ?? []);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        setTotalPages(Math.max(1, data?.total_pages ?? 1));
      } catch (error) {
        console.error('Failed to load overseer goals:', error);
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
  }, [fetchData]);

  useEffect(() => {
    if (route?.params?.reload || route?.params?.refresh) {
      fetchData(1);
      navigation.setParams({reload: undefined, refresh: undefined});
    }
  }, [route?.params?.reload, route?.params?.refresh]);

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

  const renderItem = ({item}: {item: OverseerGoalPeriodItem}) => {
    const nationName = getSafeText(item.nation_name) || '-';
    const churchName = getSafeText(item.local_church_name) || '-';
    const overseerName = getSafeText(item.user_name) || '-';
    const periodText = `${item.start_year ?? '-'} - ${item.end_year ?? '-'}`;

    return (
      <EntityListCard
        title={overseerName}
        trailingText={`#${item.id}`}
        onPress={() =>
          navigation.navigate('OverseerGoalDetail', {goalPeriodId: item.id})
        }>
        <CardMeta lines={1}>{churchName}</CardMeta>
        <CardMeta>
          {nationName} · {periodText}
        </CardMeta>
      </EntityListCard>
    );
  };

  const isInitialLoad = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('overseerGoals')} showMenu>
      <ListToolbar
        countText={`${total} ${t('overseerGoals').toLowerCase()}`}
        addRoute="AddOverseerGoals"
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
                <ListEmptyState
                  hint={query ? t('tryDifferentSearchKeyword') : t('emptyListHint')}
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
    </ScreenContainer>
  );
};

export default OverseerGoalsScreen;
