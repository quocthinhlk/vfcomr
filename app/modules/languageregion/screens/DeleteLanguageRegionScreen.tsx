import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteLanguageRegion,
  getLanguageRegionById,
} from '../services/languageregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageRegionId: number | undefined = route.params?.languageRegionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (languageRegionId) {
      getLanguageRegionById(languageRegionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this language region');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [languageRegionId]);

  const onConfirm = async () => {
    if (!languageRegionId) return;
    try {
      setSubmitting(true);
      await deleteLanguageRegion(languageRegionId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('languageRegion')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete language region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('delete')} ${t('languageRegion')}`} scroll>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!languageRegionId}
      />
    </ScreenContainer>
  );
};

export default DeleteLanguageRegionScreen;
