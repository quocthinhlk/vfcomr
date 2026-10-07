import React, {useCallback, useEffect, useRef, useState} from 'react';
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
  const [loading, setLoading] = useState(!!languageId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!languageId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getLanguageById(languageId);
      if (mountedRef.current) {
        setName(res?.data?.name || 'this language');
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
  }, [languageId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

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
    <ScreenContainer
      title={`${t('delete')} ${t('language')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
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
