import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { COLORS } from '../../../shared/constants/colors';
import { globalStyles } from '../../../shared/styles/global';
import { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import { listCountries, CountryItem } from '../services/country.service';
import { EditSvgIcon, DeleteSvgIcon } from '../../../shared/components/icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import { getListStyles } from '../../../shared/styles/list';

export const CountriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();
  const L = getListStyles(C, theme);
  const [items, setItems] = useState<CountryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const fetchData = useCallback(async (targetPage: number, reset = false) => {
    try {
      if (loading) return;
      setLoading(true);
      const res = await listCountries({ page: targetPage, limit: DEFAULT_PAGE_LIMIT, name: query });
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
  }, [loading, query, items]);

  useEffect(() => {
    setItems([]);
    fetchData(1, true);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        // Clear the reload flag
        navigation.setParams({ reload: undefined });
        setItems([]);
        fetchData(1, true);
      }
    }, [route.params?.reload])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setItems([]);
    await fetchData(1, true);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) return;
    setItems([]);
    fetchData(targetPage, true);
  };

  const handleEdit = (country: CountryItem) => {
    navigation.navigate('EditCountry', { countryId: country.id });
  };

  const handleDelete = (country: CountryItem) => {
    navigation.navigate('DeleteCountry', { countryId: country.id });
  };

  const renderItem = ({ item }: { item: CountryItem }) => (
    <View style={styles.itemRow}>
      <View style={styles.itemCol}>
        <Text style={styles.name}>{item.name}</Text>
      </View>
      <View style={styles.itemColRight}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEdit(item)}>
            <EditSvgIcon />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
            <DeleteSvgIcon />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const keyExtractor = (item: CountryItem) => String(item.id);

  const renderPagination = () => {
    const itemsToRender: Array<{ label: string; page: number; active?: boolean; disabled?: boolean }> = [];
    itemsToRender.push({ label: '<<', page: 1, disabled: page === 1 });
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) itemsToRender.push({ label: String(p), page: p });
    }
    itemsToRender.push({ label: String(page), page, active: true });
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) itemsToRender.push({ label: String(p), page: p });
    }
    itemsToRender.push({ label: '>>', page: totalPages, disabled: page === totalPages });
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
            <Text style={[L.pageNumberText as any, p.active && (L.pageNumberTextActive as any)]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={[styles.container, { backgroundColor: C.background }]}>
        <Header title={t('countries')} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: C.textPrimary }]}>{t('countries')}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddCountry')}>
            <Text style={styles.addButtonText}>+ {t('addNew')}</Text>
          </TouchableOpacity>
        </View>

        <View style={L.searchContainer as any}>
          <Text style={L.searchIcon as any}>🔎</Text>
          <TextInput
            style={L.searchInput as any}
            placeholder={t('search')}
            placeholderTextColor={C.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => goToPage(1)}
          />
        </View>

        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <View style={L.itemCard as any}>
              <View style={L.itemRow as any}>
                <View style={styles.itemCol}>
                  <Text style={[styles.name, { color: C.textPrimary }]}>{item.name}</Text>
                </View>
                <View style={styles.itemColRight}>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEdit(item)}>
                      <EditSvgIcon />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                      <DeleteSvgIcon />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: C.textSecondary }]}>{t('noChurchesFound')}</Text> : null}
        />
        <Text style={[styles.subTitle, { color: C.textSecondary }]}>{`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}</Text>

        <View style={styles.pagination}>{renderPagination()}</View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subTitle: {
    marginTop: 6,
    marginBottom: 10,
    color: '#666',
    fontSize: 12,
  },
  search: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    color: '#000',
    marginBottom: 10,
    marginTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemCol: {
    flex: 1,
    paddingRight: 8,
  },
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
    width: 72,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
  pagination: {
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 