import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteChurchPlantingProjection,
  getChurchPlantingProjectionById,
} from '../services/churchPlantingProjection.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteChurchPlantingProjectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectionId: number | undefined = route.params?.projectionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!projectionId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!projectionId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchPlantingProjectionById(projectionId);
      if (mountedRef.current) {
        setName(res?.data?.proposed_church_name || 'this Church Planting Projection');
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
  }, [projectionId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = async () => {
    if (!projectionId) return;
    try {
      setSubmitting(true);
      await deleteChurchPlantingProjection(projectionId);
      Alert.alert(
        t('success') || 'Success',
        `${t('delete') || 'Delete'} ${t('churchPlantingProjection') || 'Church Planting Projection'} ${t('success') || 'success'}`,
      );
      returnToList(navigation);
    } catch (e) {
      Alert.alert(
        t('error') || 'Error',
        t('failedToDeleteProjection') || 'Failed to delete Church Planting Projection',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete') || 'Delete'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!projectionId}
      />
    </ScreenContainer>
  );
};

export default DeleteChurchPlantingProjectionScreen;

