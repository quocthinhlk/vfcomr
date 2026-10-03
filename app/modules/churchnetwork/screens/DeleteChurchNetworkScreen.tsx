import React, {useEffect, useState} from 'react';
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
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (churchNetworkId) {
      getChurchNetworkById(churchNetworkId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this church network');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [churchNetworkId]);

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
    <ScreenContainer title={`${t('delete')} ${t('churchNetwork')}`} scroll>
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
