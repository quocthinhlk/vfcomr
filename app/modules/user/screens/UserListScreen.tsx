import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, RefreshControl, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { listUsers, ListUsersItem } from '../services/user.service';
import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { COLORS } from '../../../shared/constants/colors';
import { globalStyles } from '../../../shared/styles/global';
import { EditSvgIcon } from '../../../shared/components/icons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import { getListStyles } from '../../../shared/styles/list';
import { isSuperAdmin } from '../../../shared/utils/permissions';
import ActionSheetModal, { ActionItem } from '../../../shared/components/ActionSheetModal';

export const UserListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();
  const [items, setItems] = useState<ListUsersItem[]>([]);
  const listStyles = getListStyles(C, theme);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ListUsersItem | null>(null);
  // action sheet state handled by ActionSheetModal

  const formatPhoneDisplay = (value?: string | null) => {
    if (!value) return '';
    const hasPlus = /^\+/.test(String(value));
    const digits = String(value).replace(/\D/g, '');
    const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
    return hasPlus ? `+${grouped}` : grouped;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const r = res?.data?.data?.role?.id;
        if (typeof r === 'number') setRoleId(r);
      } catch {}
    })();
  }, []);

  const fetchData = useCallback(async (targetPage: number, reset = false) => {
    try {
      if (loading) return;
      setLoading(true);
      const res = await listUsers({ page: targetPage, limit: DEFAULT_PAGE_LIMIT, name: query });
      const nextItems = res?.data?.items ?? [];
      setTotalPages(res?.data?.total_pages ?? 1);
      setTotal(res?.data?.total ?? 0);
      setPage(res?.data?.page ?? targetPage);
      setItems(reset ? nextItems : [...items, ...nextItems]);
    } catch (e) {
      // You can add error handling UI here
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [loading, query, items]);

  useEffect(() => {
    // On query change, reset to page 1
    setItems([]);
    fetchData(1, true);
  }, [query]);

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
    if (targetPage < 1 || targetPage > totalPages || loading) return;
    setItems([]);
    fetchData(targetPage, true);
  };

  const handleEdit = (user: ListUsersItem) => {
    navigation.navigate('EditProfile', { id: user.id });
  };

  const openActions = (user: ListUsersItem) => { setSelectedUser(user); setActionsVisible(true); };
  const closeActions = () => { setActionsVisible(false); setSelectedUser(null); };

  // open animation is inside ActionSheetModal; close is instant

  const renderItem = ({ item }: { item: ListUsersItem }) => {
    const name = item.name || '';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase())
      .join('') || 'U';
    return (
      <TouchableOpacity style={listStyles.itemCard as any} onPress={() => navigation.navigate('User', { userId: item.id })} onLongPress={() => openActions(item)} delayLongPress={300}>
        <View style={listStyles.itemRow as any}> 
          <View style={listStyles.avatarWrap as any}>
            <View style={listStyles.avatar as any}>
              <Text style={listStyles.avatarText as any}>{initials}</Text>
            </View>
          </View>
          <View style={styles.itemCol}>
            <Text style={[styles.name, { color: C.textPrimary }]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>{item.role_name} · {item.country_name}</Text>
            {!!item.mobile_phone && (<Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>{formatPhoneDisplay(item.mobile_phone)}</Text>)}
            {!!item.email && (<Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>{item.email}</Text>)}
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEdit(item)}>
                <EditSvgIcon width={18} height={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: ListUsersItem) => String(item.id);

  const renderPagination = () => {
    const itemsToRender: Array<{ label: string; page: number; active?: boolean; disabled?: boolean }> = [];

    // << (first page)
    itemsToRender.push({ label: '<<', page: 1, disabled: page === 1 });

    // two previous pages (if exist)
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) {
        itemsToRender.push({ label: String(p), page: p });
      }
    }

    // current page
    itemsToRender.push({ label: String(page), page, active: true });

    // two next pages (if exist)
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) {
        itemsToRender.push({ label: String(p), page: p });
      }
    }

    // >> (last page)
    itemsToRender.push({ label: '>>', page: totalPages, disabled: page === totalPages });

    return (
      <View style={listStyles.pageNumbersContainer as any}>
        {itemsToRender.map((p) => (
          <TouchableOpacity
            key={`${p.label}-${p.page}`}
            style={[
              listStyles.pageNumber as any,
              p.active && (listStyles.pageNumberActive as any),
              (p.disabled || loading) && (listStyles.pageNumberDisabled as any),
            ]}
            onPress={() => goToPage(p.page)}
            disabled={!!p.disabled || loading}
          >
            <Text style={[
              listStyles.pageNumberText as any,
              p.active && (listStyles.pageNumberTextActive as any),
            ]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <Header title={t('usersList')} />

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddUser')}>
          <Text style={styles.addButtonText}>+ {t('addNew')}</Text>
        </TouchableOpacity>
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
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: C.textSecondary }]}>{t('noUsersFound')} 😕</Text> : null}
      />
      <Text style={[styles.subTitle, { color: C.textSecondary }]}>{`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}</Text>

      <View style={styles.pagination}>{renderPagination()}</View>

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedUser?.name || t('userDetail')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const list: ActionItem[] = [];
          list.push({ label: t('userDetail'), onPress: () => { if (selectedUser) navigation.navigate('User', { userId: selectedUser.id }); closeActions(); } });
          list.push({ label: t('editUser'), onPress: () => { if (selectedUser) navigation.navigate('EditProfile', { id: selectedUser.id }); closeActions(); } });
          list.push({ label: t('changePassword'), onPress: () => { if (selectedUser) navigation.navigate('ChangePasswordForOtherUser', { id: selectedUser.id }); closeActions(); } });
          if (isSuperAdmin(roleId)) {
            list.push({ label: t('deleteUser'), type: 'danger', onPress: () => { if (selectedUser) navigation.navigate('DeleteUser', { userId: selectedUser.id }); closeActions(); } });
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
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    paddingVertical: 2,
    alignItems: 'center',
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
  meta: {
    fontSize: 12,
    color: '#666',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: COLORS.successColor,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerColor,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 14,
  },
  pagination: {
    paddingVertical: 12,
    alignItems: 'flex-end',
    // backgroundColor: 'red'
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumber: {
    // minWidth: 36,
    // height: 36,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginLeft: 8,
    backgroundColor: '#fff',
  },
  pageNumberActive: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  pageNumberDisabled: {
    opacity: 0.5,
  },
  pageNumberText: {
    color: '#333',
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
  itemCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
    marginTop: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    height: 40,
    marginTop: 6,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  actionSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 10,
    paddingTop: 6,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    opacity: 0.5,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  sheetItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  sheetItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 