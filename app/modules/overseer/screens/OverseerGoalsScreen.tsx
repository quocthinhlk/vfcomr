import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
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
import {
  listOverseerGoalPeriods,
  OverseerGoalPeriodItem,
} from '../services/overseerGoals.service';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';

const editIcon = require('../../../assets/icons/edit.png');

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
          <View style={styles.titleContent}>
            <View
              style={[
                styles.periodBadge,
                {
                  borderColor: C.inputBorder,
                },
              ]}>
              <Text style={[styles.periodBadgeText, {color: C.textSecondary}]}>
                {periodText}
              </Text>
            </View>
            <Text
              style={[styles.nationName, {color: C.textPrimary}]}
              numberOfLines={1}>
              {nationName}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled
            style={[
              styles.editButton,
              {backgroundColor: C.surface},
            ]}>
            <Image source={editIcon} style={styles.editIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <View style={styles.detailsCard}>
          <View style={[styles.detailRow, {borderBottomColor: C.inputBorder}]}>
            <Text style={[styles.infoLabel, {color: C.textSecondary}]}>
              {t('church')}
            </Text>
            <Text
              style={[styles.infoValue, {color: C.textPrimary}]}
              numberOfLines={2}>
              {churchName}
            </Text>
          </View>

          <View
            style={[
              styles.detailRow,
              styles.detailRowLast,
              {borderBottomColor: C.inputBorder},
            ]}>
            <Text style={[styles.infoLabel, {color: C.textSecondary}]}>
              {t('assignedTo')}
            </Text>
            <Text
              style={[styles.infoValue, {color: C.textPrimary}]}
              numberOfLines={1}>
              {assignedTo}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, {color: C.textSecondary}]}>
            {`${t('period')}: ${periodText}`}
          </Text>
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

        <FlatList
          data={isInitialLoad ? [] : items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
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
          showsVerticalScrollIndicator={false}
        />

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
    paddingHorizontal: ms(16),
  },
  listContent: {
    paddingBottom: ms(8),
  },
  itemCard: {
    shadowColor: '#000',
    shadowRadius: ms(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardBody: {
    flex: 1,
  },
  addButtonRow: {
    alignItems: 'flex-end',
    marginBottom: ms(10),
  },
  addButton: {
    marginTop: 0,
    minWidth: ws(88),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContent: {
    flex: 1,
    paddingRight: ms(12),
  },
  nationName: {
    fontSize: fs(16),
    fontWeight: '700',
    marginTop: ms(8),
  },
  periodBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: ms(999),
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
  },
  periodBadgeText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  editButton: {
    width: ws(24),
    height: ws(24),
    borderRadius: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: ws(16),
    height: ws(16),
  },
  detailsCard: {
    marginTop: ms(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ms(12),
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.lightGray,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    width: '28%',
    fontSize: fs(12),
    fontWeight: '700',
  },
  infoValue: {
    flex: 1,
    fontSize: fs(13),
    fontWeight: '600',
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(12),
  },
  metaText: {
    fontSize: fs(11),
  },
  subTitle: {
    marginTop: ms(6),
    marginBottom: ms(10),
    fontSize: fs(12),
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
    paddingVertical: ms(12),
    alignItems: 'flex-end',
  },
});

export default OverseerGoalsScreen;
