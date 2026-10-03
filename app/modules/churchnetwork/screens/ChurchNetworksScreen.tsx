import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {
  listChurchNetworks,
  ChurchNetworkItem,
} from '../services/churchnetwork.service';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {
  CenteredLoader,
  EntityListCard,
  ListEmptyState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {NetworkIcon} from '../../../shared/components/icons/UiIcons';
import {CredentialBadge} from '../components/ChurchNetworkUI';

export const ChurchNetworksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
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

  const handleEdit = useCallback(
    (item: ChurchNetworkItem) => {
      navigation.navigate('EditChurchNetwork', {churchNetworkId: item.id});
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
    <EntityListCard
      title={item.name}
      onPress={() => handleEdit(item)}
      onMorePress={() => openActions(item)}>
      <CredentialBadge locked={!!item.pastor_credential_locked} />
    </EntityListCard>
  );

  const keyExtractor = (item: ChurchNetworkItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('churchNetworks')} showMenu>
      <ListToolbar
        countText={`${total} ${t('churchNetworks').toLowerCase()}`}
        addRoute="AddChurchNetwork"
      />

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
            contentContainerStyle={listContentStyle}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              isInitialLoading ? (
                <CenteredLoader />
              ) : !loading ? (
                <ListEmptyState
                  icon={NetworkIcon}
                  title={t('noChurchNetworksFound')}
                  hint={query ? undefined : t('emptyListHint')}
                />
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
    </ScreenContainer>
  );
};

export default ChurchNetworksScreen;
