import React, {useEffect, useState} from 'react';
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
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (churchTypeId) {
      getChurchTypeById(churchTypeId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this church type');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [churchTypeId]);

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
    <ScreenContainer title={`${t('delete')} ${t('churchType')}`} scroll>
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
