import React, {useEffect, useState} from 'react';
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
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (eventTypeId) {
      getEventTypeById(eventTypeId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this Event Type');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [eventTypeId]);

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
    <ScreenContainer title={`${t('delete') || 'Delete'} ${t('eventType') || 'Event Type'}`} scroll>
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
