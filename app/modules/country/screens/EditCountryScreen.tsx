import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  COUNTRY_NAME_MAX,
  findCountryByName,
  getCountryById,
  updateCountry,
} from '../services/country.service';
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
import {cleanCountryName, validateCountryName} from '../utils/country.utils';
import {useCountryNameMessage} from '../utils/useCountryNameMessage';

export const EditCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const countryId: number | undefined = route.params?.countryId;
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!countryId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const messageFor = useCountryNameMessage();
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
      setSavedName(res?.data?.name || '');
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
    if (nameError) {
      setNameError('');
    }
  };

  const onSave = submitOnce(async () => {
    if (!countryId) {
      return;
    }
    const error = validateCountryName(name);
    if (error) {
      setNameError(messageFor(error));
      return;
    }
    const cleaned = cleanCountryName(name);
    try {
      setSubmitting(true);
      // The API does not check duplicates on update (it saved a second
      // "Vietnam"), so look for another country with this name first.
      if (cleaned.toLowerCase() !== savedName.trim().toLowerCase()) {
        const other = await findCountryByName(cleaned, countryId);
        if (other) {
          setNameError(messageFor('duplicate'));
          return;
        }
      }
      await updateCountry(countryId, {name: cleaned});
      markDataChanged('countries');
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('country')} ${t('success')}`);
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
      title={`${t('edit')} ${t('country')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={!countryId ? t('noDataFound') : undefined}
      onRetry={load}>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('country')}
          error={!!nameError}
          editable={!submitting}
          maxLength={COUNTRY_NAME_MAX}
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

export default EditCountryScreen;
