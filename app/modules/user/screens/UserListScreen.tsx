import React, {useEffect, useState, useCallback, useRef} from 'react';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {listUsers, ListUsersItem} from '../services/user.service';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {MoreIcon} from '../../../shared/components/icons/UiIcons';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
} from '../../../shared/components/crud';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';

export const UserListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const [items, setItems] = useState<ListUsersItem[]>([]);
  const listStyles = getListStyles(C, theme);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
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
        if (typeof r === 'number') {
          setRoleId(r);
        }
      } catch {}
    })();
  }, []);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const params = {
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          search: query,
          sort_by: 'name',
          sort_desc: false,
        };
        let res = await listUsers(params);
        // On first open the API sometimes returns pagination totals that
        // contradict the page itself (e.g. total: 1 with 10 items) while other
        // requests (users/me) run concurrently. Retry once when that happens.
        const looksInconsistent = (r: typeof res) => {
          const d = r?.data;
          if (!d) {
            return false;
          }
          const count = d.items?.length ?? 0;
          return (
            (d.total ?? 0) < count ||
            (!!d.has_next && (d.total_pages ?? 1) <= (d.page ?? targetPage))
          );
        };
        if (looksInconsistent(res)) {
          res = await listUsers(params);
        }
        const nextItems = res?.data?.items ?? [];
        setTotalPages(res?.data?.total_pages ?? 1);
        setTotal(res?.data?.total ?? 0);
        setPage(res?.data?.page ?? targetPage);
        setItems(reset ? nextItems : [...items, ...nextItems]);
        setLoadError(null);
      } catch (e) {
        console.error(e);
        // Surface the failure as a recoverable error, never as "no users".
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, query, items],
  );

  useEffect(() => {
    // On query change, reset to page 1
    setItems([]);
    fetchData(1, true);
  }, [query]);

  // Reload when coming back after a user was added / edited / deleted (a
  // `reload` param or markDataChanged('users')); a plain Back keeps the list.
  useReloadOnReturn(
    () => {
      setItems([]);
      fetchData(1, true);
    },
    {
      dataKey: 'users',
      reload: route?.params?.refresh || route?.params?.reload,
      clearReload: () => navigation.setParams({refresh: false, reload: undefined}),
    },
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

  const openActions = (user: ListUsersItem) => {
    setSelectedUser(user);
    setActionsVisible(true);
  };
  const closeActions = () => {
    setActionsVisible(false);
    setSelectedUser(null);
  };

  // open animation is inside ActionSheetModal; close is instant

  const blankAvatar = require('../../../assets/icons/avatar_blank.png');
  const BASE_URL = 'http://34.126.158.119/storage';

  const renderItem = ({item}: {item: ListUsersItem}) => {
    const displayName = [item.prefix, item.name].filter(Boolean).join(' ');
    const photoUri = item.photo_url
      ? item.photo_url
      : item.photo_url === undefined && (item as any).user_photo
      ? `${BASE_URL}${(item as any).user_photo}`
      : null;
    const locationParts = [item.city, item.country_name].filter(Boolean);

    return (
      <TouchableOpacity
        style={listStyles.itemCard as any}
        onPress={() => navigation.navigate('User', {userId: item.id})}
        onLongPress={() => openActions(item)}
        delayLongPress={300}>
        <View style={styles.itemRow}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Image
              source={photoUri ? {uri: photoUri} : blankAvatar}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          {/* Content */}
          <View style={styles.itemCol}>
            {/* Name */}
            {/* Right padding keeps the name clear of the floating "…" button. */}
            <Text style={[styles.name, styles.nameWithMore, {color: C.textPrimary}]} numberOfLines={1}>
              {displayName}
            </Text>

            {/* Title + [Role] */}
            {(!!item.role_name || !!item.title) && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {[item.title, item.role_name ? `[${item.role_name}]` : '']
                  .filter(Boolean)
                  .join('   ')}
              </Text>
            )}

            {/* Pastor of */}
            {!!item.pastor_of && (
              <Text style={[styles.meta, {color: C.textSecondary, fontWeight: '600'}]}>
                {item.pastor_of}
              </Text>
            )}

            {/* Location */}
            {locationParts.length > 0 && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {locationParts.join(', ')}
              </Text>
            )}

            {/* Phone */}
            {!!item.mobile_phone && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {`m: ${formatPhoneDisplay(item.mobile_phone)}`}
              </Text>
            )}

            {/* Email + ID */}
            {!!item.email && (
              <View style={styles.emailRow}>
                <Text style={[styles.meta, {color: C.textSecondary, flex: 1}]} numberOfLines={1}>
                  {`e: ${item.email}`}
                </Text>
                <Text style={[styles.userId, {color: C.textSecondary}]}>
                  {`#${item.id}`}
                </Text>
              </View>
            )}
            {!item.email && (
              <Text style={[styles.userId, {color: C.textSecondary, textAlign: 'right'}]}>
                {`#${item.id}`}
              </Text>
            )}
          </View>

          {/* "…" shows the row has actions (same as the other lists); long-press still works. */}
          <TouchableOpacity
            onPress={() => openActions(item)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.moreButton}
            accessibilityRole="button"
            accessibilityLabel={`${displayName}: ${t('editUser')}, ${t('changePassword')}`}>
            <MoreIcon color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: ListUsersItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('usersList')} />

          <ListToolbar
            countText={
              loadError && !total ? undefined : `${total} ${t('users').toLowerCase()}`
            }
            addRoute="AddUser"
          />

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
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                contentInsetAdjustmentBehavior="always"
                contentContainerStyle={styles.listContent}
                nestedScrollEnabled={Platform.OS === 'android'}
                style={{flex: 1}}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  <ListLoadState
                    loading={loading}
                    error={loadError}
                    onRetry={() => fetchData(page, true)}>
                    <ListEmptyState title={t('noUsersFound')} />
                  </ListLoadState>
                }
              />
            </PaginatedListPager>
          </View>
          <ListPageBar
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPageChange={goToPage}
          />

          <ActionSheetModal
            visible={actionsVisible}
            title={selectedUser?.name || t('userDetail')}
            onRequestClose={closeActions}
            actions={((): ActionItem[] => {
              const list: ActionItem[] = [];
              list.push({
                label: t('userDetail'),
                icon: 'view',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('User', {userId: selectedUser.id});
                  }
                  closeActions();
                },
              });
              list.push({
                label: t('editUser'),
                icon: 'edit',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('EditProfile', {id: selectedUser.id});
                  }
                  closeActions();
                },
              });
              list.push({
                label: t('changePassword'),
                icon: 'password',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('ChangePasswordForOtherUser', {
                      id: selectedUser.id,
                    });
                  }
                  closeActions();
                },
              });
              list.push({
                label: t('changeEmail'),
                icon: 'email',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('ChangeEmail', {
                      id: selectedUser.id,
                      email: selectedUser.email || '',
                    });
                  }
                  closeActions();
                },
              });
              if (isSuperAdmin(roleId)) {
                list.push({
                  label: t('deleteUser'),
                  icon: 'delete',
                  type: 'danger',
                  onPress: () => {
                    if (selectedUser) {
                      navigation.navigate('DeleteUser', {
                        userId: selectedUser.id,
                        userName: selectedUser.name || undefined,
                      });
                    }
                    closeActions();
                  },
                });
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
  listContent: {flexGrow: 1, paddingBottom: ms(24)},
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  title: {
    fontSize: fs(22),
    fontWeight: '600',
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
    fontSize: fs(14),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    marginRight: ms(12),
  },
  avatar: {
    width: ws(52),
    height: ws(52),
    borderRadius: rs(26),
  },
  itemCol: {
    flex: 1,
  },
  // Floats over the top-right corner so the content (and #id) spans the full width.
  moreButton: {
    position: 'absolute',
    top: -ms(8),
    right: -ms(8),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameWithMore: {
    paddingRight: 32,
  },
  name: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(2),
  },
  meta: {
    fontSize: fs(12),
    marginBottom: ms(1),
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userId: {
    fontSize: fs(11),
    fontWeight: '500',
    marginLeft: ms(4),
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerColor,
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumber: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(3),
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ms(8),
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
    borderRadius: rs(12),
    padding: ms(12),
    marginBottom: ms(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
  },
  avatarText: {
    fontWeight: '700',
  },
  chevron: {
    fontSize: fs(22),
    lineHeight: fs(22),
    marginTop: ms(6),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rs(8),
    paddingHorizontal: ms(10),
    marginBottom: ms(10),
    height: hs(35),
    marginTop: ms(6),
  },
  searchIcon: {
    fontSize: fs(14),
    height: hs(35),
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
    width: ws(40),
    height: hs(4),
    borderRadius: rs(2),
    backgroundColor: '#999',
    opacity: 0.5,
    marginBottom: ms(8),
  },
  sheetTitle: {
    fontSize: fs(17),
    fontWeight: '700',
    paddingHorizontal: ms(16),
    paddingTop: ms(6),
    paddingBottom: ms(10),
  },
  sheetItem: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(14),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  sheetItemText: {
    fontSize: fs(16),
    fontWeight: '600',
  },
}); 