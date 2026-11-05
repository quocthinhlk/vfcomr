import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet} from 'react-native';
import {Text} from '@ui-kitten/components';
import {
  listChurchPlantingProjections,
  ChurchPlantingProjectionItem,
} from '../services/churchPlantingProjection.service';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ms} from '../../../shared/utils/scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import SearchInput from '../../../shared/components/SearchInput';
import {
  CardMeta,
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';
import {
  completedStepsOf,
  filterProjections,
  formatDisplayDate,
  preparationDateOf,
} from '../utils/projection.utils';

export const ChurchPlantingProjectionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [allItems, setAllItems] = useState<ChurchPlantingProjectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedProjection, setSelectedProjection] =
    useState<ChurchPlantingProjectionItem | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [query, setQuery] = useState('');
  // Only the newest load may write (pull-to-refresh vs. return from a save).
  const requestRef = useRef(0);

  /**
   * Load every projection of the selected church once; search filters them
   * locally. Before, each keystroke re-fetched the list and a keystroke typed
   * while a fetch was running was dropped (the filter kept the old text).
   */
  const fetchData = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setLoading(true);
    try {
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      const id = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
      if (isNaN(id)) {
        // Shown in the list as a retryable state instead of an Alert.
        throw new Error(
          savedChurchId
            ? t('invalidChurchId') || 'Invalid Church ID'
            : t('churchIdNotFound') || 'Church ID not found',
        );
      }
      const [res, churchRes] = await Promise.all([
        listChurchPlantingProjections(id, true),
        api.get(`churches/${id}`).catch(() => null),
      ]);
      if (!isCurrent()) {
        return;
      }
      setAllItems(res?.data?.items ?? []);
      setChurchName(churchRes?.data?.data?.name || '');
      setLoadError(null);
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching church planting projections:', e);
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [t]);

  const items = useMemo(() => filterProjections(allItems, query), [allItems, query]);

  useEffect(() => {
    fetchData();
    return () => {
      requestRef.current += 1;
    };
  }, [fetchData]);

  // Back from add / delete ({reload: true}) or after an edit / steps save made
  // from the detail screen (markDataChanged), so names and steps are current.
  useReloadOnReturn(fetchData, {
    dataKey: 'churchPlantingProjections',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleView = (item: ChurchPlantingProjectionItem) => {
    navigation.navigate('ChurchPlantingProjectionDetail', {projectionId: item.id});
  };

  const openActions = (item: ChurchPlantingProjectionItem) => {
    setSelectedProjection(item);
    setActionsVisible(true);
  };

  const renderItem = ({item}: {item: ChurchPlantingProjectionItem}) => (
    <EntityListCard
      title={item.proposed_church_name}
      trailingText={`#${item.id}`}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <CardMeta>
        {item.town} • {item.proposed_leader_name}
      </CardMeta>
      <CardMeta>
        {t('startDatePreparation') || 'Start Date Preparation'}:{' '}
        {formatDisplayDate(preparationDateOf(item))}
      </CardMeta>
      <CardMeta>
        {t('stepsCompleted') || 'Steps Completed'}: {completedStepsOf(item).done} /{' '}
        {completedStepsOf(item).total}
      </CardMeta>
    </EntityListCard>
  );

  const keyExtractor = (item: ChurchPlantingProjectionItem) => String(item.id);

  const isInitialLoading = loading && allItems.length === 0 && !refreshing;

  return (
    <ScreenContainer
      title={t('churchPlantingProjections') || 'Church Planting Projections'}
      showMenu>
      {churchName ? (
        <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
          {t('churchPlantingProjections') || 'Church Planting Projections'} {t('for') || 'for'} {churchName}
        </Text>
      ) : null}

      <ListToolbar
        countText={
          loadError && allItems.length === 0
            ? undefined
            : `${items.length} ${(
                t('churchPlantingProjections') || 'Church Planting Projections'
              ).toLowerCase()}`
        }
        addRoute="AddChurchPlantingProjection"
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        // Filtering is local now: no request to wait for, show matches at once.
        debounce={false}
        placeholder={t('search') || 'Search...'}
      />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={listContentStyle}
        // With the search keyboard open, the first tap on a card only closed
        // the keyboard (Android): let taps through and close it on scroll.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isInitialLoading || !loading ? (
            <ListLoadState
              loading={isInitialLoading}
              error={loadError}
              onRetry={fetchData}>
              <ListEmptyState hint={query ? undefined : t('emptyListHint')} />
            </ListLoadState>
          ) : null
        }
      />

      <ActionSheetModal
        visible={actionsVisible}
        title={
          selectedProjection?.proposed_church_name ||
          t('churchPlantingProjection') ||
          'Church Planting Projection'
        }
        onRequestClose={() => {
          setActionsVisible(false);
          setSelectedProjection(null);
        }}
        actions={((): ActionItem[] => {
          const list: ActionItem[] = [];
          list.push({
            label: t('view') || 'View',
            icon: 'view',
            onPress: () => {
              if (selectedProjection) {
                navigation.navigate('ChurchPlantingProjectionDetail', {
                  projectionId: selectedProjection.id,
                });
              }
              setActionsVisible(false);
              setSelectedProjection(null);
            },
          });
          list.push({
            label: t('edit') || 'Edit',
            icon: 'edit',
            onPress: () => {
              if (selectedProjection) {
                navigation.navigate('EditChurchPlantingProjection', {
                  projectionId: selectedProjection.id,
                });
              }
              setActionsVisible(false);
              setSelectedProjection(null);
            },
          });
          list.push({
            label: t('delete') || 'Delete',
            icon: 'delete',
            type: 'danger',
            onPress: () => {
              if (selectedProjection) {
                navigation.navigate('DeleteChurchPlantingProjection', {
                  projectionId: selectedProjection.id,
                });
              }
              setActionsVisible(false);
              setSelectedProjection(null);
            },
          });
          return list;
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  churchNameText: {
    marginTop: ms(8),
    marginBottom: ms(4),
    fontSize: fs(14),
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
});

export default ChurchPlantingProjectionsScreen;

