import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createChurchType} from '../services/churchtype.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

export const AddChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await createChurchType({ name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('churchType')} ${t('success')}`);
      navigation.navigate('ChurchTypes', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || t('failedToCreateChurch') || 'Failed to create church type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('addNew')} ${t('churchType')}`} scroll>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchType')}
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

export default AddChurchTypeScreen;
