import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  listChurchNetworks,
  ChurchNetworkItem,
} from '../services/churchnetwork.service';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {fs, ws, ms} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import {
  CenteredLoader,
  ChurchNetworkCard,
  NetworkIcon,
  getNetworkTokens,
} from '../components/ChurchNetworkUI';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';

export const ChurchNetworksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const T = getNetworkTokens(theme);
  const [items, setItems] = useState<ChurchNetworkItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<ChurchNetworkItem | null>(null);
  const pageRef = useRef(1);

  const fetchData = useCallback(
    async (targetPage: number, reset = false) => {
      try {
        setLoading(true);
        const res = await listChurchNetworks({limit: 50});
        const full = res?.data?.items ?? [];
        const filtered = query
          ? full.filter(i =>
              i.name?.toLowerCase().includes(query.trim().toLowerCase()),
            )
          : full;
        const total = filtered.length;
        const totalPages = Math.max(
          1,
          Math.ceil(total / DEFAULT_PAGE_LIMIT),
        );
        const validPage = Math.min(Math.max(1, targetPage), totalPages);
        const start = (validPage - 1) * DEFAULT_PAGE_LIMIT;
        const end = start + DEFAULT_PAGE_LIMIT;
        const pageSlice = filtered.slice(start, end);

        setTotalPages(totalPages);
        setTotal(total);
        pageRef.current = validPage;
        setPage(validPage);
        setItems(pageSlice);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    setItems([]);
    fetchData(1, true);
  }, [query, fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData(pageRef.current, true);
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

  const handleView = useCallback(
    (item: ChurchNetworkItem) => {
      navigation.navigate('ChurchNetworkDetail', {churchNetworkId: item.id});
    },
    [navigation],
  );

  const openActions = useCallback((item: ChurchNetworkItem) => {
    setSelectedNetwork(item);
    setActionsVisible(true);
  }, []);

  const closeActions = useCallback(() => {
    setActionsVisible(false);
  }, []);

  const renderItem = ({item}: {item: ChurchNetworkItem}) => (
    <ChurchNetworkCard
      item={item}
      onPress={handleView}
      onMorePress={openActions}
    />
  );

  const keyExtractor = (item: ChurchNetworkItem) => String(item.id);

  const renderPagination = () => {
    const itemsToRender: Array<{
      label: string;
      page: number;
      active?: boolean;
      disabled?: boolean;
    }> = [];
    itemsToRender.push({label: '<<', page: 1, disabled: page === 1});
    for (let p = page - 2; p <= page - 1; p++) {
      if (p >= 1) itemsToRender.push({label: String(p), page: p});
    }
    itemsToRender.push({label: String(page), page, active: true});
    for (let p = page + 1; p <= page + 2; p++) {
      if (p <= totalPages) itemsToRender.push({label: String(p), page: p});
    }
    itemsToRender.push({
      label: '>>',
      page: totalPages,
      disabled: page === totalPages,
    });
    return (
      <View style={L.pageNumbersContainer as any}>
        {itemsToRender.map(p => (
          <TouchableOpacity
            key={`${p.label}-${p.page}`}
            style={[
              L.pageNumber as any,
              p.active && (L.pageNumberActive as any),
              (p.disabled || loading) && (L.pageNumberDisabled as any),
            ]}
            onPress={() => goToPage(p.page)}
            disabled={!!p.disabled || loading}
          >
            <Text
              style={[
                L.pageNumberText as any,
                p.active && (L.pageNumberTextActive as any),
              ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('churchNetworks')} />

          <View style={styles.headerRow}>
            <Text
              style={[styles.countText, {color: C.textSecondary}]}
              accessibilityLiveRegion="polite">
              {`${total} ${t('churchNetworks').toLowerCase()}`}
            </Text>
            <AddNewHeaderButton
              name="AddChurchNetwork"
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

          <View style={{flex: 1, minHeight: 0}}>
            <PaginatedListPager
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}>
              <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                nestedScrollEnabled={Platform.OS === 'android'}
                style={{flex: 1}}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  isInitialLoading ? (
                    <CenteredLoader />
                  ) : !loading ? (
                    <View style={styles.empty}>
                      <View style={[styles.emptyIcon, {backgroundColor: T.brandTint}]}>
                        <NetworkIcon color={T.brandText} />
                      </View>
                      <Text style={[styles.emptyTitle, {color: C.textPrimary}]}>
                        {t('noChurchNetworksFound')}
                      </Text>
                      {!query && (
                        <Text style={[styles.emptyHint, {color: C.textSecondary}]}>
                          {t('noChurchNetworksHint')}
                        </Text>
                      )}
                    </View>
                  ) : null
                }
              />
            </PaginatedListPager>
          </View>

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <Text style={[styles.pageInfo, {color: C.textSecondary}]}>
                {`${t('page')} ${page}/${totalPages}`}
              </Text>
              {renderPagination()}
            </View>
          )}

          <ActionSheetModal
            visible={actionsVisible}
            title={selectedNetwork?.name}
            onRequestClose={closeActions}
            actions={((): ActionItem[] => {
              const go = (route: string) => () => {
                if (selectedNetwork) {
                  navigation.navigate(route, {
                    churchNetworkId: selectedNetwork.id,
                  });
                }
                closeActions();
              };
              // Delete opens a confirmation screen, never deletes directly.
              return [
                {label: t('view'), icon: 'view', onPress: go('ChurchNetworkDetail')},
                {label: t('edit'), icon: 'edit', onPress: go('EditChurchNetwork')},
                {
                  label: t('delete'),
                  icon: 'delete',
                  type: 'danger',
                  onPress: go('DeleteChurchNetwork'),
                },
              ];
            })()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    marginTop: ms(6),
    fontSize: fs(13),
    fontWeight: '500',
  },
  listContent: {
    paddingTop: ms(4),
    paddingBottom: ms(16),
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: ms(48),
    paddingHorizontal: ms(24),
  },
  emptyIcon: {
    width: ws(64),
    height: ws(64),
    borderRadius: ws(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(14),
  },
  emptyTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: ms(6),
    fontSize: fs(13),
    textAlign: 'center',
    lineHeight: fs(19),
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ms(10),
  },
  pageInfo: {
    fontSize: fs(12),
  },
});

export default ChurchNetworksScreen;
