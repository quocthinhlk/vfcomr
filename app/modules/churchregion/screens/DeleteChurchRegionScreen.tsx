import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteChurchRegion,
  getChurchRegionById,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
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
      const res = await getChurchRegionById(churchRegionId);
      if (mountedRef.current) {
        const data = res?.data?.data || res?.data;
        setName(data?.name || 'this region');
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

  const onConfirm = async () => {
    if (!churchRegionId) return;
    try {
      setSubmitting(true);
      await deleteChurchRegion(churchRegionId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchApostolicRegions')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete church region');
    } finally {
      setSubmitting(false);
    }
  };

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
        disabled={!churchRegionId}
      />
    </ScreenContainer>
  );
};

export default DeleteChurchRegionScreen;
