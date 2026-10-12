import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteGeographicalRegion,
  getGeographicalRegionAncestors,
  GeographicalRegionItem,
  hasChildRegions,
} from '../services/geographicalregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

/**
 * Confirms DELETE geographical-regions/{id}. Shows the region's full path
 * (from its ancestors) so a same-named region elsewhere is not deleted by mistake.
 */
export const DeleteGeographicalRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const region: GeographicalRegionItem | undefined = route.params?.region;

  const [label, setLabel] = useState(region?.name ?? '');
  const [loading, setLoading] = useState(!!region);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const mountedRef = useRef(true);

  // Don't ask to confirm a delete we could not check (e.g. offline).
  const load = useCallback(async () => {
    if (!region) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const ancestors = await getGeographicalRegionAncestors(region.id);
      if (mountedRef.current) {
        setLabel(
          [...ancestors.filter(a => a.id !== region.id).map(a => a.name), region.name].join(' › '),
        );
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
  }, [region]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = async () => {
    if (!region) {
      return;
    }
    try {
      setSubmitting(true);
      setDeleteError('');
      await deleteGeographicalRegion(region.id);
      Alert.alert(
        t('success') || 'Success',
        `${t('delete')} ${t('geographicalRegion')} ${t('success')}`,
      );
      returnToList(navigation);
    } catch (e) {
      // e.g. the API refuses to delete a region that still has sub-regions.
      setDeleteError(getApiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('geographicalRegion')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={label}
        message={
          region && hasChildRegions(region)
            ? `${t('deleteConfirmMessage')} ${t('geoRegionHasChildren')}`
            : undefined
        }
        errorMessage={deleteError}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!region}
      />
    </ScreenContainer>
  );
};

export default DeleteGeographicalRegionScreen;
