import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getLanguageById,
  updateLanguage,
} from '../services/language.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

export const EditLanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageId: number | undefined = route.params?.languageId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!languageId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

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
      if (!mountedRef.current) {
        return;
      }
      setName(res?.data?.name || '');
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

  const onSave = async () => {
    if (!languageId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateLanguage(languageId, { name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('language')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update language');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('edit')} ${t('language')}`} scroll loading={loading} error={loadError} onRetry={load}>
      <FormField label={t('name')} required>
        <AppInput
          value={name}
          onChangeText={setName}
          placeholder={t('language')}
          editable={!submitting}
          returnKeyType="done"
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
