import React, {useEffect, useState} from 'react';
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
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (countryId) {
      getCountryById(countryId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || '');
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [countryId]);

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
    <ScreenContainer title={`${t('edit')} ${t('country')}`} scroll loading={loading}>
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
