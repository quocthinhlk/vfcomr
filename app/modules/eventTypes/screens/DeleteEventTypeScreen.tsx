import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteEventType,
  getEventTypeById,
  isEventTypeInUse,
} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteEventTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventTypeId: number | undefined = route.params?.eventTypeId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!eventTypeId);
  const [loadError, setLoadError] = useState<unknown>(null);
  // The API deletes a type that events still use; those events then lose
  // their type and their colours in the reports. Blocked here.
  const [inUse, setInUse] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const submitOnce = useSubmitOnce();
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!eventTypeId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, used] = await Promise.all([
        getEventTypeById(eventTypeId),
        isEventTypeInUse(eventTypeId),
      ]);
      if (mountedRef.current) {
        setName(res?.data?.name?.trim() || `#${eventTypeId}`);
        setInUse(used);
      }
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [eventTypeId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = submitOnce(async () => {
    if (!eventTypeId || inUse) {
      return;
    }
    try {
      setSubmitting(true);
      setDeleteError('');
      await deleteEventType(eventTypeId);
      markDataChanged('eventTypes');
      Alert.alert(
        t('success') || 'Success',
        `${t('delete') || 'Delete'} ${t('eventType') || 'Event Type'} ${t('success') || 'success'}`,
      );
      returnToList(navigation);
    } catch (e) {
      // In the page, with the API's reason (was a fixed English text).
      if (mountedRef.current) {
        setDeleteError(getApiErrorMessage(e, t));
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('delete') || 'Delete'} ${t('eventType') || 'Event Type'}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!eventTypeId || inUse}
        errorMessage={inUse ? t('eventTypeInUse') : deleteError || undefined}
      />
    </ScreenContainer>
  );
};

export default DeleteEventTypeScreen;
