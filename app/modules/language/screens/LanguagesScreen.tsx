import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listLanguages, LanguageItem} from '../services/language.service';
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

export const LanguagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();
  const [items, setItems] = useState<LanguageItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageItem | null>(null);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listLanguages({name: query});
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

  const handleEdit = (item: LanguageItem) => {
    navigation.navigate('EditLanguage', {languageId: item.id});
  };

  const handleDelete = (item: LanguageItem) => {
    navigation.navigate('DeleteLanguage', {languageId: item.id});
  };

  const renderItem = ({item}: {item: LanguageItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleEdit(item)}
      onLongPress={() => {
        setSelectedLanguage(item);
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
                <EditSvgIcon width={fs(15)} height={fs(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: LanguageItem) => String(item.id);

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
          <Header title={t('languages')} />

          <View style={styles.headerRow}>
            <AddNewHeaderButton name="AddLanguage" text={t('addNew')} />
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
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  No data found
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
            title={selectedLanguage?.name || t('languages')}
            onRequestClose={() => {
              setActionsVisible(false);
              setSelectedLanguage(null);
            }}
            actions={((): ActionItem[] => {
              const list: ActionItem[] = [];
              list.push({
                label: t('edit'),
                onPress: () => {
                  if (selectedLanguage) {
                    navigation.navigate('EditLanguage', {
                      languageId: selectedLanguage.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedLanguage(null);
                },
              });
              list.push({
                label: t('delete'),
                type: 'danger',
                onPress: () => {
                  if (selectedLanguage) {
                    navigation.navigate('DeleteLanguage', {
                      languageId: selectedLanguage.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedLanguage(null);
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
    fontSize: fs(12),
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
});

export default LanguagesScreen;
