import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {getListStyles} from '../../../shared/styles/list';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  listOverseerGoalPeriods,
  OverseerGoalPeriodItem,
} from '../services/overseerGoals.service';
import {fs, ms} from '../../../shared/utils/scale';

export const OverseerGoalsScreen = () => {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
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

  const renderPagination = () => {
    const itemsToRender: Array<{
      label: string;
      page: number;
      active?: boolean;
      disabled?: boolean;
    }> = [];

    itemsToRender.push({label: '<<', page: 1, disabled: page === 1});

    for (let p = page - 2; p <= page - 1; p += 1) {
      if (p >= 1) {
        itemsToRender.push({label: String(p), page: p});
      }
    }

    itemsToRender.push({label: String(page), page, active: true});

    for (let p = page + 1; p <= page + 2; p += 1) {
      if (p <= totalPages) {
        itemsToRender.push({label: String(p), page: p});
      }
    }

    itemsToRender.push({
      label: '>>',
      page: totalPages,
      disabled: page === totalPages,
    });

    return (
      <View style={L.pageNumbersContainer as any}>
        {itemsToRender.map(p => (
          <TouchableOpacity
            key={`${p.label}-${p.page}`}
            style={[
              L.pageNumber as any,
              p.active && (L.pageNumberActive as any),
              (p.disabled || loading) && (L.pageNumberDisabled as any),
            ]}
            onPress={() => goToPage(p.page)}
            disabled={!!p.disabled || loading}>
            <Text
              style={[
                L.pageNumberText as any,
                p.active && (L.pageNumberTextActive as any),
              ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderItem = ({item}: {item: OverseerGoalPeriodItem}) => {
    const nationName = getSafeText(item.nation_name) || '-';
    const churchName = getSafeText(item.local_church_name) || '-';
    const overseerName = getSafeText(item.user_name) || '-';
    const periodText = `${item.start_year ?? '-'} - ${item.end_year ?? '-'}`;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('OverseerGoalDetail', {goalPeriodId: item.id})
        }
        style={[
          L.itemCard as any,
          styles.itemCard,
          {
            backgroundColor: C.surface,
            borderColor: C.inputBorder,
            shadowOpacity: theme === 'dark' ? 0 : 0.06,
          },
        ]}>
        <Text style={styles.overseerName} numberOfLines={2}>
          {overseerName}
        </Text>
        <Text style={[styles.churchName, {color: C.textPrimary}]}>{churchName}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, {color: C.textSecondary}]} numberOfLines={2}>
            {nationName} · {periodText}
          </Text>
          <Text style={[styles.metaId, {color: C.textSecondary}]}>#{item.id}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isInitialLoad = loading && items.length === 0 && !refreshing;

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('overseerGoals')} />

        <View style={styles.headerRow}>
          <AddNewHeaderButton
            name="AddOverseerGoals"
            text={t('addNew')}
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: COLORS.mainColor,
            }}
            textStyle={{color: COLORS.mainColor}}
          />
        </View>

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
                  <View style={styles.emptyWrap}>
                    <ActivityIndicator size="small" color={COLORS.mainColor} />
                  </View>
                ) : !loading ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyIcon}>🎯</Text>
                    <Text style={[styles.emptyTitle, {color: C.textPrimary}]}>
                      {t('noDataFound')}
                    </Text>
                    {!!query && (
                      <Text style={[styles.emptyHint, {color: C.textSecondary}]}>
                        {t('tryDifferentSearchKeyword')}
                      </Text>
                    )}
                  </View>
                ) : null
              }
              contentContainerStyle={[
                styles.listContent,
                items.length === 0 ? styles.emptyContent : null,
              ]}
            />
          </PaginatedListPager>
        </View>

        <Text style={[styles.subTitle, {color: C.textSecondary}]}>
          {`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}
        </Text>

        <View style={styles.pagination}>{renderPagination()}</View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  listContent: {
    paddingBottom: ms(4),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  itemCard: {
    padding: ms(10),
    marginBottom: ms(8),
    shadowColor: '#000',
    shadowRadius: ms(4),
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  overseerName: {
    color: COLORS.mainColor,
    fontSize: fs(14),
    fontWeight: '700',
    lineHeight: fs(18),
  },
  churchName: {
    fontSize: fs(13),
    fontWeight: '600',
    lineHeight: fs(18),
    marginTop: ms(4),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(8),
    marginTop: ms(4),
  },
  metaText: {
    flex: 1,
    fontSize: fs(12),
    lineHeight: fs(16),
  },
  metaId: {
    fontSize: fs(11),
    fontWeight: '600',
    lineHeight: fs(16),
  },
  subTitle: {
    marginTop: ms(4),
    marginBottom: ms(8),
    fontSize: fs(11.5),
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: ms(56),
    paddingHorizontal: ms(20),
  },
  emptyIcon: {
    fontSize: fs(28),
    marginBottom: ms(10),
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: fs(14),
    fontWeight: '700',
  },
  emptyHint: {
    textAlign: 'center',
    fontSize: fs(12),
    marginTop: ms(6),
  },
  emptyContent: {
    flexGrow: 1,
  },
  pagination: {
    paddingVertical: ms(8),
    alignItems: 'flex-end',
  },
});

export default OverseerGoalsScreen;
