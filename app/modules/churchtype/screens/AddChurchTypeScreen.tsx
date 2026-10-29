import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {createChurchType} from '../services/churchtype.service';
import {MAX_CHURCH_TYPE_NAME_LENGTH} from '../utils/churchType.utils';
import {useChurchTypeForm} from '../utils/useChurchTypeForm';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {FormActions, FormField, ScreenContainer} from '../../../shared/components/crud';

export const AddChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const {name, nameError, onNameChange, onSave, submitting} = useChurchTypeForm({
    save: value => createChurchType({name: value}),
    successMessage: t('churchTypeCreated'),
    // Back to the list (replacing this form) instead of pushing another list.
    onSaved: () => navigation.popTo('ChurchTypes'),
  });

  return (
    <ScreenContainer title={`${t('addNew')} ${t('churchType')}`} scroll>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchType')}
          error={!!nameError}
          editable={!submitting}
          maxLength={MAX_CHURCH_TYPE_NAME_LENGTH}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onSave}
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormActions onCancel={() => navigation.goBack()} onSave={onSave} submitting={submitting} />
    </ScreenContainer>
  );
};

export default AddChurchTypeScreen;
