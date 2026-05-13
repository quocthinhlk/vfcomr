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
import {
  listChurchTypes,
  ChurchTypeItem,
} from '../services/churchtype.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
// pagination buttons will follow list styles like ListChurchScreen
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {EditSvgIcon} from '../../../shared/components/icons';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';

export const ChurchTypesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();
  const [items, setItems] = useState<ChurchTypeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<ChurchTypeItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listChurchTypes({search: query});
        const full = res?.data?.items ?? [];
        const filtered = query
          ? full.filter(i =>
              i.name?.toLowerCase().includes(query.trim().toLowerCase()),
            )
          : full;
        const total = filtered.length;
        const totalPages = Math.max(
          1,
          Math.ceil(total / DEFAULT_PAGE_LIMIT),
        );
        const validPage = Math.min(Math.max(1, targetPage), totalPages);
        const start = (validPage - 1) * DEFAULT_PAGE_LIMIT;
        const end = start + DEFAULT_PAGE_LIMIT;
        const pageSlice = filtered.slice(start, end);

        setTotalPages(totalPages);
        setTotal(total);
        setPage(validPage);
        setItems(pageSlice);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, query],
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

  const handleEdit = (item: ChurchTypeItem) => {
    navigation.navigate('EditChurchType', {churchTypeId: item.id});
  };

  // Delete action removed per request

  const renderItem = ({item}: {item: ChurchTypeItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleEdit(item)}
      onLongPress={() => {
        setSelectedType(item);
        setActionsVisible(true);
      }}
      delayLongPress={300}
    >
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
  );

  const keyExtractor = (item: ChurchTypeItem) => String(item.id);

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
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('churchTypes')} />

        <View style={styles.headerRow}>
          <AddNewHeaderButton name="AddChurchType" text={t('addNew')} />
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
              renderItem={renderItem}
              nestedScrollEnabled={Platform.OS === 'android'}
              style={{flex: 1}}
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
          title={selectedType?.name || t('churchTypes')}
          onRequestClose={() => {
            setActionsVisible(false);
            setSelectedType(null);
          }}
          actions={((): ActionItem[] => {
            const list: ActionItem[] = [];
            list.push({
              label: (t as any)('edit') || 'Edit',
              onPress: () => {
                if (selectedType) {
                  navigation.navigate('EditChurchType', {
                    churchTypeId: selectedType.id,
                  });
                }
                setActionsVisible(false);
                setSelectedType(null);
              },
            });
            list.push({
              label: (t as any)('delete') || 'Delete',
              type: 'danger',
              onPress: () => {
                if (selectedType) {
                  navigation.navigate('DeleteChurchType', {
                    churchTypeId: selectedType.id,
                  });
                }
                setActionsVisible(false);
                setSelectedType(null);
              },
            });
            return list;
          })()}
        />
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
    justifyContent: 'flex-end',
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
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingVertical: ms(8),
    paddingHorizontal: ms(12),
    borderRadius: rs(6),
  },
  addButtonText: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '600',
  },
});

export default ChurchTypesScreen; 