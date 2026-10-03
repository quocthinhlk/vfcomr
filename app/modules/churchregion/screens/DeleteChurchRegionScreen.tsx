import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteChurchRegion,
  getChurchRegionById,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchRegionId: number | undefined = route.params?.churchRegionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (churchRegionId) {
      getChurchRegionById(churchRegionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const data = res?.data?.data || res?.data;
          setName(data?.name || 'this region');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [churchRegionId]);

  const onConfirm = async () => {
    if (!churchRegionId) return;
    try {
      setSubmitting(true);
      await deleteChurchRegion(churchRegionId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchApostolicRegions')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete church region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('delete')} ${t('churchApostolicRegions')}`} scroll>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!churchRegionId}
      />
    </ScreenContainer>
  );
};

export default DeleteChurchRegionScreen;
