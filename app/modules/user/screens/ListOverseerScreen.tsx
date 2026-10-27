import React, {useEffect, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {MoreIcon} from '../../../shared/components/icons/UiIcons';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import {usePagedList} from '../hooks/usePagedList';
import {
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
} from '../../../shared/components/crud';

type OverseerItem = {
  id: number;
  name: string;
  role_id?: number;
  role_name?: string | null;
  country_id?: number;
  country_name?: string | null;
  title?: string | null;
  geographical_regions?: string | null;
  language_regions?: string | null;
  church_regions?: string | null;
  church_networks?: string | null;
  assignment?: string | null;
  // Same optional fields as the Users list, shown when the API sends them.
  prefix?: string | null;
  photo_url?: string | null;
  city?: string | null;
  pastor_of?: string | null;
  mobile_phone?: string | null;
  email?: string | null;
};

const blankAvatar = require('../../../assets/icons/avatar_blank.png');

const formatPhoneDisplay = (value?: string | null) => {
  if (!value) {
    return '';
  }
  const hasPlus = /^\+/.test(String(value));
  const digits = String(value).replace(/\D/g, '');
  const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  return hasPlus ? `+${grouped}` : grouped;
};

export const ListOverseerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const {t} = useTranslation();
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OverseerItem | null>(null);
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get('users/me')
      .then(res => setRoleId(resolveRoleIdFromUser(res?.data?.data)))
      .catch(() => {});
  }, []);

  const {
    items,
    page,
    totalPages,
    total,
    loading,
    refreshing,
    loadError,
    reload,
    goToPage,
    retry,
    onRefresh,
  } = usePagedList<OverseerItem>(
    async (targetPage, search) =>
      (
        await api.get('users/overseers', {
          params: {
            page: targetPage,
            limit: DEFAULT_PAGE_LIMIT,
            ...(search ? {search} : {}),
          },
        })
      )?.data?.data,
    query,
  );

  // Reload after a user was edited / deleted / reassigned (a `reload` param or
  // markDataChanged('users')); a plain Back keeps the list.
  useReloadOnReturn(reload, {
    dataKey: 'users',
    reload: route?.params?.refresh || route?.params?.reload,
    clearReload: () => navigation.setParams({refresh: false, reload: undefined}),
  });

  const openActions = (item: OverseerItem) => {
    setSelectedUser(item);
    setActionsVisible(true);
  };

  // Same card as the Users list: photo, name, title [role], details, #id, "…".
  const renderItem = ({item}: {item: OverseerItem}) => {
    const displayName = [item.prefix, item.name].filter(Boolean).join(' ') || '—';
    const photoUri = String(item.photo_url ?? '').trim() || null;
    const locationParts = [item.city, item.country_name].filter(Boolean);

    return (
      <TouchableOpacity
        style={listStyles.itemCard as any}
        onPress={() => navigation.navigate('User', {userId: item.id})}
        onLongPress={() => openActions(item)}
        delayLongPress={300}>
        <View style={styles.itemRow}>
          <View style={styles.avatarWrap}>
            <Image
              source={photoUri ? {uri: photoUri} : blankAvatar}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          <View style={styles.itemCol}>
            {/* Right padding keeps the name clear of the floating "…" button. */}
            <Text style={[styles.name, styles.nameWithMore, {color: C.textPrimary}]} numberOfLines={1}>
              {displayName}
            </Text>
            {(!!item.role_name || !!item.title) && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {[item.title, item.role_name ? `[${item.role_name}]` : '']
                  .filter(Boolean)
                  .join('   ')}
              </Text>
            )}
            {!!item.pastor_of && (
              <Text style={[styles.meta, {color: C.textSecondary, fontWeight: '600'}]}>
                {item.pastor_of}
              </Text>
            )}
            {!!item.assignment && (
              <Text style={[styles.meta, {color: C.textSecondary, fontWeight: '600'}]}>
                {item.assignment}
              </Text>
            )}
            {locationParts.length > 0 && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {locationParts.join(', ')}
              </Text>
            )}
            {!!item.mobile_phone && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {`m: ${formatPhoneDisplay(item.mobile_phone)}`}
              </Text>
            )}
            {item.email ? (
              <View style={styles.emailRow}>
                <Text style={[styles.meta, {color: C.textSecondary, flex: 1}]} numberOfLines={1}>
                  {`e: ${item.email}`}
                </Text>
                <Text style={[styles.userId, {color: C.textSecondary}]}>{`#${item.id}`}</Text>
              </View>
            ) : (
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

  const keyExtractor = (item: OverseerItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      {/* The KAV already sits under the header and above the bottom safe area,
          so no extra offset (it left a gap above the keyboard). Android resizes
          the window itself (adjustResize). */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('overseers')} />

          <ListToolbar
            countText={
              loadError && !total ? undefined : `${total} ${t('overseers').toLowerCase()}`
            }
          />

          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search')}
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
                    onRetry={retry}>
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
            onRequestClose={() => {
              setActionsVisible(false);
              setSelectedUser(null);
            }}
            actions={[
              {
                label: t('userDetail'),
                icon: 'view',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('User', {userId: selectedUser.id});
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                label: t('assignOversight'),
                icon: 'assign',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('OverseerAssignments', {
                      userId: selectedUser.id,
                      name: selectedUser.name,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                label: t('editUser'),
                icon: 'edit',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('EditProfile', {id: selectedUser.id});
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                label: t('changePassword'),
                icon: 'password',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('ChangePasswordForOtherUser', {id: selectedUser.id});
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                label: t('changeEmail'),
                icon: 'email',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('ChangeEmail', {
                      id: selectedUser.id,
                      email: selectedUser.email || '',
                    });
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              // Same as the users list: only a Super Admin can delete users
              // (this list is also in the Pastor / Leader menu).
              ...(isSuperAdmin(roleId)
                ? ([
                    {
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
                        setActionsVisible(false);
                        setSelectedUser(null);
                      },
                    },
                  ] as ActionItem[])
                : []),
            ]}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  nameWithMore: {
    paddingRight: 32,
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
  // Record id after the title, like the shared list cards.
  listId: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  listContent: {flexGrow: 1, paddingBottom: ms(24)},
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fs(22),
    fontWeight: '600',
  },
  search: {
    height: hs(40),
    borderWidth: 1,
    borderRadius: rs(6),
    paddingHorizontal: ms(12),
    marginBottom: ms(10),
    marginTop: ms(6),
  },
  itemCol: {
    flex: 1,
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
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumber: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(3),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ms(8),
  },
  pageNumberActive: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  pageNumberDisabled: {
    opacity: 0.5,
  },
  pageNumberText: {
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
});

export default ListOverseerScreen;

