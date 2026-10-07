import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteChurchNetwork,
  getChurchNetworkById,
} from '../services/churchnetwork.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(!!churchNetworkId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!churchNetworkId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchNetworkById(churchNetworkId);
      if (mountedRef.current) {
        setName(res?.data?.name || 'this church network');
      }
    } catch (e) {
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
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = async () => {
    if (!churchNetworkId) return;
    try {
      setSubmitting(true);
      setErrorMessage('');
      await deleteChurchNetwork(churchNetworkId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchNetwork')} ${t('success')}`);
      returnToList(navigation);
    } catch (e: any) {
      const detail = e?.response?.data?.errors?.detail;
      setErrorMessage(
        (typeof detail === 'string' && detail.trim()) || getApiErrorMessage(e, t),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('churchNetwork')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!churchNetworkId}
        errorMessage={errorMessage}
      />
    </ScreenContainer>
  );
};

export default DeleteChurchNetworkScreen;
