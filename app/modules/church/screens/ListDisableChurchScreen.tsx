import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Image,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {COLORS} from '../../../shared/constants/colors';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useNavigation, useRoute} from '@react-navigation/native';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {FlatListWithVerticalScrollbar} from '../../../shared/components/FlatListWithVerticalScrollbar';
import {
  getChurchesList,
  ChurchListItem,
} from '../services/church.service';
import {
  EditSvgIcon,
  DisabledSvgIcon,
  EnabledSvgIcon,
  CopySvgIcon,
} from '../../../shared/components/icons';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {ListPageBar, ListToolbar} from '../../../shared/components/crud';
import SearchInput from '../../../shared/components/SearchInput';

const DEFAULT_CHURCH_LIST_PHOTO = require('../../../assets/images/group-user.jpg');

type ListStyles = ReturnType<typeof getListStyles>;

const ChurchListRowThumb: React.FC<{item: ChurchListItem; listStyles: ListStyles}> = ({
  item,
  listStyles,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = String(item.photo_url ?? '').trim();

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const useRemote = uri.length > 0 && !imageFailed;

  return (
    <View style={listStyles.avatarWrap as any}>
      <View style={listStyles.avatarPhotoWrap as any}>
        <Image
          source={useRemote ? {uri} : DEFAULT_CHURCH_LIST_PHOTO}
          style={listStyles.avatarPhoto as any}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      </View>
    </View>
  );
};

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
  const requestId = useRef(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchData = useCallback(async (targetPage: number) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const q = queryRef.current.trim();
      const data = await getChurchesList({
        page: targetPage,
        limit: DEFAULT_PAGE_LIMIT,
        sort_by: 'id',
        sort_desc: true,
        search: q || undefined,
        disabled: true,
      });
      if (id !== requestId.current) {
        return;
      }
      const nextItems = (data?.items ?? []) as ChurchListItem[];
      const limit = Number(data?.limit) || DEFAULT_PAGE_LIMIT;
      const reportedTotal = Number(data?.total);
      const reportedPages = Number(data?.total_pages);
      const nextTotal = Number.isFinite(reportedTotal)
        ? Math.max(reportedTotal, nextItems.length)
        : nextItems.length;
      const nextPages =
        Number.isFinite(reportedPages) && reportedPages > 0
          ? reportedPages
          : Math.max(1, Math.ceil(nextTotal / limit));
      setItems(nextItems);
      setTotal(nextTotal);
      setTotalPages(Math.max(nextPages, Math.ceil(nextTotal / limit) || 1));
      setPage(Number(data?.page ?? targetPage) || targetPage);
    } catch {
      // noop UI-level
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [query, fetchData]);

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
    if (route?.params?.refresh || route?.params?.reload) {
      fetchData(1);
      navigation.setParams({refresh: false, reload: undefined});
    }
  }, [route?.params?.refresh, route?.params?.reload, fetchData, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(1);
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || loading) {
      return;
    }
    fetchData(targetPage);
  };

  const renderItem = ({item}: {item: ChurchListItem}) => {
    const name = item.name || '';
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
          <ChurchListRowThumb item={item} listStyles={listStyles} />
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
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => navigation.navigate('EnableChurch', { id: item.id })}>
                <EnabledSvgIcon width={ws(15)} height={hs(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: ChurchListItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1, minHeight: 0, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('disabledChurches')} />

        <ListToolbar
          countText={`${total} ${(total === 1 ? t('church') : t('churches')).toLowerCase()}`}
        />

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search')}
          onSubmitEditing={() => goToPage(1)}
        />

        <View style={styles.listScrollWrap}>
          <PaginatedListPager
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}>
            <FlatListWithVerticalScrollbar
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentInsetAdjustmentBehavior="always"
              contentContainerStyle={styles.listContent}
              nestedScrollEnabled={Platform.OS === 'android'}
              style={styles.listScroll}
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
          title={selectedChurch?.name || t('church')}
          onRequestClose={() => { setActionsVisible(false); setSelectedChurch(null); }}
          actions={((): ActionItem[] => {
            const list: ActionItem[] = [];
            list.push({ label: t('churchDetail'), icon: 'view', onPress: () => { if (selectedChurch) navigation.navigate('ChurchDetail', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            list.push({ label: t('editChurch'), icon: 'edit', onPress: () => { if (selectedChurch) navigation.navigate('EditChurch', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
            if (isSuperAdmin(roleId)) {
              list.push({ label: t('enableChurch') || 'Enable Church', type: 'danger', onPress: () => { if (selectedChurch) navigation.navigate('EnableChurch', { id: selectedChurch.id }); setActionsVisible(false); setSelectedChurch(null); } });
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
    minHeight: 0,
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  listScrollWrap: {
    flex: 1,
    minHeight: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: ms(24),
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
    fontSize: fs(12),
  },
  addButton: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: rs(3),
  },
  addButtonText: {color: '#fff', fontWeight: '600'},
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemCol: {flex: 1, paddingRight: 8},
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  name: {fontSize: fs(14), fontWeight: '600', marginBottom: ms(2)},
  meta: {fontSize: fs(12)},
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
    backgroundColor: COLORS.mainColor,
  },
  copyBtn: {
    backgroundColor: COLORS.mainColor,
  },
  empty: {textAlign: 'center', marginTop: ms(40)},
  pagination: {paddingVertical: ms(12), alignItems: 'flex-end'},
  pageNumbersContainer: {flexDirection: 'row', alignItems: 'center'},
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
  pageNumberDisabled: {opacity: 0.5},
  pageNumberText: {fontWeight: '600', fontSize: fs(12)},
  pageNumberTextActive: {color: '#fff'},
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
});

export default ChurchesListScreen;
