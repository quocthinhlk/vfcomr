import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Image,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {COLORS} from '../../../shared/constants/colors';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useNavigation, useRoute} from '@react-navigation/native';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  getChurchesList,
  ChurchListItem,
} from '../services/church.service';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
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

// ─── Skeleton card ───────────────────────────────────────────────────────────
const SkeletonCard: React.FC<{anim: Animated.Value; C: any}> = ({anim, C}) => {
  const opacity = anim.interpolate({inputRange: [0, 1], outputRange: [0.4, 0.9]});
  return (
    <Animated.View style={[skeletonStyles.card, {opacity, backgroundColor: C.surface, borderColor: C.inputBorder}]}>
      <View style={[skeletonStyles.circle, {backgroundColor: C.inputBg}]} />
      <View style={skeletonStyles.lines}>
        <View style={[skeletonStyles.lineWide, {backgroundColor: C.inputBg}]} />
        <View style={[skeletonStyles.lineNarrow, {backgroundColor: C.inputBg}]} />
      </View>
    </Animated.View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rs(12),
    padding: ms(12),
    marginBottom: ms(10),
    borderWidth: 1,
  },
  circle: {width: ws(40), height: ws(40), borderRadius: rs(20), marginRight: ms(12)},
  lines: {flex: 1, gap: ms(8)},
  lineWide: {height: ms(12), borderRadius: rs(4), width: '70%'},
  lineNarrow: {height: ms(10), borderRadius: rs(4), width: '45%'},
});

// ─── Main component ───────────────────────────────────────────────────────────
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
  const [attributeKeyVisible, setAttributeKeyVisible] = useState(false);

  // Refs to avoid stale closures inside fetchData
  const loadingRef = useRef(false);
  const queryRef = useRef(query);
  const requestIdRef = useRef(0);

  // Skeleton shimmer animation
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(shimmer, {toValue: 0, duration: 700, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Stable fetchData — no external deps, uses refs for latest values
  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      // For resets (query change/refresh/page nav), always allow; otherwise guard
      if (loadingRef.current && !reset) {return;}
      loadingRef.current = true;
      setLoading(true);

      const reqId = ++requestIdRef.current;

      try {
        const q = queryRef.current;
        const data = await getChurchesList({
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          sort_by: 'id',
          sort_desc: true,
          search: q && q.trim() ? q.trim() : undefined,
        });
        // Discard stale responses from previous requests
        if (reqId !== requestIdRef.current) {return;}
        const nextItems = (data?.items ?? []) as ChurchListItem[];
        setTotalPages(data?.total_pages ?? 1);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? targetPage);
        setItems(prev => (reset ? nextItems : [...prev, ...nextItems]));
      } catch {
        // noop — errors shown via empty state
      } finally {
        if (reqId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [],
  );

  // Query change → reset list and fetch page 1
  useEffect(() => {
    setItems([]);
    fetchData(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Fetch user role once
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const r = res?.data?.data?.role?.id;
        if (typeof r === 'number') {setRoleId(r);}
      } catch {}
    })();
  }, []);

  // Refresh on screen focus (e.g. after add/edit)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route?.params?.refresh) {
        setItems([]);
        fetchData(1, true);
        try {navigation.setParams({refresh: false});} catch {}
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
    if (targetPage < 1 || targetPage > totalPages || loadingRef.current) {return;}
    setItems([]);
    fetchData(targetPage, true);
  };

  // ─── Item renderer ────────────────────────────────────────────────────────
  const renderItem = ({item}: {item: ChurchListItem}) => {
    const name = item.name || '';
    const isMother = !!(item as any)?.is_mother_church;
    const isMsc = !!(item as any)?.is_msc;
    const isOnMap = !!((item as any)?.omr_map_location || (item as any)?.omr_map_url);
    const hasBadge = isMother || isMsc || isOnMap;
    const metaParts = [item.city, item.country_name].filter(Boolean);

    return (
      <Pressable
        style={({pressed}) => [
          listStyles.itemCard as any,
          pressed && {opacity: 0.75},
        ]}
        onPress={() => navigation.navigate('ChurchDetail', {id: item.id})}
        onLongPress={() => {setSelectedChurch(item); setActionsVisible(true);}}
        delayLongPress={280}
        android_ripple={{color: C.inputBorder, borderless: false}}>
        <View style={listStyles.itemRow as any}>
          <ChurchListRowThumb item={item} listStyles={listStyles} />

          {/* Content */}
          <View style={styles.itemCol}>
            <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={2}>
              {name}
            </Text>
            {metaParts.length > 0 && (
              <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
                {metaParts.join(', ')}
              </Text>
            )}
            {!!item.pastor_name && (
              <Text style={[styles.pastor, {color: C.textSecondary}]} numberOfLines={1}>
                {item.pastor_name}
              </Text>
            )}
            {/* Badges row + ID at right */}
            <View style={styles.badgeIdRow}>
              <View style={styles.badgeRow}>
                {isMother && (
                  <View style={[styles.badge, styles.badgeMother]}>
                    <Text style={styles.badgeTextMother}>{t('mother') || 'Mother'}</Text>
                  </View>
                )}
                {isMsc && (
                  <View style={[styles.badge, styles.badgeMsc]}>
                    <Text style={styles.badgeTextMsc}>{t('msc') || 'MSC'}</Text>
                  </View>
                )}
                {isOnMap && (
                  <View style={[styles.badge, styles.badgeMap]}>
                    <Text style={styles.badgeTextMap}>On Map</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.churchId, {color: C.textSecondary}]}>
                #{item.id}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const keyExtractor = (item: ChurchListItem) => String(item.id);

  // ─── Pagination ───────────────────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) {return null;}
    const pages: Array<{label: string; page: number; active?: boolean; disabled?: boolean}> = [];
    pages.push({label: '«', page: 1, disabled: page === 1});
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) {pages.push({label: String(p), page: p});}
    }
    pages.push({label: String(page), page, active: true});
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) {pages.push({label: String(p), page: p});}
    }
    pages.push({label: '»', page: totalPages, disabled: page === totalPages});

    return (
      <View style={listStyles.pageNumbersContainer as any}>
        {pages.map((p, idx) => (
          <TouchableOpacity
            key={`${p.label}-${p.page}-${idx}`}
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

  // ─── Empty / skeleton states ──────────────────────────────────────────────
  const isInitialLoad = loading && items.length === 0 && !refreshing;

  const renderEmptyOrSkeleton = () => {
    if (isInitialLoad) {
      return (
        <View>
          {Array.from({length: 7}).map((_, i) => (
            <SkeletonCard key={i} anim={shimmer} C={C} />
          ))}
        </View>
      );
    }
    if (!loading) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>⛪</Text>
          <Text style={[styles.emptyTitle, {color: C.textPrimary}]}>
            {query ? 'No results found' : t('noChurchesFound')}
          </Text>
          {!!query && (
            <Text style={[styles.emptyHint, {color: C.textSecondary}]}>
              Try a different search term
            </Text>
          )}
        </View>
      );
    }
    return null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>

          <Header title={t('churchesList')} />

          <View style={styles.headerRow}>
            <AddNewHeaderButton
              name="AddChurch"
              text={t('addNew')}
              style={{
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: COLORS.mainColor,
              }}
              textStyle={{color: COLORS.mainColor}}
            />
          </View>

          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search')}
            onSubmitEditing={() => goToPage(1)}
          />

          {/* Pagination loading overlay */}
          {loading && !isInitialLoad && !refreshing && (
            <View style={[styles.loadingOverlay, {backgroundColor: C.background + 'CC'}]}>
              <ActivityIndicator size="small" color={COLORS.mainColor} />
            </View>
          )}

          <FlatList
            data={isInitialLoad ? [] : items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="always"
            contentContainerStyle={{paddingBottom: ms(8)}}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.mainColor}
                colors={[COLORS.mainColor]}
              />
            }
            ListEmptyComponent={renderEmptyOrSkeleton()}
          />

          {/* Footer: info + stats + pagination */}
          {!isInitialLoad && (
            <>
              <Text style={[styles.subTitle, {color: C.textSecondary}]}>
                {`${t('total')}: ${total} • ${t('page')} ${page}/${totalPages} • ${DEFAULT_PAGE_LIMIT} ${t('perPage')}`}
              </Text>
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={styles.attrKeyBtn}
                  onPress={() => setAttributeKeyVisible(true)}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <View style={[styles.attrKeyIcon, {borderColor: C.textSecondary}]}>
                    <Text style={[styles.attrKeyIconText, {color: C.textSecondary}]}>i</Text>
                  </View>
                  <Text style={[styles.attrKeyLabel, {color: C.textSecondary}]}>
                    View Attribute Info
                  </Text>
                </TouchableOpacity>
                <View style={styles.pagination}>{renderPagination()}</View>
              </View>
            </>
          )}

          {/* ── Attribute Key Modal ── */}
          <Modal
            visible={attributeKeyVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setAttributeKeyVisible(false)}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setAttributeKeyVisible(false)}>
              <Pressable style={[styles.modalCard, {backgroundColor: C.surface}]}>
                <Text style={[styles.modalTitle, {color: C.textPrimary}]}>
                  Church Attribute Key
                </Text>
                <View style={[styles.modalDivider, {backgroundColor: C.border}]} />
                {[
                  {
                    key: 'mother',
                    label: 'Mother',
                    badge: styles.badgeMother,
                    text: styles.badgeTextMother,
                    desc: 'A Mother Church — a church that has planted or oversees other churches.',
                  },
                  {
                    key: 'msc',
                    label: 'MSC',
                    badge: styles.badgeMsc,
                    text: styles.badgeTextMsc,
                    desc: 'A Multi-Service Church — holds multiple services per week.',
                  },
                  {
                    key: 'map',
                    label: 'On Map',
                    badge: styles.badgeMap,
                    text: styles.badgeTextMap,
                    desc: 'Location identified on OMR Maps.',
                  },
                ].map(row => (
                  <View key={row.key} style={styles.modalRow}>
                    <View style={[styles.badge, row.badge, styles.modalBadge]}>
                      <Text style={row.text}>{row.label}</Text>
                    </View>
                    <Text style={[styles.modalDesc, {color: C.textSecondary}]}>
                      {row.desc}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.modalClose, {borderColor: C.border}]}
                  onPress={() => setAttributeKeyVisible(false)}>
                  <Text style={[styles.modalCloseText, {color: C.textPrimary}]}>
                    Close
                  </Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {/* ── Long-press action sheet ── */}
          <ActionSheetModal
            visible={actionsVisible}
            title={selectedChurch?.name || t('churchDetail')}
            onRequestClose={() => {setActionsVisible(false); setSelectedChurch(null);}}
            actions={((): ActionItem[] => {
              const list: ActionItem[] = [];
              list.push({label: t('churchDetail'), onPress: () => {if (selectedChurch) {navigation.navigate('ChurchDetail', {id: selectedChurch.id});} setActionsVisible(false); setSelectedChurch(null);}});
              list.push({label: t('editChurch'), onPress: () => {if (selectedChurch) {navigation.navigate('EditChurch', {id: selectedChurch.id});} setActionsVisible(false); setSelectedChurch(null);}});
              if (isSuperAdmin(roleId)) {
                list.push({label: t('disableChurch') || 'Disable Church', type: 'danger', onPress: () => {if (selectedChurch) {navigation.navigate('DisableChurch', {id: selectedChurch.id});} setActionsVisible(false); setSelectedChurch(null);}});
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
    paddingTop: 0,
    paddingHorizontal: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  subTitle: {
    marginTop: ms(4),
    marginBottom: ms(2),
    fontSize: fs(11),
  },
  itemCol: {flex: 1},
  name: {fontSize: fs(13.5), fontWeight: '600', marginBottom: ms(2)},
  meta: {fontSize: fs(12), marginBottom: ms(1)},
  pastor: {fontSize: fs(12), marginBottom: ms(4)},
  badgeIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(1),
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ms(4),
    flex: 1,
  },
  churchId: {
    fontSize: fs(11),
    fontWeight: '500',
    marginLeft: ms(6),
  },
  badge: {
    paddingVertical: ms(1),
    paddingHorizontal: ms(6),
    borderRadius: rs(3),
    borderWidth: 1,
  },
  badgeMother: {backgroundColor: '#DEEAD4', borderColor: '#BCD4A7'},
  badgeMsc:    {backgroundColor: '#F1E0D1', borderColor: '#E3BE9D'},
  badgeMap:    {backgroundColor: '#DDE5F4', borderColor: '#B8C9E8'},
  badgeTextMother: {color: '#6EA43D', fontSize: fs(11), fontWeight: '500'},
  badgeTextMsc:    {color: '#B65C16', fontSize: fs(11), fontWeight: '500'},
  badgeTextMap:    {color: '#3E68B5', fontSize: fs(11), fontWeight: '500'},
  // Loading overlay (paginating)
  loadingOverlay: {
    position: 'absolute',
    top: ms(120),
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: ms(60),
  },
  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: ms(60),
    gap: ms(8),
  },
  emptyIcon: {fontSize: fs(40)},
  emptyTitle: {fontSize: fs(14), fontWeight: '600'},
  emptyHint: {fontSize: fs(12)},
  // Pagination footer row
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: ms(4),
  },
  pagination: {paddingVertical: ms(8), alignItems: 'flex-end'},
  // Attribute info button
  attrKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    paddingVertical: ms(8),
  },
  attrKeyIcon: {
    width: ws(16),
    height: ws(16),
    borderRadius: rs(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrKeyIconText: {fontSize: fs(10), fontWeight: '700', lineHeight: fs(13)},
  attrKeyLabel: {fontSize: fs(11)},
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(24),
  },
  modalCard: {
    width: '100%',
    borderRadius: rs(10),
    padding: ms(20),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {fontSize: fs(14), fontWeight: '700', marginBottom: ms(10)},
  modalDivider: {height: 1, marginBottom: ms(14)},
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ms(12),
    gap: ms(10),
  },
  modalBadge: {minWidth: ws(52), alignItems: 'center', marginTop: ms(1)},
  modalDesc: {flex: 1, fontSize: fs(12), lineHeight: fs(17)},
  modalClose: {
    marginTop: ms(8),
    paddingVertical: ms(8),
    borderTopWidth: 1,
    alignItems: 'center',
  },
  modalCloseText: {fontSize: fs(13), fontWeight: '500'},
});

export default ChurchesListScreen;
