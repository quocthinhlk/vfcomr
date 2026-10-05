import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, Alert} from 'react-native';
import {Text} from '@ui-kitten/components';
import {
  listChurchPlantingProjections,
  ChurchPlantingProjectionItem,
} from '../services/churchPlantingProjection.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
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

export const ChurchPlantingProjectionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [items, setItems] = useState<ChurchPlantingProjectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedProjection, setSelectedProjection] =
    useState<ChurchPlantingProjectionItem | null>(null);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [query, setQuery] = useState('');

  const fetchChurchInfo = useCallback(async (id: number) => {
    try {
      const res = await api.get(`churches/${id}`);
      const churchData = res?.data?.data;
      if (churchData?.name) {
        setChurchName(churchData.name);
      }
    } catch (e) {
      console.error('Error fetching church info:', e);
    }
  }, []);

  const fetchData = useCallback(
    async (reset = false) => {
      try {
        if (loading) {
          return;
        }
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
          return;
        }
        setChurchId(id);
        setLoading(true);
        const res = await listChurchPlantingProjections(id, true);
        console.log('ChurchPlantingProjections API Response:', res);
        const allProjections = res?.data?.items ?? [];
        console.log('ChurchPlantingProjections parsed:', allProjections);
        
        // Filter by search query
        const filtered = query.trim()
          ? allProjections.filter((p: ChurchPlantingProjectionItem) =>
              p.proposed_church_name?.toLowerCase().includes(query.trim().toLowerCase()) ||
              p.town?.toLowerCase().includes(query.trim().toLowerCase()) ||
              p.proposed_leader_name?.toLowerCase().includes(query.trim().toLowerCase())
            )
          : allProjections;
        
        setItems(filtered);
        setLoadError(null);
        await fetchChurchInfo(id);
      } catch (e) {
        console.error('Error fetching church planting projections:', e);
        // Shown as a recoverable error state in the list (not an Alert + empty list).
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    },
    [loading, t, fetchChurchInfo, query],
  );

  const reload = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData(true);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      const shouldReload = route.params?.reload;
      if (shouldReload) {
        navigation.setParams({reload: undefined});
        fetchData(true);
      }
    }, [route.params?.reload, fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  const handleView = (item: ChurchPlantingProjectionItem) => {
    navigation.navigate('ChurchPlantingProjectionDetail', {projectionId: item.id});
  };

  const openActions = (item: ChurchPlantingProjectionItem) => {
    setSelectedProjection(item);
    setActionsVisible(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const renderItem = ({item}: {item: ChurchPlantingProjectionItem}) => (
    <EntityListCard
      title={item.proposed_church_name}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <CardMeta>
        {item.town} • {item.proposed_leader_name}
      </CardMeta>
      <CardMeta>
        {t('startDatePreparation') || 'Start Date Preparation'}:{' '}
        {formatDate(item.start_date_preparation)}
      </CardMeta>
    </EntityListCard>
  );

  const keyExtractor = (item: ChurchPlantingProjectionItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

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
          loadError && items.length === 0
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
        placeholder={t('search') || 'Search...'}
      />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={listContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isInitialLoading || !loading ? (
            <ListLoadState
              loading={isInitialLoading}
              error={loadError}
              onRetry={reload}>
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

