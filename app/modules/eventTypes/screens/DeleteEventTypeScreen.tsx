import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteEventType,
  getEventTypeById,
} from '../services/eventType.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
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
      const res = await getEventTypeById(eventTypeId);
      if (mountedRef.current) {
        setName(res?.data?.name || 'this Event Type');
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

  const onConfirm = async () => {
    if (!eventTypeId) return;
    try {
      setSubmitting(true);
      await deleteEventType(eventTypeId);
      Alert.alert(t('success') || 'Success', `${t('delete') || 'Delete'} ${t('eventType') || 'Event Type'} ${t('success') || 'success'}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete Event Type');
    } finally {
      setSubmitting(false);
    }
  };

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
        disabled={!eventTypeId}
      />
    </ScreenContainer>
  );
};

export default DeleteEventTypeScreen;
