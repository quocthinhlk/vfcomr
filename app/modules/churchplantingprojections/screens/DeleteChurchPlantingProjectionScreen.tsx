import React, {useEffect, useState} from 'react';
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
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (projectionId) {
      getChurchPlantingProjectionById(projectionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.proposed_church_name || 'this Church Planting Projection');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [projectionId]);

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
      scroll>
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

