import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {createChurchNetwork} from '../services/churchnetwork.service';
import {useChurchNetworkForm} from '../utils/useChurchNetworkForm';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {ScreenContainer} from '../../../shared/components/crud';
import {ChurchNetworkForm} from '../components/ChurchNetworkUI';

export const AddChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const form = useChurchNetworkForm({
    save: createChurchNetwork,
    successMessage: t('churchNetworkCreated'),
    // Back to the list (replacing this form) instead of pushing another list.
    onSaved: () => navigation.popTo('ChurchNetworks'),
  });

  return (
    <ScreenContainer title={`${t('addNew')} ${t('churchNetwork')}`} scroll>
      <ChurchNetworkForm
        name={form.name}
        onNameChange={form.onNameChange}
        locked={form.locked}
        onLockedChange={form.setLocked}
        nameError={form.nameError}
        submitting={form.submitting}
        onSave={form.onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default AddChurchNetworkScreen;
