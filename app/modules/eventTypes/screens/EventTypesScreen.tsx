import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, FlatList, RefreshControl, StyleSheet} from 'react-native';
import {listEventTypes, EventTypeItem} from '../services/eventType.service';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useReloadOnReturn} from '../../../shared/hooks/useReloadOnReturn';
import {safeColor, strictMeetingType} from '../utils/eventType.utils';
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
    const resolved = strictMeetingType(value);
    if (resolved === 'meeting_with') {
      return t('eventMeetingWith') || 'Meeting With';
    }
    if (resolved === 'attendance') {
      return t('eventAttendance') || 'Attendance';
    }
    // An unknown saved value is shown as it is, not as "Attendance".
    return value || '-';
  };
  const [items, setItems] = useState<EventTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventTypeItem | null>(null);

  // Only the newest load may write (pull-to-refresh vs. return from a save).
  const requestRef = useRef(0);
  const fetchData = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setLoading(true);
    try {
      const res = await listEventTypes();
      if (!isCurrent()) {
        return;
      }
      setItems(res?.data ?? []);
      setLoadError(null);
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching event types:', e);
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      requestRef.current += 1;
    };
  }, [fetchData]);

  // Back from add / edit / delete (also an edit made from the detail screen).
  useReloadOnReturn(fetchData, {
    dataKey: 'eventTypes',
    reload: route.params?.reload,
    clearReload: () => navigation.setParams({reload: undefined}),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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
      title={item.name?.trim() || `#${item.id}`}
      trailingText={`#${item.id}`}
      onPress={() => handleView(item)}
      onMorePress={() => openActions(item)}>
      <View style={styles.metaRow}>
        <View
          style={[
            styles.swatch,
            {backgroundColor: safeColor(item.color), borderColor: C.inputBorder},
          ]}
        />
        <View
          style={[
            styles.swatch,
            {backgroundColor: safeColor(item.cell_color), borderColor: C.inputBorder},
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
              onRetry={fetchData}>
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
  list: {
    flex: 1,
  },
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
