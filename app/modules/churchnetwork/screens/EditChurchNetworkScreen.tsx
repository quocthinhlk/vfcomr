import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {getChurchNetworkById, updateChurchNetwork} from '../services/churchnetwork.service';
import {useChurchNetworkForm} from '../utils/useChurchNetworkForm';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {ScreenContainer} from '../../../shared/components/crud';
import {ChurchNetworkForm} from '../components/ChurchNetworkUI';

export const EditChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId = Number(route.params?.churchNetworkId) || undefined;
  const {t} = useTranslation();
  const [loading, setLoading] = useState(!!churchNetworkId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const form = useChurchNetworkForm({
    selfId: churchNetworkId,
    save: payload => updateChurchNetwork(churchNetworkId as number, payload),
    successMessage: t('churchNetworkUpdated'),
    onSaved: () => returnAfterEdit(navigation),
  });
  const {setName, setLocked} = form;

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
      const network = await getChurchNetworkById(churchNetworkId);
      if (mountedRef.current) {
        setName(network?.name ?? '');
        setLocked(!!network?.pastor_credential_locked);
      }
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
  }, [churchNetworkId, setName, setLocked]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('churchNetwork')}`}
      scroll
      loading={loading}
      error={loadError}
      // No id: an error state, never a blank form whose Save does nothing.
      errorMessage={churchNetworkId ? undefined : t('churchNetworkNotFound')}
      onRetry={churchNetworkId ? load : undefined}>
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

export default EditChurchNetworkScreen;
