import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {COLORS} from '../../../shared/constants/colors';
import {globalStyles} from '../../../shared/styles/global';
import {listEventTypes, EventTypeItem, resolveEventMeetingType} from '../services/eventType.service';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ActionSheetModal, {
  ActionItem,
} from '../../../shared/components/ActionSheetModal';
import {fs, ws, ms, rs} from '../../../shared/utils/scale';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {EditSvgIcon} from '../../../shared/components/icons';

export const EventTypesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
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
      } catch (e) {
        console.error('Error fetching event types:', e);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

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

  const handleEdit = (item: EventTypeItem) => {
    navigation.navigate('EditEventType', {eventTypeId: item.id});
  };

  const handleDelete = (item: EventTypeItem) => {
    navigation.navigate('DeleteEventType', {eventTypeId: item.id});
  };

  const renderItem = ({item}: {item: EventTypeItem}) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleView(item)}
      onLongPress={() => {
        setSelectedEventType(item);
        setActionsVisible(true);
      }}
      delayLongPress={300}>
      <View style={L.itemCard as any}>
        <View style={L.itemRow as any}>
          <View style={styles.itemCol}>
            <View style={styles.nameRow}>
              <View style={[styles.colorIndicator, {backgroundColor: item.color}]} />
              <Text style={[styles.name, {color: C.textPrimary}]}>
                {item.name}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.colorBox, {backgroundColor: item.cell_color}]} />
              <Text style={[styles.metaText, {color: C.textSecondary}]}>
                {meetingTypeLabel(item.meeting_type)}
              </Text>
            </View>
          </View>
          <View style={styles.itemColRight}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => handleEdit(item)}>
                <EditSvgIcon width={fs(15)} height={fs(15)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: EventTypeItem) => String(item.id);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('eventType') || 'Event Types'} />

          <View style={styles.headerRow}>
            <AddNewHeaderButton name="AddEventType" text={t('addNew') || 'Add New'} />
          </View>

          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.empty, {color: C.textSecondary}]}>
                  {t('noDataFound') || 'No data found'}
                </Text>
              ) : null
            }
          />

          <ActionSheetModal
            visible={actionsVisible}
            title={selectedEventType?.name || t('eventType') || 'Event Type'}
            onRequestClose={() => {
              setActionsVisible(false);
              setSelectedEventType(null);
            }}
            actions={((): ActionItem[] => {
              const list: ActionItem[] = [];
              list.push({
                label: t('view') || 'View',
                onPress: () => {
                  if (selectedEventType) {
                    navigation.navigate('EventTypeDetail', {eventTypeId: selectedEventType.id});
                  }
                  setActionsVisible(false);
                  setSelectedEventType(null);
                },
              });
              list.push({
                label: t('edit') || 'Edit',
                onPress: () => {
                  if (selectedEventType) {
                    navigation.navigate('EditEventType', {eventTypeId: selectedEventType.id});
                  }
                  setActionsVisible(false);
                  setSelectedEventType(null);
                },
              });
              list.push({
                label: t('delete') || 'Delete',
                type: 'danger',
                onPress: () => {
                  if (selectedEventType) {
                    navigation.navigate('DeleteEventType', {eventTypeId: selectedEventType.id});
                  }
                  setActionsVisible(false);
                  setSelectedEventType(null);
                },
              });
              return list;
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: ms(8),
  },
  itemCol: {
    flex: 1,
    paddingRight: ms(8),
  },
  itemColRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: ms(8),
    width: ws(72),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    marginBottom: ms(4),
  },
  colorIndicator: {
    width: ws(20),
    height: ws(20),
    borderRadius: rs(4),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  name: {
    fontSize: fs(14),
    fontWeight: '600',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  colorBox: {
    width: ws(16),
    height: ws(16),
    borderRadius: rs(3),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  metaText: {
    fontSize: fs(12),
  },
  empty: {
    textAlign: 'center',
    marginTop: ms(40),
  },
  actionRow: {
    flexDirection: 'row',
    gap: ms(6),
  },
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
});

export default EventTypesScreen;

