import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  TextInput,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {COLORS} from '../../../shared/constants/colors';
import {Header} from '../../../shared/components/Header';
import {BackButton} from '../../../shared/components/BackButton';
import {globalStyles} from '../../../shared/styles/global';
import {useNavigation, useRoute} from '@react-navigation/native';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  getChurchesList,
  ChurchListItem,
} from '../services/church.service';
import {EditSvgIcon} from '../../../shared/components/icons';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';

export const ChurchesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const [items, setItems] = useState<ChurchListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<ChurchListItem | null>(null);

  

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const data = await getChurchesList({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          sort_by: 'id',
          sort_desc: true,
          name: query && query.trim() ? query.trim() : undefined,
        });
        const nextItems = (data?.items ?? []) as ChurchListItem[];
        setTotalPages(data?.total_pages ?? 1);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        setItems(reset ? nextItems : [...items, ...nextItems]);
      } catch (e) {
        // noop UI-level
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

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const r = res?.data?.data?.role?.id;
        if (typeof r === 'number') setRoleId(r);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const shouldRefresh = !!route?.params?.refresh;
      if (shouldRefresh) {
        setItems([]);
        fetchData(1, true);
        try { navigation.setParams({ refresh: false }); } catch {}
      }
    });
    return unsubscribe;
  }, [navigation, fetchData, route?.params?.refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    setItems([]);
    await fetchData(1, true);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) {return;}
    setItems([]);
    fetchData(targetPage, true);
  };

  const renderItem = ({item}: {item: ChurchListItem}) => {
    const name = item.name || '';
    const initials =
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase())
        .join('') || 'C';
    const isMother = (item as any)?.is_mother_church;
    const isMsc = (item as any)?.is_msc;
    return (
      <TouchableOpacity
        style={listStyles.itemCard as any}
        onPress={() => navigation.navigate('ChurchDetail', { id: item.id })}
        onLongPress={() => { setSelectedChurch(item); setActionsVisible(true); }}
        delayLongPress={300}
      >
        <View style={listStyles.itemRow as any}>
          <View style={listStyles.avatarWrap as any}>
            <View style={listStyles.avatar as any}>
              <Text style={listStyles.avatarText as any}>{initials}</Text>
            </View>
          </View>
          <View style={styles.itemCol}>
            <Text
              style={[styles.name, {color: C.textPrimary}]}
              numberOfLines={1}>
              {name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: ms(6),
                marginTop: ms(2),
              }}>
              {isMother ? (
                <View style={[styles.badge, styles.badgePrimary]}>
                  <Text style={styles.badgeTextPrimary}>
                    {t('motherChurch') || 'Mother'}
                  </Text>
                </View>
              ) : null}
              {isMsc ? (
                <View style={[styles.badge, styles.badgeInfo]}>
                  <Text style={styles.badgeTextInfo}>{t('msc')}</Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[styles.meta, {color: C.textSecondary}]}
              numberOfLines={1}>
              {item.city} · {item.country_name}
            </Text>
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => navigation.navigate('EditChurch', { id: item.id })}>
                <EditSvgIcon width={ws(15)} height={hs(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: ChurchListItem) => String(item.id);

  const renderPagination = () => {
    const itemsToRender: Array<{
      label: string;
      page: number;
      active?: boolean;
      disabled?: boolean;
    }> = [];
    itemsToRender.push({label: '<<', page: 1, disabled: page === 1});
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) {itemsToRender.push({label: String(p), page: p});}
    }
    itemsToRender.push({label: String(page), page, active: true});
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) {itemsToRender.push({label: String(p), page: p});}
    }
    itemsToRender.push({
      label: '>>',
      page: totalPages,
      disabled: page === totalPages,
    });
    return (
      <View style={listStyles.pageNumbersContainer as any}>
        {itemsToRender.map(p => (
          <TouchableOpacity
            key={`${p.label}-${p.page}`}
            style={[
              listStyles.pageNumber as any,
              p.active && (listStyles.pageNumberActive as any),
              (p.disabled || loading) && (listStyles.pageNumberDisabled as any),
            ]}
            onPress={() => goToPage(p.page)}
            disabled={!!p.disabled || loading}>
            <Text
              style={[
                listStyles.pageNumberText as any,
                p.active && (listStyles.pageNumberTextActive as any),
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('churchesList')} />

        <View style={styles.headerRow}>
          <AddNewHeaderButton name="AddChurch" text={t('addNew')} />
        </View>

        <View style={listStyles.searchContainer as any}>
          <Text style={listStyles.searchIcon as any}>🔎</Text>
          <TextInput
            style={listStyles.searchInput as any}
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="always"
          contentContainerStyle={{paddingBottom: ms(24)}}
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
        <Text style={[styles.subTitle, {color: C.textSecondary}]}>
          {`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}
        </Text>
        <View style={styles.pagination}>{renderPagination()}</View>

        <ActionSheetModal
          visible={actionsVisible}
          title={selectedChurch?.name || t('churchDetail')}
          onRequestClose={() => { setActionsVisible(false); setSelectedChurch(null); }}
          actions={((): ActionItem[] => {
            const list: ActionItem[] = [];
            list.push({ label: t('churchDetail'), onPress: () => { if (selectedChurch) navigation.navigate('ChurchDetail', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            list.push({ label: t('editChurch'), onPress: () => { if (selectedChurch) navigation.navigate('EditChurch', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            if (isSuperAdmin(roleId)) {
              list.push({ label: t('disableChurch') || 'Disable Church', type: 'danger', onPress: () => { if (selectedChurch) navigation.navigate('DisableChurch', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            }
            return list;
          })()}
        />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  title: {fontSize: fs(16), fontWeight: '600'},
  subTitle: {
    marginTop: ms(6),
    marginBottom: ms(10),
    color: '#666',
    fontSize: fs(12),
  },
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: rs(6),
  },
  addButtonText: {color: '#fff', fontWeight: '600'},
  search: {
    height: hs(35),
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemCol: {flex: 1, paddingRight: 8},
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  name: {fontSize: fs(14), fontWeight: '600', marginBottom: ms(2)},
  meta: {fontSize: fs(12), color: '#666'},
  badge: {
    paddingVertical: ms(2),
    paddingHorizontal: ms(8),
    borderRadius: rs(999),
  },
  badgePrimary: {backgroundColor: COLORS.mainColor},
  badgeInfo: {backgroundColor: '#0ea5e9'},
  badgeTextPrimary: {
    color: '#fff',
    fontSize: fs(11),
    fontWeight: '700',
  },
  badgeTextInfo: {color: '#fff', fontSize: fs(11), fontWeight: '700'},
  actionRow: {flexDirection: 'row', gap: ms(6)},
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
  copyBtn: {
    backgroundColor: COLORS.mainColor,
  },
  empty: {textAlign: 'center', marginTop: ms(40), color: '#888'},
  pagination: {paddingVertical: ms(12), alignItems: 'flex-end'},
  pageNumbersContainer: {flexDirection: 'row', alignItems: 'center'},
  pageNumber: {
    borderRadius: rs(1),
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(10),
    marginLeft: ms(8),
    backgroundColor: '#fff',
  },
  pageNumberActive: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  pageNumberDisabled: {opacity: 0.5},
  pageNumberText: {color: '#333', fontWeight: '600', fontSize: fs(12)},
  pageNumberTextActive: {color: '#fff'},
});

export default ChurchesListScreen;
