import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteChurchType,
  getChurchTypeById,
} from '../services/churchtype.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchTypeId: number | undefined = route.params?.churchTypeId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!churchTypeId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!churchTypeId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchTypeById(churchTypeId);
      if (mountedRef.current) {
        setName(res?.data?.name || 'this church type');
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
  }, [churchTypeId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = async () => {
    if (!churchTypeId) return;
    try {
      setSubmitting(true);
      await deleteChurchType(churchTypeId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchType')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete church type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('churchType')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!churchTypeId}
      />
    </ScreenContainer>
  );
};

export default DeleteChurchTypeScreen;
