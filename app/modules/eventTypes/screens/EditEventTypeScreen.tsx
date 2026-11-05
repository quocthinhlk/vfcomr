import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getEventTypeById,
  listEventTypes,
  updateEventType,
} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {ScreenContainer} from '../../../shared/components/crud';
import EventTypeForm from '../components/EventTypeForm';
import {
  EventTypeFormErrors,
  EventTypeFormValues,
  buildEventTypePayload,
  strictMeetingType,
  validateEventTypeForm,
} from '../utils/eventType.utils';

export const EditEventTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventTypeId: number | undefined = route.params?.eventTypeId;
  const {t} = useTranslation();
  const [values, setValues] = useState<EventTypeFormValues>({
    name: '',
    color: '',
    cellColor: '',
    meetingType: null,
  });
  const [errors, setErrors] = useState<EventTypeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  // One save at a time: a fast double tap sent the update twice.
  const submitOnce = useSubmitOnce();

  const loadEventType = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!eventTypeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getEventTypeById(eventTypeId);
      if (requestId !== requestRef.current) {
        return;
      }
      const item = res?.data;
      if (!item) {
        throw new Error('');
      }
      // Saved values as they are: a bad colour shows as the invalid text
      // (to fix) instead of being replaced by grey without telling the user.
      setValues({
        name: item.name || '',
        color: item.color || '',
        cellColor: item.cell_color || '',
        meetingType: strictMeetingType(item.meeting_type),
      });
    } catch (e) {
      if (requestId === requestRef.current) {
        console.error('Error fetching event type:', e);
        // Never show a blank form the user could save over real data.
        setLoadError(e);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [eventTypeId]);

  useEffect(() => {
    mountedRef.current = true;
    loadEventType();
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, [loadEventType]);

  const onChange = useCallback(
    <K extends keyof EventTypeFormValues>(key: K, value: EventTypeFormValues[K]) => {
      setValues(prev => ({...prev, [key]: value}));
      setErrors(prev => (prev[key] ? {...prev, [key]: undefined} : prev));
    },
    [],
  );

  const onSave = submitOnce(async () => {
    if (!eventTypeId || loadError) {
      return;
    }
    const local = validateEventTypeForm(values);
    setErrors(local);
    if (Object.keys(local).length) {
      return;
    }
    try {
      setSubmitting(true);
      const existing = (await listEventTypes())?.data ?? [];
      const withDuplicates = validateEventTypeForm(values, existing, eventTypeId);
      if (withDuplicates.name) {
        setErrors(withDuplicates);
        return;
      }
      await updateEventType(eventTypeId, buildEventTypePayload(values));
      markDataChanged('eventTypes');
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('eventType') || 'Event Type'} ${t('success') || 'success'}`,
      );
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('edit') || 'Edit'} ${t('eventType') || 'Event Type'}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={!loading && !eventTypeId ? t('noDataFound') : undefined}
      onRetry={loadEventType}>
      <EventTypeForm
        values={values}
        errors={errors}
        onChange={onChange}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default EditEventTypeScreen;
