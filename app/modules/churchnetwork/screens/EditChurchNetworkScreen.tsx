import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getChurchNetworkById,
  updateChurchNetwork,
} from '../services/churchnetwork.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {ScreenContainer} from '../../../shared/components/crud';
import {ChurchNetworkForm} from '../components/ChurchNetworkUI';

export const EditChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pastorLocked, setPastorLocked] = useState(false);
  const [loading, setLoading] = useState(!!churchNetworkId);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (churchNetworkId) {
      getChurchNetworkById(churchNetworkId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || '');
          setPastorLocked(!!res?.data?.pastor_credential_locked);
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
  }, [churchNetworkId]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!churchNetworkId) return;
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateChurchNetwork(churchNetworkId, { name: name.trim(), pastor_credential_locked: pastorLocked });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('churchNetwork')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('edit')} ${t('churchNetwork')}`} scroll loading={loading}>
      <ChurchNetworkForm
        name={name}
        onNameChange={onNameChange}
        locked={pastorLocked}
        onLockedChange={setPastorLocked}
        nameError={nameError}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default EditChurchNetworkScreen;
