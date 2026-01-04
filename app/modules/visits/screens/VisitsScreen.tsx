import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  listVisits,
  VisitItem,
} from '../services/visit.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {EditSvgIcon} from '../../../shared/components/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import {COLORS} from '../../../shared/constants/colors';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';

export const VisitsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();
  const [items, setItems] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitItem | null>(null);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const fetchChurchInfo = useCallback(async (id: number) => {
    try {
      const res = await api.get(`churches/${id}`);
      const churchData = res?.data?.data;
      if (churchData?.name) {
        setChurchName(churchData.name);
      }
    } catch (e) {
      console.error('Error fetching church info:', e);
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await api.get('users/me');
      const userData = res?.data?.data;
      if (userData?.id) {
        setUserId(userData.id);
      }
    } catch (e) {
      console.error('Error fetching user info:', e);
    }
  }, []);

  const fetchData = useCallback(
    async (targetPage: number = 1, reset = false) => {
      try {
        if (loading) {
          return;
        }
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
          return;
        }
        setChurchId(id);
        setLoading(true);
        
        const params: any = {
          church_id: id,
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          year: year,
        };
        
        if (userId) {
          params.user_id = userId;
        }
        
        if (weekNumber) {
          params.week_number = weekNumber;
        }

        const res = await listVisits(params);
        const visits = res?.data?.items ?? [];
        
        // Filter by search query (week_number)
        const filtered = query.trim()
          ? visits.filter((v: VisitItem) =>
              String(v.week_number).includes(query.trim())
            )
          : visits;
        
        setTotal(res?.data?.total ?? 0);
        setTotalPages(res?.data?.total_pages ?? 1);
        setPage(res?.data?.page ?? targetPage);
        setItems(filtered);
        await fetchChurchInfo(id);
      } catch (e) {
        console.error('Error fetching visits:', e);
        Alert.alert(t('error') || 'Error', t('failedToLoadVisits') || 'Failed to load visits');
      } finally {
        setLoading(false);
      }
    },
    [loading, t, fetchChurchInfo, year, weekNumber, userId, query],
  );

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

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

  const handleDelete = (item: VisitItem) => {
    navigation.navigate('DeleteVisit', {visitId: item.id});
  };

  const renderItem = ({item}: {item: VisitItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleView(item)}
      onLongPress={() => {
        setSelectedVisit(item);
        setActionsVisible(true);
      }}
      delayLongPress={300}>
      <View style={L.itemCard as any}>
        <View style={L.itemRow as any}>
          <View style={styles.itemCol}>
            <Text style={[styles.name, {color: C.textPrimary}]}>
              {t('year') || 'Year'}: {item.year} • {t('week') || 'Week'}: {item.week_number}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, {color: C.textSecondary}]}>
                {t('numberOfDays') || 'Number of Days'}: {item.number_of_days}
              </Text>
            </View>
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item)}>
                <EditSvgIcon width={fs(15)} height={fs(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: VisitItem) => String(item.id);

  const yearOptions = Array.from({length: 10}, (_, i) => {
    const y = new Date().getFullYear() - 5 + i;
    return {label: String(y), value: y};
  });

  const weekOptions = [
    {label: t('all') || 'All', value: null},
    ...Array.from({length: 52}, (_, i) => ({
      label: String(i + 1),
      value: i + 1,
    })),
  ];

  const renderPagination = () => {
    const itemsToRender: Array<{
      label: string;
      page: number;
      active?: boolean;
      disabled?: boolean;
    }> = [];
    itemsToRender.push({label: '<<', page: 1, disabled: page === 1});
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) itemsToRender.push({label: String(p), page: p});
    }
    itemsToRender.push({label: String(page), page, active: true});
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) itemsToRender.push({label: String(p), page: p});
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

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('visits') || 'Visits'} />

          {churchName ? (
            <View style={[styles.churchNameContainer, {backgroundColor: C.surface, borderColor: C.border}]}>
              <Text style={[styles.churchNameLabel, {color: C.textSecondary}]}>
                {t('church') || 'Church'}:{' '}
              </Text>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {churchName}
              </Text>
            </View>
          ) : null}

          <View style={styles.headerRow}>
            <AddNewHeaderButton
              name="AddVisits"
              text={t('addNew') || 'Add New'}
            />
          </View>

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
                  setWeekNumber(v === null ? null : (v as number));
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
            placeholder={t('search') || 'Search by week number...'}
          />

          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  {t('noDataFound') || 'No data found'}
                </Text>
              ) : null
            }
          />

          <Text style={[styles.subTitle, {color: C.textSecondary}]}>
            {`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}
          </Text>

          <View style={styles.pagination}>{renderPagination()}</View>

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
                label: t('delete') || 'Delete',
                type: 'danger',
                onPress: () => {
                  if (selectedVisit) {
                    navigation.navigate('DeleteVisit', {
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
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  churchNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(8),
    marginBottom: ms(4),
    paddingVertical: ms(4),
  },
  churchNameLabel: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '600',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: ms(8),
  },
  filterRow: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(8),
    marginBottom: ms(8),
  },
  filterItem: {
    flex: 1,
  },
  itemCol: {
    flex: 1,
    paddingRight: ms(8),
  },
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  name: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(4),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    marginTop: ms(2),
  },
  metaText: {
    fontSize: fs(12),
  },
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
  },
  subTitle: {
    marginTop: ms(6),
    marginBottom: ms(10),
    fontSize: fs(12),
  },
  pagination: {
    paddingVertical: ms(12),
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    gap: ms(6),
  },
  actionBtn: {
    width: ws(25),
    height: ws(25),
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerColor,
  },
});

export default VisitsScreen;

