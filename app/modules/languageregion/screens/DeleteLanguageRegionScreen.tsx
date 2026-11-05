import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteLanguageRegion,
  getLanguageRegionById,
  listLanguageRegions,
} from '../services/languageregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';
import {childrenOf, regionName} from '../utils/languageRegion.utils';

export const DeleteLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageRegionId: number | undefined = route.params?.languageRegionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // A failed load used to leave "…" with Delete still enabled.
  const [loading, setLoading] = useState(!!languageRegionId);
  const [loadError, setLoadError] = useState<unknown>(null);
  // The API deletes a region that has sub-regions and leaves them pointing
  // at a parent that no longer exists, so that is blocked here.
  const [childCount, setChildCount] = useState(0);
  const [deleteError, setDeleteError] = useState('');
  const mountedRef = useRef(true);
  const submitOnce = useSubmitOnce();
  const {t} = useTranslation();

  const load = useCallback(async () => {
    if (!languageRegionId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, list] = await Promise.all([
        getLanguageRegionById(languageRegionId),
        listLanguageRegions(),
      ]);
      if (mountedRef.current) {
        setName(res?.data ? regionName(res.data) : `#${languageRegionId}`);
        setChildCount(childrenOf(list?.data?.items ?? [], languageRegionId).length);
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
  }, [languageRegionId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = submitOnce(async () => {
    if (!languageRegionId || childCount) {
      return;
    }
    try {
      setSubmitting(true);
      setDeleteError('');
      await deleteLanguageRegion(languageRegionId);
      markDataChanged('languageRegions');
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('languageRegion')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      // In the page, with the API's reason (was a fixed English text).
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
      title={`${t('delete')} ${t('languageRegion')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={!languageRegionId ? t('noDataFound') : undefined}
      onRetry={load}>
      <DeleteConfirmView
        name={name}
        message={`${t('deleteConfirmMessage')} ${t('languageRegionChurchesNotChecked')}`}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!languageRegionId || childCount > 0}
        errorMessage={
          childCount > 0
            ? t('churchRegionHasChildren').replace('{count}', String(childCount))
            : deleteError || undefined
        }
      />
    </ScreenContainer>
  );
};

export default DeleteLanguageRegionScreen;
