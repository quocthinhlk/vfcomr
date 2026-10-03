import React from 'react';
import {View} from 'react-native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormDivider,
  FormField,
  FormSwitchRow,
  StatusBadge,
} from '../../../shared/components/crud';
import {LockIcon, UnlockIcon} from '../../../shared/components/icons/UiIcons';

export const CredentialBadge: React.FC<{locked: boolean}> = ({locked}) => {
  const {t} = useTranslation();
  return locked ? (
    <StatusBadge label={t('credentialLocked')} tone="warning" icon={LockIcon} />
  ) : (
    <StatusBadge label={t('credentialUnlocked')} tone="success" icon={UnlockIcon} />
  );
};

type FormProps = {
  name: string;
  onNameChange: (value: string) => void;
  locked: boolean;
  onLockedChange: (value: boolean) => void;
  nameError?: string;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export const ChurchNetworkForm: React.FC<FormProps> = ({
  name,
  onNameChange,
  locked,
  onLockedChange,
  nameError,
  submitting,
  onSave,
  onCancel,
}) => {
  const {t} = useTranslation();
  return (
    <View>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchNetwork')}
          error={!!nameError}
          editable={!submitting}
          returnKeyType="done"
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormDivider />
      <FormSwitchRow
        label={t('pastorCredentialLocked')}
        value={locked}
        onValueChange={onLockedChange}
        disabled={submitting}
        description={<CredentialBadge locked={locked} />}
      />
      <FormActions onCancel={onCancel} onSave={onSave} submitting={submitting} />
    </View>
  );
};
