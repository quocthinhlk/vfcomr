import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteVisit,
  getVisitById,
} from '../services/visit.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteVisitScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId: number | undefined = route.params?.visitId;
  const [visitInfo, setVisitInfo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!visitId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!visitId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getVisitById(visitId);
      if (mountedRef.current) {
        const visit = res?.data;
        setVisitInfo(
          visit
            ? `${t('year') || 'Year'} ${visit.year} • ${t('week') || 'Week'} ${visit.week_number}`
            : t('visit') || 'this Visit',
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
  }, [visitId, t]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onConfirm = async () => {
    if (!visitId) return;
    try {
      setSubmitting(true);
      await deleteVisit(visitId);
      Alert.alert(
        t('success') || 'Success',
        `${t('delete') || 'Delete'} ${t('visit') || 'Visit'} ${t('success') || 'success'}`,
      );
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', t('failedToDeleteVisit') || 'Failed to delete Visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete') || 'Delete'} ${t('visit') || 'Visit'}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <DeleteConfirmView
        name={visitInfo}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!visitId}
      />
    </ScreenContainer>
  );
};

export default DeleteVisitScreen;

