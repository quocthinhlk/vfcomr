import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {deleteChurchNetwork, getChurchNetworkById} from '../services/churchnetwork.service';
import {churchesBlockingDelete} from '../utils/churchNetwork.utils';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {returnToList} from '../../../shared/utils/returnToList';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {DeleteConfirmView, ScreenContainer} from '../../../shared/components/crud';

export const DeleteChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId = Number(route.params?.churchNetworkId) || undefined;
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(!!churchNetworkId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  // Don't ask to confirm deleting a record we couldn't load (or have no id for).
  const load = useCallback(async () => {
    if (!churchNetworkId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const network = await getChurchNetworkById(churchNetworkId);
      if (mountedRef.current) {
        setName(network?.name || `#${churchNetworkId}`);
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
    // A double tap lands before `submitting` disables the button.
    if (!churchNetworkId || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage('');
    try {
      await deleteChurchNetwork(churchNetworkId);
      markDataChanged('churchNetworks');
      Alert.alert(t('success'), t('churchNetworkDeleted'));
      returnToList(navigation);
    } catch (e) {
      if (!mountedRef.current) {
        return;
      }
      // Networks with churches can't be deleted: say so in the app's language.
      const count = churchesBlockingDelete(e);
      setErrorMessage(
        count !== null
          ? t('churchNetworkInUse').replace('{count}', String(count))
          : getApiErrorMessage(e, t),
      );
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('churchNetwork')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={churchNetworkId ? undefined : t('churchNetworkNotFound')}
      onRetry={churchNetworkId ? load : undefined}>
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
