import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
} from '../../../shared/components/crud';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {InitialsAvatar} from '../../../shared/components/SelectionSheet';
import {EyeIcon} from '../../../shared/components/icons/UiIcons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listUsers, ListUsersItem} from '../services/user.service';
import {switchToUser} from '../../auth/services/auth.service';

// API values often carry stray spaces (" Bonyoko  Fred", "Pastor  ").
const tidy = (value?: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();
const joinTidy = (parts: Array<string | null | undefined>, sep: string) =>
  parts.map(tidy).filter(Boolean).join(sep);

const formatPhoneDisplay = (value?: string | null) => {
  if (!value) {
    return '';
  }
  const hasPlus = /^\+/.test(String(value));
  const digits = String(value).replace(/\D/g, '');
  const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  return hasPlus ? `+${grouped}` : grouped;
};

const BASE_URL = 'https://tintran.cloud-ip.cc/storage';

export const SwitchUserScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const C = useThemedColors();
  const T = useUiTokens();

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ListUsersItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const itemsCountRef = useRef(0);
  itemsCountRef.current = items.length;

  useEffect(() => {
    let mounted = true;
    api
      .get('users/me')
      .then(res => {
        const id = Number(res?.data?.data?.id);
        if (mounted && Number.isFinite(id)) {
          setCurrentUserId(id);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const fetchData = useCallback(async (targetPage: number, search: string) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: DEFAULT_PAGE_LIMIT,
        search,
        sort_by: 'name',
        sort_desc: false,
      };
      let res = await listUsers(params);
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
        res = await listUsers(params);
      }
      setItems(res?.data?.items ?? []);
      setTotalPages(res?.data?.total_pages ?? 1);
      setTotal(res?.data?.total ?? 0);
      setPage(res?.data?.page ?? targetPage);
      setLoadError(null);
    } catch (error: any) {
      if (itemsCountRef.current === 0) {
        // Nothing on screen: show a recoverable error instead of "no users".
        setLoadError(error);
      } else {
        // Keep the users already on screen (e.g. pull-to-refresh failed).
        const message =
          error?.response?.data?.message ||
          error?.message ||
          tRef.current('switchUserFailed');
        Alert.alert(tRef.current('switchUser'), String(message));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(1, query);
  }, [query, fetchData]);

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) {
      return;
    }
    void fetchData(targetPage, query);
  };

  const onRefresh = () => {
    setRefreshing(true);
    void fetchData(1, query);
  };

  const confirmSwitch = (user: ListUsersItem) => {
    if (switchingId != null || user.id === currentUserId) {
      return;
    }
    Alert.alert(t('switchUser'), t('switchUserConfirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('switchHere'),
        onPress: () => {
          void performSwitch(user);
        },
      },
    ]);
  };

  const performSwitch = async (user: ListUsersItem) => {
    setSwitchingId(user.id);
    try {
      await switchToUser(user.id, user.name || String(user.id));
      navigation.reset({
        index: 0,
        routes: [{name: 'Dashboard'}],
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || t('switchUserFailed');
      Alert.alert(t('switchUser'), String(message));
    } finally {
      setSwitchingId(null);
    }
  };

  const renderItem = ({item}: {item: ListUsersItem}) => {
    const displayName = joinTidy([item.prefix, item.name], ' ') || '—';
    const rawPhoto = item.photo_url || (item as {user_photo?: string}).user_photo || '';
    const photoUri = rawPhoto
      ? encodeURI(
          rawPhoto.startsWith('http') ? rawPhoto : `${BASE_URL}/${rawPhoto.replace(/^\//, '')}`,
        )
      : undefined;
    const roleLine = joinTidy([item.title, item.role_name], ' · ');
    const church = tidy(item.pastor_of);
    const location = joinTidy([item.city, item.country_name], ', ');
    const phone = formatPhoneDisplay(tidy(item.mobile_phone));
    const email = tidy(item.email);
    const isSelf = item.id === currentUserId;
    const busy = switchingId === item.id;

    return (
      <Pressable
        onPress={isSelf ? undefined : () => confirmSwitch(item)}
        disabled={isSelf || switchingId != null}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}${roleLine ? `, ${roleLine}` : ''}`}
        accessibilityHint={isSelf ? undefined : t('switchHere')}
        style={({pressed}) => [styles.row, pressed && {backgroundColor: T.pressedBg}]}>
        <InitialsAvatar name={displayName} uri={photoUri} size={ws(44)} />
        <View style={styles.rowText}>
          {/* Everything wraps: no field is cut off with an ellipsis. */}
          <Text style={[styles.name, {color: C.textPrimary}]}>
            {displayName}
            <Text style={[styles.userId, {color: C.textSecondary}]}>{`  #${item.id}`}</Text>
          </Text>
          {!!roleLine && (
            <Text style={[styles.meta, {color: C.textSecondary}]}>{roleLine}</Text>
          )}
          {!!church && (
            <Text style={[styles.meta, styles.church, {color: C.textPrimary}]}>{church}</Text>
          )}
          {!!location && (
            <Text style={[styles.meta, {color: C.textSecondary}]}>{location}</Text>
          )}
          {!!phone && <Text style={[styles.meta, {color: C.textSecondary}]}>{phone}</Text>}
          {!!email && <Text style={[styles.meta, {color: C.textSecondary}]}>{email}</Text>}
        </View>
        {isSelf ? (
          <View style={[styles.youBadge, {backgroundColor: T.neutralTint}]}>
            <Text style={[styles.youText, {color: T.neutralText}]}>{t('you')}</Text>
          </View>
        ) : (
          <View style={[styles.switchPill, {backgroundColor: T.brandTint}]}>
            {busy ? (
              <ActivityIndicator color={T.brandText} size="small" />
            ) : (
              <Text style={[styles.switchText, {color: T.brandText}]}>{t('switchHere')}</Text>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      {/* The KAV already sits under the header and above the bottom safe area,
          so no extra offset (it left a gap above the keyboard). Android resizes
          the window itself (adjustResize). */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('switchUser')} />
          <View
            style={[styles.notice, {backgroundColor: T.warningTint}]}
            accessible
            accessibilityRole="alert">
            <EyeIcon color={T.warningText} size={ws(18)} />
            <View style={styles.noticeTextWrap}>
              <Text style={[styles.noticeTitle, {color: T.warningText}]}>
                {t('switchUserViewOnlyTitle')}
              </Text>
              <Text style={[styles.noticeBody, {color: C.textSecondary}]}>
                {t('switchUserViewOnlyBody')}
              </Text>
            </View>
          </View>
          <ListToolbar
            countText={
              loadError && !total ? undefined : `${total} ${t('users').toLowerCase()}`
            }
          />
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search')}
            onSubmitEditing={() => goToPage(1)}
          />
          <View style={{flex: 1, minHeight: 0}}>
            {loading && items.length === 0 ? (
              <ActivityIndicator style={styles.loader} color={COLORS.mainColor} />
            ) : (
              <PaginatedListPager page={page} totalPages={totalPages} onPageChange={goToPage}>
                <FlatList
                  data={items}
                  keyExtractor={item => String(item.id)}
                  renderItem={renderItem}
                  ItemSeparatorComponent={() => (
                    <View style={[styles.separator, {backgroundColor: C.border}]} />
                  )}
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
                    loading ? null : (
                      <ListLoadState
                        error={loadError}
                        onRetry={() => fetchData(page, query)}>
                        <ListEmptyState title={t('noUsersFound')} />
                      </ListLoadState>
                    )
                  }
                />
              </PaginatedListPager>
            )}
          </View>
          <ListPageBar
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPageChange={goToPage}
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(10),
    borderRadius: rs(10),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    marginBottom: ms(8),
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    lineHeight: fs(18),
  },
  noticeBody: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(12),
    minHeight: 64,
    paddingVertical: ms(10),
    paddingHorizontal: ms(4),
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  userId: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  church: {
    fontWeight: '500',
  },
  meta: {
    marginTop: ms(2),
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  // Visual pill only: the whole row is the tap target.
  switchPill: {
    alignSelf: 'center',
    minWidth: ws(64),
    height: 32,
    paddingHorizontal: ms(12),
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  youBadge: {
    alignSelf: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: 12,
  },
  youText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ws(44) + ms(16),
  },
  loader: {
    marginTop: ms(24),
  },
});
