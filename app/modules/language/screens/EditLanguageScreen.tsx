import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  LANGUAGE_NAME_MAX,
  getLanguageById,
  listAllLanguages,
  updateLanguage,
} from '../services/language.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {cleanLanguageName, validateLanguageName} from '../utils/language.utils';
import {useLanguageNameMessage} from '../utils/useLanguageNameMessage';

export const EditLanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageId: number | undefined = route.params?.languageId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!languageId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [nameError, setNameError] = useState('');
  const mountedRef = useRef(true);
  const {t} = useTranslation();
  const messageFor = useLanguageNameMessage();
  // One save at a time: a fast double tap sent the update twice.
  const submitOnce = useSubmitOnce();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Named so the error state's "Try again" can re-run it.
  const load = useCallback(async () => {
    if (!languageId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getLanguageById(languageId);
      if (mountedRef.current) {
        setName(res?.data?.name || '');
      }
    } catch (e) {
      // Without the record the form would be blank: show a retryable error.
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
    load();
  }, [load]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      setNameError('');
    }
  };

  const onSave = submitOnce(async () => {
    if (!languageId) {
      return;
    }
    const local = validateLanguageName(name);
    if (local) {
      setNameError(messageFor(local));
      return;
    }
    try {
      setSubmitting(true);
      // The API does not check duplicates on update (a rename to "English"
      // saved a second English).
      const duplicate = validateLanguageName(name, await listAllLanguages(), languageId);
      if (duplicate) {
        setNameError(messageFor(duplicate));
        return;
      }
      await updateLanguage(languageId, {name: cleanLanguageName(name)});
      markDataChanged('languages');
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('language')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      // The API's reason instead of a fixed English text.
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('language')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={!languageId ? t('noDataFound') : undefined}
      onRetry={load}>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('language')}
          error={!!nameError}
          editable={!submitting}
          maxLength={LANGUAGE_NAME_MAX}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onSave}
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormActions
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        submitting={submitting}
      />
    </ScreenContainer>
  );
};

export default EditLanguageScreen;
