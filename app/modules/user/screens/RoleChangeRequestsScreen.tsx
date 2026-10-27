import React, {useCallback, useEffect, useRef, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, ws} from '../../../shared/utils/scale';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {
  listRoleChangeRequests,
  RoleChangeRequestItem,
} from '../services/roleChangeRequest.service';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {usePagedList, type PagedListPage} from '../hooks/usePagedList';
import {
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
} from '../../../shared/components/crud';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {resolveRoleIdFromUser, isSuperAdmin} from '../../../shared/utils/permissions';
import api from '../../../config/api';
import {useNavigation} from '@react-navigation/native';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {COLORS} from '../../../shared/constants/colors';

const PENDING_COLOR = '#d99400';

export const RoleChangeRequestsScreen: React.FC = () => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const navigation = useNavigation<any>();

  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  // Until users/me answers the role is unknown: show a spinner, not "Access denied".
  const [roleLoaded, setRoleLoaded] = useState(false);
  // users/me failing must not read as "Access denied".
  const [roleError, setRoleError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('users/me');
      if (!mountedRef.current) {
        return;
      }
      const roleId = resolveRoleIdFromUser(res?.data?.data);
      setCurrentUserRoleId(roleId);
      setRoleError(null);
      setRoleLoaded(true);
    } catch (e) {
      if (!mountedRef.current) {
        return;
      }
      setCurrentUserRoleId(null);
      setRoleError(e);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadCurrentUser();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCurrentUser]);

  const {items, page, totalPages, total, loading, refreshing, loadError, reload, goToPage, retry, onRefresh} =
    usePagedList<RoleChangeRequestItem>(
      async targetPage =>
        (await listRoleChangeRequests({status: 'pending', page: targetPage, sort_desc: true}))
          ?.data as PagedListPage<RoleChangeRequestItem> | undefined,
      '',
      isSuperAdmin(currentUserRoleId),
    );

  // Reload only after a request was approved / rejected.
  useReloadOnReturn(reload, {dataKey: 'roleChangeRequests'});

  const renderItem = ({item}: {item: RoleChangeRequestItem}) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('RoleChangeRequestDetail', {id: item.id})}
        style={listStyles.itemCard as any}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, {color: C.textPrimary}]} numberOfLines={2}>
            {item.user_name}
            <Text style={[styles.listId, {color: C.textSecondary}]}>{`  #${item.id}`}</Text>
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('statusPending')}</Text>
          </View>
          <Text style={[styles.chevron, {color: C.textSecondary}]}>›</Text>
        </View>
        <Text style={styles.roleLine} numberOfLines={1}>
          <Text style={[styles.roleFrom, {color: C.textSecondary}]}>
            {item.old_role_name}
          </Text>
          <Text style={styles.roleArrow}> → </Text>
          <Text style={styles.roleTo}>{item.new_role_name}</Text>
        </Text>
        <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
          {t('requestedBy')}: {item.requested_by_name}
        </Text>
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
        {roleError && currentUserRoleId == null ? (
          <ApiErrorState error={roleError} onRetry={loadCurrentUser} />
        ) : !roleLoaded ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        ) : !isSuperAdmin(currentUserRoleId) ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{color: C.textPrimary, textAlign: 'center', paddingHorizontal: 24}}>
              {t('accessDenied')}
            </Text>
          </View>
        ) : (
          <View style={{flex: 1}}>
            <View style={styles.toolbarWrap}>
              <ListToolbar
                countText={
                  loadError && !total
                    ? undefined
                    : `${total} ${t('roleChangeRequests').toLowerCase()}`
                }
              />
            </View>
            <PaginatedListPager page={page} totalPages={totalPages} onPageChange={goToPage}>
              <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  <ListLoadState
                    loading={loading}
                    error={loadError}
                    onRetry={retry}>
                    <ListEmptyState title={t('noPendingRoleChangeRequests')} />
                  </ListLoadState>
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

const styles = StyleSheet.create({
  // Record id after the title, like the shared list cards.
  listId: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  listContent: {flexGrow: 1, paddingBottom: ms(24)},
  toolbarWrap: {
    marginBottom: ms(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ws(8),
    marginBottom: ms(6),
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '700',
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
    marginBottom: ms(4),
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
    fontSize: fs(22),
    lineHeight: fs(22),
    marginLeft: ws(2),
  },
});


