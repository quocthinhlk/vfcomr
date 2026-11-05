import React, {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  LANGUAGE_NAME_MAX,
  createLanguage,
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
import {
  cleanLanguageName,
  isDuplicateNameError,
  validateLanguageName,
} from '../utils/language.utils';
import {useLanguageNameMessage} from '../utils/useLanguageNameMessage';

export const AddLanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const messageFor = useLanguageNameMessage();
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
    // Shown under the field (was an "Validation" alert with no field marked).
    const error = validateLanguageName(name);
    if (error) {
      setNameError(messageFor(error));
      return;
    }
    try {
      setSubmitting(true);
      await createLanguage({name: cleanLanguageName(name)});
      markDataChanged('languages');
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('language')} ${t('success')}`);
      // React Navigation 7's navigate pushes a second list on top, so Back
      // reopened the filled form.
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'Languages') && navigation.popTo) {
        navigation.popTo('Languages', params);
      } else if (navigation.replace) {
        navigation.replace('Languages', params);
      } else {
        navigation.navigate('Languages', params);
      }
    } catch (e: any) {
      if (isDuplicateNameError(e)) {
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
    <ScreenContainer title={`${t('addNew')} ${t('language')}`} scroll>
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

export default AddLanguageScreen;
