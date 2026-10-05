import React, {useCallback, useEffect, useRef, useState} from 'react';
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
    if (!churchNetworkId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchNetworkById(churchNetworkId);
      if (!mountedRef.current) {
        return;
      }
      setName(res?.data?.name || '');
      setPastorLocked(!!res?.data?.pastor_credential_locked);
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
  }, [churchNetworkId]);

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
    <ScreenContainer title={`${t('edit')} ${t('churchNetwork')}`} scroll loading={loading} error={loadError} onRetry={load}>
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
