import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {BackButton} from '../../../shared/components/BackButton';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {EditSvgIcon, DeleteSvgIcon} from '../../../shared/components/icons';
import ActionSheetModal from '../../../shared/components/ActionSheetModal';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';

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
};

export const ListOverseerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const {t} = useTranslation();
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OverseerItem | null>(null);
  const [items, setItems] = useState<OverseerItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await api.get('users/overseers', {
          params: {
            page: targetPage,
            limit: DEFAULT_PAGE_LIMIT,
            ...(query?.trim() ? {search: query.trim()} : {}),
          },
        });
        const data = res?.data?.data;
        const nextItems = (data?.items ?? []) as OverseerItem[];
        setTotalPages(data?.total_pages ?? 1);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
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

  const handleEdit = (user: OverseerItem) => {
    navigation.navigate('EditProfile', {id: user.id});
  };

  const renderItem = ({item}: {item: OverseerItem}) => {
    const name = item.name || '';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase())
      .join('') || 'U';
    return (
      <TouchableOpacity
        style={listStyles.itemCard as any}
        onPress={() => navigation.navigate('User', {userId: item.id})}
        onLongPress={() => {
          setSelectedUser(item);
          setActionsVisible(true);
        }}
        delayLongPress={300}>
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
            <Text
              style={[styles.meta, {color: C.textSecondary}]}
              numberOfLines={1}>
              {(item.role_name || '') + (item.country_name ? ` · ${item.country_name}` : '')}
            </Text>
            {item.assignment ? (
              <Text
                style={[styles.meta, {color: C.textSecondary}]}
                numberOfLines={1}>
                {item.assignment}
              </Text>
            ) : null}
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => handleEdit(item)}>
                <EditSvgIcon width={ws(15)} height={ws(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: OverseerItem) => String(item.id);

  const renderPagination = () => {
    const itemsToRender: Array<{
      label: string;
      page: number;
      active?: boolean;
      disabled?: boolean;
    }> = [];
    itemsToRender.push({label: '<<', page: 1, disabled: page === 1});
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) {
        itemsToRender.push({label: String(p), page: p});
      }
    }
    itemsToRender.push({label: String(page), page, active: true});
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) {
        itemsToRender.push({label: String(p), page: p});
      }
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
        style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('overseers')} />

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
                contentContainerStyle={{paddingBottom: ms(24)}}
                nestedScrollEnabled={Platform.OS === 'android'}
                style={{flex: 1}}
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
            </PaginatedListPager>
          </View>
          <Text
            style={[styles.subTitle, {color: C.textSecondary}]}
          >{`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}</Text>

          <View style={styles.pagination}>{renderPagination()}</View>

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
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('User', {userId: selectedUser.id});
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                label: t('editUser'),
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('EditProfile', {id: selectedUser.id});
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
              {
                label: t('deleteUser'),
                type: 'danger',
                onPress: () => {
                  if (selectedUser) {
                    navigation.navigate('DeleteUser', {
                      userId: selectedUser.id,
                    });
                  }
                  setActionsVisible(false);
                  setSelectedUser(null);
                },
              },
            ]}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  subTitle: {
    marginTop: ms(6),
    marginBottom: ms(10),
    fontSize: fs(12),
  },
  search: {
    height: hs(40),
    borderWidth: 1,
    borderRadius: rs(6),
    paddingHorizontal: ms(12),
    marginBottom: ms(10),
    marginTop: ms(6),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontSize: fs(16),
    fontWeight: '600',
    marginBottom: ms(2),
  },
  meta: {
    fontSize: fs(12),
  },
  actionRow: {
    flexDirection: 'row',
    gap: ms(6),
  },
  actionBtn: {
    width: ws(25),
    height: ws(25),
    borderRadius: rs(3),
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
    marginTop: ms(40),
  },
  pagination: {
    paddingVertical: ms(12),
    alignItems: 'flex-end',
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

