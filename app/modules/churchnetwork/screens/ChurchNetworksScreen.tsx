import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {listChurchNetworks, ChurchNetworkItem} from '../services/churchnetwork.service';
import {pageChurchNetworks} from '../utils/churchNetwork.utils';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import SearchInput from '../../../shared/components/SearchInput';
import {PaginatedListPager} from '../../../shared/components/PaginatedListPager';
import ActionSheetModal, {ActionItem} from '../../../shared/components/ActionSheetModal';
import {
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListPageBar,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {NetworkIcon} from '../../../shared/components/icons/UiIcons';
import {CredentialBadge} from '../components/ChurchNetworkUI';

/**
 * Church networks. The API returns them all at once (no paging / search), so
 * they are loaded once and searched / paged here: typing doesn't refetch, and
 * a search can't be lost while a request is running.
 */
export const ChurchNetworksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [allItems, setAllItems] = useState<ChurchNetworkItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<ChurchNetworkItem | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const list = await listChurchNetworks();
      if (requestId !== requestRef.current) {
        return;
      }
      setAllItems(list);
      setLoadError(null);
    } catch (e) {
      // A failed load shows a recoverable error, never the empty state.
      if (requestId === requestRef.current) {
        setLoadError(e);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  // After a network was added / edited / deleted (markDataChanged).
  useReloadOnReturn(load, {dataKey: 'churchNetworks'});

  // A new search starts at its first page.
  useEffect(() => {
    setPage(1);
  }, [query]);

  const view = useMemo(
    () => pageChurchNetworks(allItems, query, page, DEFAULT_PAGE_LIMIT),
    [allItems, query, page],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= view.totalPages) {
      setPage(targetPage);
    }
  };

  const openActions = (item: ChurchNetworkItem) => {
    setSelectedNetwork(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedNetwork(null);
  };

  const renderItem = ({item}: {item: ChurchNetworkItem}) => (
    <EntityListCard
      title={item.name || '—'}
      trailingText={`#${item.id}`}
      onPress={() => navigation.navigate('EditChurchNetwork', {churchNetworkId: item.id})}
      onMorePress={() => openActions(item)}>
      <CredentialBadge locked={item.pastor_credential_locked} />
    </EntityListCard>
  );

  const isInitialLoading = loading && allItems.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('churchNetworks')} showMenu>
      <ListToolbar
        countText={
          loadError && !allItems.length
            ? undefined
            : view.total === 1
              ? t('churchNetworkCountOne')
              : t('churchNetworkCount').replace('{count}', String(view.total))
        }
        addRoute="AddChurchNetwork"
      />

      <SearchInput value={query} onChangeText={setQuery} placeholder={t('search')} />

      <View style={{flex: 1, minHeight: 0}}>
        <PaginatedListPager page={view.page} totalPages={view.totalPages} onPageChange={goToPage}>
          <FlatList
            data={view.items}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            nestedScrollEnabled={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            style={{flex: 1}}
            contentContainerStyle={listContentStyle}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <ListLoadState
                loading={isInitialLoading}
                error={allItems.length ? null : loadError}
                onRetry={load}>
                <ListEmptyState
                  icon={NetworkIcon}
                  title={t('noChurchNetworksFound')}
                  hint={query ? undefined : t('emptyListHint')}
                />
              </ListLoadState>
            }
          />
        </PaginatedListPager>
      </View>

      <ListPageBar page={view.page} totalPages={view.totalPages} loading={false} onPageChange={goToPage} />

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedNetwork?.name || t('churchNetworks')}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (routeName: string) => () => {
            if (selectedNetwork) {
              navigation.navigate(routeName, {churchNetworkId: selectedNetwork.id});
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('edit'), icon: 'edit', onPress: go('EditChurchNetwork')},
            {label: t('delete'), icon: 'delete', type: 'danger', onPress: go('DeleteChurchNetwork')},
          ];
        })()}
      />
    </ScreenContainer>
  );
};

export default ChurchNetworksScreen;
