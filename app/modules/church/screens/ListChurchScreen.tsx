import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  RefreshControl,
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
import {
  churchAttributeBadgeStyles,
} from '../components/ChurchAttributeBadges';
import {ChurchListCard} from '../components/ChurchListCard';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {
  isOverseer,
  isPastorLeader,
  isSuperAdmin,
  resolveRoleIdFromUser,
} from '../../../shared/utils/permissions';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {ListPageBar, ListToolbar} from '../../../shared/components/crud';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {FlatListWithVerticalScrollbar} from '../../../shared/components/FlatListWithVerticalScrollbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ListEmptyState, ListLoadState} from '../../../shared/components/crud';
import {ChurchIcon} from '../../../shared/components/icons/UiIcons';

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

  // Per-page cache so adjacent pages are real, pre-rendered instances (no remount on swipe).
  const [pages, setPages] = useState<Record<number, ChurchListItem[]>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [pageLoading, setPageLoading] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<ChurchListItem | null>(null);
  const [attributeKeyVisible, setAttributeKeyVisible] = useState(false);

  // Live refs so async fetches read the latest cache/loading without stale closures.
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const pageLoadingRef = useRef(pageLoading);
  pageLoadingRef.current = pageLoading;
  const queryRef = useRef(query);
  const pageRef = useRef(page);
  pageRef.current = page;
  // Bumped whenever the query/filter changes, to discard in-flight stale responses.
  const fetchTokenRef = useRef(0);

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

  // Fetch a single page into the cache. Cached / in-flight pages are skipped unless forced.
  const fetchPage = useCallback(
    async (targetPage: number, opts?: {force?: boolean}) => {
      if (targetPage < 1) {return;}
      const force = !!opts?.force;
      if (!force) {
        if (pagesRef.current[targetPage]) {return;}
        if (pageLoadingRef.current[targetPage]) {return;}
      }
      const token = fetchTokenRef.current;
      setPageLoading(prev => ({...prev, [targetPage]: true}));
      try {
        const q = queryRef.current;
        const params = {
          page: targetPage,
          limit: DEFAULT_PAGE_LIMIT,
          sort_by: 'id',
          sort_desc: true,
          search: q && q.trim() ? q.trim() : undefined,
        };
        let data = await getChurchesList(params);
        // On first open the API sometimes returns pagination totals that
        // contradict the page itself (e.g. total: 1 with 10 items) while other
        // requests (users/me) run concurrently. Retry once when that happens.
        const looksInconsistent = (d: any) => {
          if (!d) {
            return false;
          }
          const count = d.items?.length ?? 0;
          return (
            (Number(d.total) || 0) < count ||
            (!!d.has_next && (Number(d.total_pages) || 1) <= (Number(d.page) || targetPage))
          );
        };
        if (looksInconsistent(data) && token === fetchTokenRef.current) {
          data = await getChurchesList(params);
        }
        // Discard responses from a previous query/filter.
        if (token !== fetchTokenRef.current) {return;}
        const nextItems = (data?.items ?? []) as ChurchListItem[];
        setPages(prev => ({...prev, [targetPage]: nextItems}));
        if (targetPage === pageRef.current || force) {
          setLoadError(null);
        }
        // Only the page on screen updates the count. Prefetch must not replace it.
        if (targetPage === pageRef.current || force) {
          const limit = Number(data?.limit) || DEFAULT_PAGE_LIMIT;
          const reportedTotal = Number(data?.total);
          const reportedPages = Number(data?.total_pages);
          const nextTotal = Number.isFinite(reportedTotal)
            ? Math.max(reportedTotal, nextItems.length)
            : nextItems.length;
          const nextPages = Number.isFinite(reportedPages) && reportedPages > 0
            ? reportedPages
            : Math.max(1, Math.ceil(nextTotal / limit));
          setTotal(nextTotal);
          setTotalPages(Math.max(nextPages, Math.ceil(nextTotal / limit) || 1));
        }
      } catch (e) {
        // A failed load of the page on screen shows a recoverable error,
        // never the "no churches" empty state.
        if (token === fetchTokenRef.current && (targetPage === pageRef.current || force)) {
          setLoadError(e);
        }
      } finally {
        if (token === fetchTokenRef.current) {
          setPageLoading(prev => {
            const next = {...prev};
            delete next[targetPage];
            return next;
          });
        }
      }
    },
    [],
  );

  // Clear the cache and reload from page 1 (search/filter/refresh/focus).
  const resetAndLoad = useCallback(() => {
    fetchTokenRef.current += 1;
    setPages({});
    setPageLoading({});
    setPage(1);
    fetchPage(1, {force: true});
  }, [fetchPage]);

  // Query change → reset cache and fetch page 1
  useEffect(() => {
    queryRef.current = query;
    resetAndLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Fetch user role once
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const userData = res?.data?.data;
        const r = resolveRoleIdFromUser(userData);
        if (r != null) {
          setRoleId(r);
        }
      } catch {}
    })();
  }, []);

  // Keep current + adjacent pages pre-fetched so swipes reveal real content instantly.
  useEffect(() => {
    fetchPage(page);
    if (page + 1 <= totalPages) {fetchPage(page + 1);}
    if (page - 1 >= 1) {fetchPage(page - 1);}
  }, [page, totalPages, fetchPage]);

  // Reload after a church is disabled or enabled and the flow returns here.
  useEffect(() => {
    if (route?.params?.refresh || route?.params?.reload) {
      resetAndLoad();
      navigation.setParams({refresh: false, reload: undefined});
    }
  }, [route?.params?.refresh, route?.params?.reload]);

  const onRefresh = async () => {
    setRefreshing(true);
    fetchTokenRef.current += 1;
    setPages({});
    setPageLoading({});
    setPage(1);
    await fetchPage(1, {force: true});
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) {return;}
    setPage(targetPage);
    fetchPage(targetPage);
  };

  // ─── Item renderer ────────────────────────────────────────────────────────
  const renderItem = ({item}: {item: ChurchListItem}) => {
    const name = item.name || '';
    const openActions = () => {
      setSelectedChurch(item);
      setActionsVisible(true);
    };
    return (
      <ChurchListCard
        item={item}
        onMorePress={openActions}
        moreAccessibilityLabel={`${name}: ${t('churchDetail')}, ${t('editChurch')}`}
        onPress={() => {
          const usePastorLeaderDashboard =
            route?.params?.openChurchInPastorDashboard === true ||
            isOverseer(roleId) ||
            isPastorLeader(roleId);
          if (usePastorLeaderDashboard) {
            (async () => {
              try {
                await AsyncStorage.setItem('selectedChurchId', String(item.id));
                await AsyncStorage.setItem('selectedChurchName', name);
                if (item.country_name) {
                  await AsyncStorage.setItem(
                    'selectedChurchCountryName',
                    String(item.country_name),
                  );
                } else {
                  await AsyncStorage.removeItem('selectedChurchCountryName');
                }
              } catch {
                // still open dashboard; bootstrap may use route params only
              }
              navigation.navigate('DashboardPastorLeader', {
                church_id: item.id,
                church_name: item.name,
                church_country_name: item.country_name ?? undefined,
              });
            })();
            return;
          }
          navigation.navigate('ChurchDetail', {id: item.id});
        }}
      />
    );
  };

  const keyExtractor = (item: ChurchListItem) => String(item.id);

  // ─── Empty / skeleton states ──────────────────────────────────────────────
  const loading = !!pageLoading[page];
  const isInitialLoad = !pages[1] && !!pageLoading[1] && !refreshing;

  const renderEmptyOrSkeleton = (pageIsLoading: boolean) => {
    if (pageIsLoading) {
      return (
        <View>
          {Array.from({length: 7}).map((_, i) => (
            <SkeletonCard key={i} anim={shimmer} C={C} />
          ))}
        </View>
      );
    }
    return (
      <ListLoadState error={loadError} onRetry={resetAndLoad}>
        <ListEmptyState
          icon={ChurchIcon}
          title={query ? 'No results found' : t('noChurchesFound')}
          hint={query ? 'Try a different search term' : undefined}
        />
      </ListLoadState>
    );
  };

  // ─── Page renderer: one list instance per page, kept mounted by the carousel ──
  const renderPage = (pageNumber: number) => {
    const data = pages[pageNumber] ?? [];
    const pageIsLoading = !!pageLoading[pageNumber] && !pages[pageNumber];
    return (
      <FlatListWithVerticalScrollbar
        data={pageIsLoading ? [] : data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="always"
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled={Platform.OS === 'android'}
        style={styles.listScroll}
        refreshControl={
          pageNumber === page ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.mainColor}
              colors={[COLORS.mainColor]}
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyOrSkeleton(pageIsLoading)}
      />
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1, minHeight: 0}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>

          <Header title={t('churchesList')} />

          <ListToolbar
            countText={
              loadError && !total
                ? undefined
                : `${total} ${(total === 1 ? t('church') : t('churches')).toLowerCase()}`
            }
            addRoute="AddChurch"
          />

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

          <View style={styles.listScrollWrap}>
            <PaginatedListPager
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              renderPage={renderPage}
              pagerRemountKey={query}
            />
          </View>

          {!isInitialLoad && (
            <>
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
              <ListPageBar
                page={page}
                totalPages={totalPages}
                loading={loading}
                onPageChange={goToPage}
              />
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
                    badge: churchAttributeBadgeStyles.badgeMother,
                    text: churchAttributeBadgeStyles.badgeTextMother,
                    desc: 'A Mother Church — a church that has planted or oversees other churches.',
                  },
                  {
                    key: 'firstMsc',
                    label: t('firstMsc') || 'First MSC',
                    badge: churchAttributeBadgeStyles.badgeMsc,
                    text: churchAttributeBadgeStyles.badgeTextMsc,
                    desc: 'The first Multi-Service Church in a region or network.',
                  },
                  {
                    key: 'msc',
                    label: 'MSC',
                    badge: churchAttributeBadgeStyles.badgeMsc,
                    text: churchAttributeBadgeStyles.badgeTextMsc,
                    desc: 'A Multi-Service Church — holds multiple services per week.',
                  },
                  {
                    key: 'map',
                    label: 'On Map',
                    badge: churchAttributeBadgeStyles.badgeMap,
                    text: churchAttributeBadgeStyles.badgeTextMap,
                    desc: 'Location identified on OMR Maps.',
                  },
                ].map(row => (
                  <View key={row.key} style={styles.modalRow}>
                    <View style={[churchAttributeBadgeStyles.badge, row.badge, styles.modalBadge]}>
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
              list.push({label: t('churchDetail'), icon: 'view', onPress: () => {if (selectedChurch) {navigation.navigate('ChurchDetail', {id: selectedChurch.id});} setActionsVisible(false); setSelectedChurch(null);}});
              list.push({label: t('editChurch'), icon: 'edit', onPress: () => {if (selectedChurch) {navigation.navigate('EditChurch', {id: selectedChurch.id});} setActionsVisible(false); setSelectedChurch(null);}});
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
  // Floats over the card's top-right corner; content keeps its full width.
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
    paddingBottom: ms(8),
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
  badgeRowFlex: {flex: 1},
  churchId: {
    fontSize: fs(11),
    fontWeight: '500',
    marginLeft: ms(6),
  },
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
