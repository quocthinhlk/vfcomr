import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {getCountryById, updateCountry} from '../services/country.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

export const EditCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const countryId: number | undefined = route.params?.countryId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!countryId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Named so the error state's "Try again" can re-run it.
  const load = useCallback(async () => {
    if (!countryId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getCountryById(countryId);
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
  }, [countryId]);

  useEffect(() => {
    load();
  }, [load]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!countryId) return;
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateCountry(countryId, { name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('country')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update country');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('edit')} ${t('country')}`} scroll loading={loading} error={loadError} onRetry={load}>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('country')}
          error={!!nameError}
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

export default EditCountryScreen;
