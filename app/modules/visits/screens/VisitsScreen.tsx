import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  listVisits,
  VisitItem,
} from '../services/visit.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {ms} from '../../../shared/utils/scale';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {getIsoWeekDateRangeLabelFull} from '../../../shared/utils/isoWeek';
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

export const VisitsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [items, setItems] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const fetchData = useCallback(
    async (targetPage: number = 1, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);

        const params: any = {
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          year: year,
        };

        if (weekNumber) {
          params.week_number = weekNumber;
        }

        const res = await listVisits(params);
        const visits = res?.data?.items ?? [];

        const filtered = query.trim()
          ? visits.filter((v: VisitItem) =>
              [
                String(v.id),
                String(v.user_id),
                String(v.user_name),
                String(v.church_id),
                String(v.church_name),
                String(v.year),
                String(v.week_number),
                String(v.number_of_days),
              ].some(value => value.includes(query.trim()))
            )
          : visits;

        setTotal(res?.data?.total ?? 0);
        setTotalPages(res?.data?.total_pages ?? 1);
        setPage(res?.data?.page ?? targetPage);
        setItems(filtered);
      } catch (e) {
        console.error('Error fetching visits:', e);
        Alert.alert(t('error') || 'Error', t('failedToLoadVisits') || 'Failed to load visits');
      } finally {
        setLoading(false);
      }
    },
    [loading, t, year, weekNumber, query],
  );

  useEffect(() => {
    fetchData(1, true);
  }, [year, weekNumber]);

  useEffect(() => {
    fetchData(1, true);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        navigation.setParams({reload: undefined});
        fetchData(1, true);
      }
    }, [route.params?.reload, fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1, true);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) {
      return;
    }
    fetchData(targetPage, true);
  };

  const handleView = (item: VisitItem) => {
    navigation.navigate('VisitDetail', {visitId: item.id});
  };

  const openActions = (item: VisitItem) => {
    setSelectedVisit(item);
    setActionsVisible(true);
  };

  const renderItem = ({item}: {item: VisitItem}) => (
    <EntityListCard
      title={getIsoWeekDateRangeLabelFull(item.year, item.week_number)}
      trailingText={`#${item.id}`}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <CardMeta>
        {t('userName') || 'Name'}: {item.user_name ?? item.user_id}
        {' • '}
        {t('churchName') || 'Church'}: {item.church_name ?? item.church_id}
      </CardMeta>
      <CardMeta>
        {t('numberOfDays') || 'Number of Days'}: {item.number_of_days}
      </CardMeta>
    </EntityListCard>
  );

  const keyExtractor = (item: VisitItem) => String(item.id);

  const yearOptions = Array.from(
    {length: new Date().getFullYear() + 1 - 1900 + 1},
    (_, i) => {
      const y = new Date().getFullYear() + 1 - i;
      return {label: String(y), value: y};
    },
  );

  const weekOptions = [
    {label: t('all') || 'All', value: 0},
    ...Array.from({length: 52}, (_, i) => ({
      label: String(i + 1),
      value: i + 1,
    })),
  ];

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('visits') || 'Visits'} showMenu>
      <ListToolbar
        countText={`${total} ${(t('visits') || 'Visits').toLowerCase()}`}
        addRoute="AddVisits"
      />

      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <ElementDropdown
            data={yearOptions}
            value={year as any}
            onChange={v => {
              setYear(v as number);
            }}
            placeholder={t('year') || 'Year'}
            containerStyle={
              {
                backgroundColor: C.inputBg,
                borderColor: C.inputBorder,
              } as any
            }
          />
        </View>
        <View style={styles.filterItem}>
          <ElementDropdown
            data={weekOptions}
            value={weekNumber as any}
            onChange={v => {
              setWeekNumber((v as number) === 0 ? null : (v as number));
            }}
            placeholder={t('week') || 'Week'}
            containerStyle={
              {
                backgroundColor: C.inputBg,
                borderColor: C.inputBorder,
              } as any
            }
          />
        </View>
      </View>

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={
          t('searchByIdUserChurchYearWeek') || 'Search by id, user, church, year, week...'
        }
      />

      <View style={styles.listWrap}>
        <PaginatedListPager
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          pagerRemountKey={`${year}-${weekNumber ?? ''}`}>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            nestedScrollEnabled={Platform.OS === 'android'}
            style={styles.list}
            contentContainerStyle={listContentStyle}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              isInitialLoading ? (
                <CenteredLoader />
              ) : !loading ? (
                <ListEmptyState hint={query ? undefined : t('emptyListHint')} />
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
        title={
          selectedVisit
            ? `${t('year') || 'Year'} ${selectedVisit.year} • ${t('week') || 'Week'} ${selectedVisit.week_number}`
            : t('visit') || 'Visit'
        }
        onRequestClose={() => {
          setActionsVisible(false);
          setSelectedVisit(null);
        }}
        actions={((): ActionItem[] => {
          const list: ActionItem[] = [];
          list.push({
            label: t('view') || 'View',
            icon: 'view',
            onPress: () => {
              if (selectedVisit) {
                navigation.navigate('VisitDetail', {
                  visitId: selectedVisit.id,
                });
              }
              setActionsVisible(false);
              setSelectedVisit(null);
            },
          });
          list.push({
            label: t('edit') || 'Edit',
            icon: 'edit',
            onPress: () => {
              if (selectedVisit) {
                navigation.navigate('EditVisit', {
                  visitId: selectedVisit.id,
                });
              }
              setActionsVisible(false);
              setSelectedVisit(null);
            },
          });
          return list;
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(8),
    marginBottom: ms(8),
  },
  filterItem: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
});

export default VisitsScreen;

