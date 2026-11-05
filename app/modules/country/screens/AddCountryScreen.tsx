import React, {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {COUNTRY_NAME_MAX, createCountry} from '../services/country.service';
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
import {
  cleanCountryName,
  isDuplicateNameError,
  validateCountryName,
} from '../utils/country.utils';
import {useCountryNameMessage} from '../utils/useCountryNameMessage';

export const AddCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const messageFor = useCountryNameMessage();
  // One save at a time: a fast double tap sent two creates.
  const submitOnce = useSubmitOnce();
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      setNameError('');
    }
  };

  const onSave = submitOnce(async () => {
    const error = validateCountryName(name);
    if (error) {
      setNameError(messageFor(error));
      return;
    }
    try {
      setSubmitting(true);
      await createCountry({name: cleanCountryName(name)});
      markDataChanged('countries');
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('country')} ${t('success')}`);
      // React Navigation 7's navigate pushes a second list on top, so Back
      // reopened the filled form.
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'Countries') && navigation.popTo) {
        navigation.popTo('Countries', params);
      } else if (navigation.replace) {
        navigation.replace('Countries', params);
      } else {
        navigation.navigate('Countries', params);
      }
    } catch (e: any) {
      if (isDuplicateNameError(e)) {
        // Under the field, so the name can be corrected right there.
        setNameError(messageFor('duplicate'));
      } else {
        Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer title={`${t('addNew')} ${t('country')}`} scroll>
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

export default AddCountryScreen;
