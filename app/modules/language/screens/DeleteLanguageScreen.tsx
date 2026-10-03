import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteLanguage,
  getLanguageById,
} from '../services/language.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteLanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageId: number | undefined = route.params?.languageId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (languageId) {
      getLanguageById(languageId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this language');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [languageId]);

  const onConfirm = async () => {
    if (!languageId) return;
    try {
      setSubmitting(true);
      await deleteLanguage(languageId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('language')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete language');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('delete')} ${t('language')}`} scroll>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!languageId}
      />
    </ScreenContainer>
  );
};

export default DeleteLanguageScreen;
