import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {deleteChurchType, getChurchTypeById} from '../services/churchtype.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import {DeleteConfirmView, ScreenContainer} from '../../../shared/components/crud';

export const DeleteChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchTypeId = Number(route.params?.churchTypeId) || undefined;
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [deleteError, setDeleteError] = useState('');
  const [loading, setLoading] = useState(!!churchTypeId);
  // Don't ask to confirm deleting a record we couldn't load (or have no id for).
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!churchTypeId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchTypeById(churchTypeId);
      if (mountedRef.current) {
        setName(res?.data?.name || `#${churchTypeId}`);
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
  }, [churchTypeId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = async () => {
    // A double tap lands before `submitting` disables the button.
    if (!churchTypeId || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setDeleteError('');
    try {
      await deleteChurchType(churchTypeId);
      markDataChanged('churchTypes');
      Alert.alert(t('success'), t('churchTypeDeleted'));
      returnToList(navigation);
    } catch (e) {
      // Shown on the screen, with the API's reason (e.g. already deleted).
      if (mountedRef.current) {
        setDeleteError(getApiErrorMessage(e, t));
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('churchType')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={churchTypeId ? undefined : t('churchTypeNotFound')}
      onRetry={churchTypeId ? load : undefined}>
      <DeleteConfirmView
        name={name}
        message={t('deleteChurchTypeConfirm')}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!churchTypeId}
        errorMessage={deleteError}
      />
    </ScreenContainer>
  );
};

export default DeleteChurchTypeScreen;
