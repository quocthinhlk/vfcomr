import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteLanguage,
  getLanguageById,
  getLanguageFaqCount,
} from '../services/language.service';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
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
  // The API deletes a language its FAQs still use and leaves them without
  // one, so that is blocked here.
  const [faqCount, setFaqCount] = useState(0);
  const [deleteError, setDeleteError] = useState('');
  const submitOnce = useSubmitOnce();
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
      const [res, faqs] = await Promise.all([
        getLanguageById(languageId),
        getLanguageFaqCount(languageId),
      ]);
      if (mountedRef.current) {
        setName(res?.data?.name?.trim() || `#${languageId}`);
        setFaqCount(faqs);
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

  const onConfirm = submitOnce(async () => {
    if (!languageId || faqCount) {
      return;
    }
    try {
      setSubmitting(true);
      setDeleteError('');
      await deleteLanguage(languageId);
      markDataChanged('languages');
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('language')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      // In the page, with the API's reason (was a fixed English text).
      if (mountedRef.current) {
        setDeleteError(getApiErrorMessage(e, t));
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('language')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        message={`${t('deleteConfirmMessage')} ${t('languageChurchesNotChecked')}`}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!languageId || faqCount > 0}
        errorMessage={
          faqCount > 0
            ? t('languageInUse').replace('{faqs}', String(faqCount))
            : deleteError || undefined
        }
      />
    </ScreenContainer>
  );
};

export default DeleteLanguageScreen;
