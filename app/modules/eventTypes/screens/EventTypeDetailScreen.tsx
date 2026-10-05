import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {getEventTypeById, EventTypeItem, resolveEventMeetingType} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {
  DetailActions,
  DetailCard,
  DetailRow,
  ListEmptyState,
  ScreenContainer,
} from '../../../shared/components/crud';

const ColorValue: React.FC<{color?: string | null}> = ({color}) => {
  const C = useThemedColors();
  return (
    <View style={styles.colorRow}>
      <View
        style={[
          styles.colorBox,
          {backgroundColor: color || undefined, borderColor: C.inputBorder},
        ]}
      />
      <Text style={[styles.colorValue, {color: C.textPrimary}]}>
        {color || '-'}
      </Text>
    </View>
  );
};

export const EventTypeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventTypeId: number | undefined = route.params?.eventTypeId;
  const [eventType, setEventType] = useState<EventTypeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const loadEventType = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!eventTypeId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getEventTypeById(eventTypeId);
      if (requestId !== requestRef.current) {
        return;
      }
      setEventType(res?.data || null);
      setLoadError(null);
    } catch (e) {
      if (requestId === requestRef.current) {
        console.error('Error fetching event type:', e);
        setLoadError(e);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [eventTypeId]);

  useEffect(() => {
    loadEventType();
    return () => {
      // Invalidate the in-flight request on unmount / param change.
      requestRef.current += 1;
    };
    // refetchKey is set by returnAfterEdit, so the detail refreshes after editing.
  }, [loadEventType, route.params?.refetchKey]);

  return (
    <ScreenContainer
      title={t('eventTypeDetail') || 'Event Type Detail'}
      loading={loading}
      error={loadError}
      onRetry={loadEventType}
      scroll>
      {!eventType ? (
        <ListEmptyState title={t('noDataFound') || 'No data found'} />
      ) : (
        <>
          <DetailCard title={eventType.name}>
            <DetailRow label={t('textColour') || 'Text Colour'}>
              <ColorValue color={eventType.color} />
            </DetailRow>
            <DetailRow label={t('reportCellColour') || 'Report Cell Colour'}>
              <ColorValue color={eventType.cell_color} />
            </DetailRow>
            <DetailRow
              label={t('meetingType') || 'Meeting Type'}
              value={
                resolveEventMeetingType(eventType.meeting_type) === 'meeting_with'
                  ? t('eventMeetingWith') || 'Meeting With'
                  : t('eventAttendance') || 'Attendance'
              }
            />
          </DetailCard>
          <DetailActions
            itemName={eventType.name}
            onEdit={() => navigation.navigate('EditEventType', {eventTypeId})}
            onDelete={() => navigation.navigate('DeleteEventType', {eventTypeId})}
          />
        </>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  colorBox: {
    width: ms(24),
    height: ms(24),
    borderRadius: rs(6),
    borderWidth: 1,
  },
  colorValue: {
    fontSize: fs(14),
    fontWeight: '500',
    fontFamily: 'monospace',
  },
});

export default EventTypeDetailScreen;
