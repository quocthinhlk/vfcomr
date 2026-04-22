import React, {useEffect, useState, useCallback, useRef} from 'react';
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
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import SearchInput from '../../../shared/components/SearchInput';

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
        const res = await listUsers({
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
        // You can add error handling UI here
        console.error(e);
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
            <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={1}>
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

            {/* Church name */}
            {!!item.church_name && (
              <Text style={[styles.churchName, {color: C.textPrimary}]} numberOfLines={1}>
                {item.church_name}
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
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: ListUsersItem) => String(item.id);

  const renderPagination = () => {
    const itemsToRender: Array<{
      label: string;
      page: number;
      active?: boolean;
      disabled?: boolean;
    }> = [];

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
          <Header title={t('usersList')} />

          <View style={styles.headerRow}>
            <AddNewHeaderButton name="AddUser" text={t('addNew')} />
          </View>

          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search')}
            onSubmitEditing={() => goToPage(1)}
          />

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
                  {t('noUsersFound')}
                </Text>
              ) : null
            }
          />
          <Text
            style={[styles.subTitle, {color: C.textSecondary}]}
          >{`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}</Text>

          <View style={styles.pagination}>{renderPagination()}</View>

          <ActionSheetModal
            visible={actionsVisible}
            title={selectedUser?.name || t('userDetail')}
            onRequestClose={closeActions}
            actions={((): ActionItem[] => {
              const list: ActionItem[] = [];
              list.push({
                label: t('userDetail'),
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('User', {userId: selectedUser.id});
                  }
                  closeActions();
                },
              });
              list.push({
                label: t('editUser'),
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('EditProfile', {id: selectedUser.id});
                  }
                  closeActions();
                },
              });
              list.push({
                label: t('changePassword'),
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('ChangePasswordForOtherUser', {
                      id: selectedUser.id,
                    });
                  }
                  closeActions();
                },
              });
              if (isSuperAdmin(roleId)) {
                list.push({
                  label: t('deleteUser'),
                  type: 'danger',
                  onPress: () => {
                    if (selectedUser) {
                      navigation.navigate('DeleteUser', {
                        userId: selectedUser.id,
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
  title: {
    fontSize: fs(22),
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
  name: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(2),
  },
  churchName: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(1),
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
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
    color: '#888',
    fontSize: fs(14),
  },
  pagination: {
    // paddingVertical: ms(8),
    alignItems: 'flex-end',
    // backgroundColor: 'red'
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