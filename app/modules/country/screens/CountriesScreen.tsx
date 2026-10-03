import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listCountries, CountryItem} from '../services/country.service';
import {EditSvgIcon} from '../../../shared/components/icons';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';

export const CountriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const [items, setItems] = useState<CountryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem | null>(
    null,
  );

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listCountries({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query,
        });
        const nextItems = res?.data?.items ?? [];
        setTotalPages(res?.data?.total_pages ?? 1);
        setTotal(res?.data?.total ?? 0);
        setPage(res?.data?.page ?? targetPage);
        setItems(reset ? nextItems : [...items, ...nextItems]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, query, items],
  );

  useEffect(() => {
    setItems([]);
    fetchData(1, true);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        // Clear the reload flag
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

  const handleEdit = (country: CountryItem) => {
    navigation.navigate('EditCountry', {countryId: country.id});
  };

  const handleDelete = (country: CountryItem) => {
    navigation.navigate('DeleteCountry', {countryId: country.id});
  };

  const keyExtractor = (item: CountryItem) => String(item.id);

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
            disabled={!!p.disabled || loading}
          >
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
          <Header title={t('countries')} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, {color: C.textPrimary}]}>
              {t('countries')}
            </Text>
            <AddNewHeaderButton
              name="AddCountry"
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
                data={items}
                keyExtractor={keyExtractor}
                nestedScrollEnabled={Platform.OS === 'android'}
                style={{flex: 1}}
                renderItem={({item}) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleEdit(item)}
                    onLongPress={() => {
                      setSelectedCountry(item);
                      setActionsVisible(true);
                    }}
                    delayLongPress={300}>
                    <View style={L.itemCard as any}>
                      <View style={L.itemRow as any}>
                        <View style={styles.itemCol}>
                          <Text style={[styles.name, {color: C.textPrimary}]}>
                            {item.name}
                          </Text>
                        </View>
                        <View style={styles.itemColRight}>
                          <View style={styles.actionRow}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.editBtn]}
                              onPress={() => handleEdit(item)}>
                              <EditSvgIcon width={ws(15)} height={hs(15)} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  !loading ? (
                    <Text style={[styles.empty, {color: C.textSecondary}]}>
                      {t('noChurchesFound')}
                    </Text>
                  ) : null
                }
              />
            </PaginatedListPager>
          </View>
          <Text style={[styles.subTitle, {color: C.textSecondary}]}>
            {`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}
          </Text>

          <View style={styles.pagination}>{renderPagination()}</View>

          <ActionSheetModal
            visible={actionsVisible}
            title={selectedCountry?.name || t('country')}
            onRequestClose={() => {
              setActionsVisible(false);
              setSelectedCountry(null);
            }}
            actions={((): ActionItem[] => {
              const acts: ActionItem[] = [];
              acts.push({
                label: t('edit'),
                icon: 'edit',
                onPress: () => {
                  if (selectedCountry) {
                    navigation.navigate('EditCountry', {
                      countryId: selectedCountry.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedCountry(null);
                },
              });
              acts.push({
                label: t('delete'),
                icon: 'delete',
                type: 'danger',
                onPress: () => {
                  if (selectedCountry) {
                    navigation.navigate('DeleteCountry', {
                      countryId: selectedCountry.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedCountry(null);
                },
              });
              return acts;
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
    backgroundColor: '#fff',
    paddingHorizontal: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  subTitle: {
    marginTop: ms(6),
    marginBottom: ms(10),
    color: '#666',
    fontSize: fs(12),
  },
  search: {
    height: hs(40),
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: rs(6),
    paddingHorizontal: ms(12),
    color: '#000',
    marginBottom: ms(10),
    marginTop: ms(6),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    marginBottom: ms(2),
  },
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
    color: '#888',
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
  editBtn: {
    backgroundColor: COLORS.successColor,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerColor,
  },
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingVertical: ms(8),
    paddingHorizontal: ms(12),
    borderRadius: rs(3),
  },
  addButtonText: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '600',
  },
}); 