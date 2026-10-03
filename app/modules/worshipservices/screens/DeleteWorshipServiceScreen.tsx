import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteWorshipService,
  getWorshipServiceById,
} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteWorshipServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (worshipServiceId) {
      getWorshipServiceById(worshipServiceId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this worship service');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [worshipServiceId]);

  const onConfirm = async () => {
    if (!worshipServiceId) return;
    try {
      setSubmitting(true);
      await deleteWorshipService(worshipServiceId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('worshipService') || 'Worship Service'} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete worship service');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('worshipService') || 'Worship Service'}`}
      scroll>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!worshipServiceId}
      />
    </ScreenContainer>
  );
};

export default DeleteWorshipServiceScreen;
