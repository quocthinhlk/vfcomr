import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteChurchRegion,
  getChurchRegionById,
  getChurchRegionChildren,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchRegionId: number | undefined = route.params?.churchRegionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!churchRegionId);
  const [loadError, setLoadError] = useState<unknown>(null);
  // The API deletes a region that has sub-regions and leaves them pointing
  // at a parent that no longer exists, so it is blocked here.
  const [childCount, setChildCount] = useState(0);
  const [deleteError, setDeleteError] = useState('');
  const submitOnce = useSubmitOnce();
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!churchRegionId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, children] = await Promise.all([
        getChurchRegionById(churchRegionId),
        getChurchRegionChildren(churchRegionId),
      ]);
      if (mountedRef.current) {
        const data = res?.data?.data || res?.data;
        setName(data?.name?.trim() || `#${churchRegionId}`);
        setChildCount(children.length);
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
  }, [churchRegionId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = submitOnce(async () => {
    if (!churchRegionId || childCount) {
      return;
    }
    try {
      setSubmitting(true);
      setDeleteError('');
      await deleteChurchRegion(churchRegionId);
      markDataChanged('churchRegions');
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchApostolicRegions')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      // Shown in the page with the reason from the API (was a fixed English text).
      if (mountedRef.current) {
        setDeleteError(getApiErrorMessage(e, t));
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('churchApostolicRegions')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!churchRegionId || childCount > 0}
        errorMessage={
          childCount > 0
            ? t('churchRegionHasChildren').replace('{count}', String(childCount))
            : deleteError || undefined
        }
      />
    </ScreenContainer>
  );
};

export default DeleteChurchRegionScreen;
