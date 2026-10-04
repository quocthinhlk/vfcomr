import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, hs, ms, ws} from '../../../shared/utils/scale';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {
  listRoleChangeRequests,
  RoleChangeRequestItem,
} from '../services/roleChangeRequest.service';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {ListPageBar, ListToolbar} from '../../../shared/components/crud';
import {resolveRoleIdFromUser, isSuperAdmin} from '../../../shared/utils/permissions';
import api from '../../../config/api';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {COLORS} from '../../../shared/constants/colors';

const PENDING_COLOR = '#d99400';

export const RoleChangeRequestsScreen: React.FC = () => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<RoleChangeRequestItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('users/me');
        if (!mounted) {
          return;
        }
        const roleId = resolveRoleIdFromUser(res?.data?.data);
        setCurrentUserRoleId(roleId);
      } catch {
        setCurrentUserRoleId(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        setLoading(true);
        const params = {
          status: 'pending',
          page: targetPage,
          sort_desc: true,
        } as const;
        let res = await listRoleChangeRequests(params);
        // On first open the API sometimes returns pagination totals that
        // contradict the page itself (e.g. total: 1 with 10 items) while other
        // requests (users/me) run concurrently. Retry once when that happens.
        const looksInconsistent = (d: any) => {
          if (!d) {
            return false;
          }
          const count = d.items?.length ?? 0;
          return (
            (d.total ?? 0) < count ||
            (!!d.has_next && (d.total_pages ?? 1) <= (d.page ?? targetPage))
          );
        };
        if (looksInconsistent(res?.data)) {
          res = await listRoleChangeRequests(params);
        }
        const data = res?.data;
        const nextItems = (data?.items ?? []) as RoleChangeRequestItem[];
        setTotalPages(data?.total_pages ?? 1);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        setItems(prev => (reset ? nextItems : [...prev, ...nextItems]));
      } catch (error: any) {
        console.error('Failed to load role change requests:', error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          // use English fallback if translation hook changes between renders
          'Failed to load role change requests.';
        Alert.alert('Error', message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  useFocusEffect(
    useCallback(() => {
      setItems([]);
      fetchData(1, true);
    }, [fetchData]),
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

  const renderItem = ({item}: {item: RoleChangeRequestItem}) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('RoleChangeRequestDetail', {id: item.id})}
        style={listStyles.itemCard as any}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(item.user_name)}</Text>
          </View>
          <View style={{flex: 1}}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, {color: C.textPrimary}]} numberOfLines={1}>
                {item.user_name}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('statusPending')}</Text>
              </View>
            </View>
            <Text style={styles.roleLine} numberOfLines={2}>
              <Text style={[styles.roleFrom, {color: C.textSecondary}]}>
                {item.old_role_name}
              </Text>
              <Text style={styles.roleArrow}> → </Text>
              <Text style={styles.roleTo}>{item.new_role_name}</Text>
            </Text>
            <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
              {t('requestedBy')}: {item.requested_by_name}
            </Text>
          </View>
          <Text style={[styles.chevron, {color: C.textSecondary}]}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: RoleChangeRequestItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('roleChangeRequests')} />
        {!isSuperAdmin(currentUserRoleId) ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{color: C.textPrimary, textAlign: 'center', paddingHorizontal: 24}}>
              {t('accessDenied') ||
                'Access denied. Only Super Admin users can manage role change requests.'}
            </Text>
          </View>
        ) : (
          <View style={{flex: 1}}>
            <ListToolbar
              countText={`${total} ${t('roleChangeRequests').toLowerCase()}`}
            />
            <PaginatedListPager page={page} totalPages={totalPages} onPageChange={goToPage}>
              <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={{paddingBottom: ms(24)}}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  !loading ? (
                    <Text style={[styles.empty, {color: C.textSecondary}]}>
                      {t('noPendingRoleChangeRequests')}
                    </Text>
                  ) : null
                }
              />
            </PaginatedListPager>
            <ListPageBar
              page={page}
              totalPages={totalPages}
              loading={loading}
              onPageChange={goToPage}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

function initialsOf(name?: string): string {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ws(12),
  },
  avatar: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: COLORS.mainColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: fs(14),
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ws(8),
    marginBottom: ms(4),
  },
  title: {
    fontSize: fs(15),
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: PENDING_COLOR,
  },
  badgeText: {
    fontSize: fs(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    color: PENDING_COLOR,
  },
  roleLine: {
    fontSize: fs(13),
    marginBottom: ms(2),
  },
  roleFrom: {
    fontSize: fs(13),
  },
  roleArrow: {
    fontSize: fs(13),
    color: COLORS.mainColor,
  },
  roleTo: {
    fontSize: fs(13),
    fontWeight: '600',
    color: COLORS.mainColor,
  },
  meta: {
    fontSize: fs(12),
  },
  chevron: {
    fontSize: fs(24),
    marginLeft: ws(4),
  },
  empty: {
    textAlign: 'center',
    marginTop: hs(40),
    fontSize: fs(14),
  },
});


