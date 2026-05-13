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
import {fs, ms, rs, ws} from '../../../shared/utils/scale';

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
    const assignedTo = getSafeText(item.user_name) || '-';
    const periodText = `${item.start_year ?? '-'} - ${item.end_year ?? '-'}`;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
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
        <View
        style={[
          styles.cardBody,
        ]}>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.nationName, {color: C.textPrimary}]}
            numberOfLines={1}>
            {nationName}
          </Text>
          <View
            style={[
              styles.periodBadge,
              {
                borderColor: C.inputBorder,
                backgroundColor: C.background,
              },
            ]}>
            <Text style={[styles.periodBadgeText, {color: C.textSecondary}]}>
              {periodText}
            </Text>
          </View>

        </View>

        <View
          style={[
            styles.infoList,
            {borderTopColor: C.inputBorder},
          ]}>
          <View style={styles.infoLine}>
            <Text style={[styles.infoLabelInline, {color: C.textSecondary}]}>
              {t('church')}:
            </Text>
            <Text style={[styles.infoValueInline, {color: C.textPrimary}]}>
              {churchName}
            </Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={[styles.infoLabelInline, {color: C.textSecondary}]}>
              {t('assignedTo')}:
            </Text>
            <Text
              style={[styles.infoValueInline, {color: C.textPrimary}]}
              numberOfLines={1}>
              {assignedTo}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, {color: C.textSecondary}]}>
            {`#${item.id}`}
          </Text>
        </View>
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

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search')}
          onSubmitEditing={() => goToPage(1)}
        />

        <View style={styles.addButtonRow}>
          <AddNewHeaderButton
            name="AddOverseerGoals"
            text={t('addNew')}
            style={styles.addButton}
          />
        </View>

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
  itemCard: {
    padding: ms(10),
    marginBottom: ms(8),
    shadowColor: '#000',
    shadowRadius: ms(4),
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  cardBody: {
    flex: 1,
  },
  addButtonRow: {
    alignItems: 'flex-end',
    marginBottom: ms(8),
  },
  addButton: {
    marginTop: 0,
    minWidth: ws(88),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nationName: {
    fontSize: fs(15),
    fontWeight: '700',
    flex: 1,
    marginRight: ms(8),
  },
  periodBadge: {
    borderWidth: 1,
    borderRadius: ms(999),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
  },
  periodBadgeText: {
    fontSize: fs(10.5),
    fontWeight: '700',
  },
  infoList: {
    marginTop: ms(8),
    paddingTop: ms(6),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: ms(3),
  },
  infoLabelInline: {
    fontSize: fs(11),
    fontWeight: '700',
    marginRight: ms(6),
  },
  infoValueInline: {
    flex: 1,
    fontSize: fs(12.5),
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: ms(6),
  },
  metaText: {
    fontSize: fs(10.5),
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
