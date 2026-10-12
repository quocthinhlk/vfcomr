import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {listEventTypes, EventTypeItem, resolveEventMeetingType} from '../services/eventType.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {ms, rs, ws} from '../../../shared/utils/scale';
import {
  CardMeta,
  EntityListCard,
  ListEmptyState,
  ListLoadState,
  ListToolbar,
  ScreenContainer,
  listContentStyle,
} from '../../../shared/components/crud';

export const EventTypesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const meetingTypeLabel = (value?: string | null) => {
    const resolved = resolveEventMeetingType(value);
    if (resolved === 'meeting_with') {
      return t('eventMeetingWith') || 'Meeting With';
    }
    if (resolved === 'attendance') {
      return t('eventAttendance') || 'Attendance';
    }
    return value || '-';
  };
  const [items, setItems] = useState<EventTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventTypeItem | null>(null);

  const fetchData = useCallback(
    async (reset = false) => {
      try {
        if (loading) {
          return;
        }
        setLoading(true);
        const res = await listEventTypes();
        console.log('EventTypes API Response:', res);
        const eventTypes = res?.data ?? [];
        console.log('EventTypes parsed:', eventTypes);
        setItems(eventTypes);
        setLoadError(null);
      } catch (e) {
        console.error('Error fetching event types:', e);
        setLoadError(e);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  const reload = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData(true);
  }, []);

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

  const handleView = (item: EventTypeItem) => {
    navigation.navigate('EventTypeDetail', {eventTypeId: item.id});
  };

  const openActions = (item: EventTypeItem) => {
    setSelectedEventType(item);
    setActionsVisible(true);
  };

  const closeActions = () => {
    setActionsVisible(false);
    setSelectedEventType(null);
  };

  const renderItem = ({item}: {item: EventTypeItem}) => (
    <EntityListCard
      title={item.name}
      trailingText={`#${item.id}`}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <View style={styles.metaRow}>
        <View
          style={[
            styles.swatch,
            {backgroundColor: item.color, borderColor: C.inputBorder},
          ]}
        />
        <View
          style={[
            styles.swatch,
            {backgroundColor: item.cell_color, borderColor: C.inputBorder},
          ]}
        />
        <View style={styles.metaText}>
          <CardMeta lines={1}>{meetingTypeLabel(item.meeting_type)}</CardMeta>
        </View>
      </View>
    </EntityListCard>
  );

  const keyExtractor = (item: EventTypeItem) => String(item.id);

  const isInitialLoading = loading && items.length === 0 && !refreshing;

  return (
    <ScreenContainer title={t('eventType') || 'Event Types'} showMenu>
      <ListToolbar
        countText={
          loadError && items.length === 0
            ? undefined
            : `${items.length} ${(t('eventType') || 'Event Types').toLowerCase()}`
        }
        addRoute="AddEventType"
      />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={{flex: 1}}
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
              <ListEmptyState
                title={t('noDataFound') || 'No data found'}
                hint={t('emptyListHint')}
              />
            </ListLoadState>
          ) : null
        }
      />

      <ActionSheetModal
        visible={actionsVisible}
        title={selectedEventType?.name || t('eventType') || 'Event Type'}
        onRequestClose={closeActions}
        actions={((): ActionItem[] => {
          const go = (target: string) => () => {
            if (selectedEventType) {
              navigation.navigate(target, {eventTypeId: selectedEventType.id});
            }
            closeActions();
          };
          // Delete opens a confirmation screen, never deletes directly.
          return [
            {label: t('view') || 'View', icon: 'view', onPress: go('EventTypeDetail')},
            {label: t('edit') || 'Edit', icon: 'edit', onPress: go('EditEventType')},
            {
              label: t('delete') || 'Delete',
              icon: 'delete',
              type: 'danger',
              onPress: go('DeleteEventType'),
            },
          ];
        })()}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  swatch: {
    width: ws(14),
    height: ws(14),
    borderRadius: rs(3),
    borderWidth: 1,
  },
  metaText: {
    flex: 1,
  },
});

export default EventTypesScreen;
