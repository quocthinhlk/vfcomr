import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {ListPageBar, ListToolbar} from '../../../shared/components/crud';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listUsers, ListUsersItem} from '../services/user.service';
import {switchToUser} from '../../auth/services/auth.service';

const blankAvatar = require('../../../assets/icons/avatar_blank.png');
const BASE_URL = 'https://tintran.cloud-ip.cc/storage';

const UserAvatar = ({uri}: {uri: string | null}) => {
  const [failed, setFailed] = useState(false);
  const remote = uri?.trim() ? encodeURI(uri.trim()) : '';

  useEffect(() => {
    setFailed(false);
  }, [remote]);

  return (
    <View style={styles.avatarWrap}>
      <Image
        source={!failed && remote ? {uri: remote} : blankAvatar}
        defaultSource={blankAvatar}
        style={styles.avatar}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
};

const formatPhoneDisplay = (value?: string | null) => {
  if (!value) {
    return '';
  }
  const hasPlus = /^\+/.test(String(value));
  const digits = String(value).replace(/\D/g, '');
  const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  return hasPlus ? `+${grouped}` : grouped;
};

export const SwitchUserScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ListUsersItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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
    } catch (error: any) {
      setItems([]);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        tRef.current('switchUserFailed');
      Alert.alert(tRef.current('switchUser'), String(message));
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
    const displayName = [item.prefix, item.name].filter(Boolean).join(' ');
    const rawPhoto = item.photo_url || (item as {user_photo?: string}).user_photo || '';
    const photoUri = rawPhoto
      ? rawPhoto.startsWith('http')
        ? rawPhoto
        : `${BASE_URL}/${rawPhoto.replace(/^\//, '')}`
      : null;
    const locationParts = [item.city, item.country_name].filter(Boolean);
    const isSelf = item.id === currentUserId;
    const busy = switchingId === item.id;

    return (
      <View style={listStyles.itemCard as any}>
        <View style={styles.itemRow}>
          <UserAvatar uri={photoUri} />
          <View style={styles.itemCol}>
            <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={1}>
              {displayName || '—'}
            </Text>
            {(!!item.role_name || !!item.title) && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {[item.title, item.role_name ? `[${item.role_name}]` : '']
                  .filter(Boolean)
                  .join('   ')}
              </Text>
            )}
            {!!item.pastor_of && (
              <Text
                style={[styles.meta, {color: C.textSecondary, fontWeight: '600'}]}
                numberOfLines={1}>
                {item.pastor_of}
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
            {!!item.email ? (
              <View style={styles.emailRow}>
                <Text
                  style={[styles.meta, {color: C.textSecondary, flex: 1}]}
                  numberOfLines={1}>
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
          {isSelf ? null : (
            <TouchableOpacity
              style={styles.switchBtn}
              disabled={switchingId != null}
              onPress={() => confirmSwitch(item)}
              accessibilityRole="button"
              accessibilityLabel={t('switchHere')}>
              {busy ? (
                <ActivityIndicator color={COLORS.mainColor} size="small" />
              ) : (
                <Text style={styles.switchText}>{t('switchHere')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
          <Header title={t('switchUser')} />
          <Text style={[styles.notice, {color: C.textSecondary}]}>
            {t('switchUserViewOnly')}
          </Text>
          <ListToolbar countText={`${total} ${t('users').toLowerCase()}`} />
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
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets
                  contentInsetAdjustmentBehavior="always"
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  notice: {
    fontSize: fs(12),
    lineHeight: fs(16),
    marginBottom: ms(8),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: ws(52),
    height: ws(52),
    marginRight: ms(12),
    borderRadius: rs(26),
    overflow: 'hidden',
    backgroundColor: '#E4E7EC',
  },
  avatar: {
    width: ws(52),
    height: ws(52),
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userId: {
    fontSize: fs(11),
    fontWeight: '500',
    marginLeft: ms(4),
  },
  switchBtn: {
    marginLeft: ms(8),
    paddingVertical: ms(4),
    alignSelf: 'center',
  },
  switchText: {
    color: COLORS.mainColor,
    fontSize: fs(13),
    fontWeight: '700',
  },
  loader: {
    marginTop: ms(24),
  },
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});
