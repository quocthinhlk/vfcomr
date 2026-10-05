import React, {useCallback, useRef, useState} from 'react';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {
  getWorshipServiceById,
  WorshipServiceItem,
} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {
  DetailActions,
  DetailCard,
  DetailRow,
  ListEmptyState,
  ScreenContainer,
} from '../../../shared/components/crud';

export const WorshipServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [service, setService] = useState<WorshipServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();

  const formatTime = (timeString: string) => {
    if (!timeString) {
      return '—';
    }
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const formatCreated = (iso: string) => {
    if (!iso) {
      return '—';
    }
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) {
        return iso;
      }
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const loadService = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    if (!worshipServiceId) {
      setService(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getWorshipServiceById(worshipServiceId);
      if (isCurrent()) {
        setService(res?.data ?? null);
        setLoadError(null);
      }
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching worship service:', e);
        // Keep what is on screen; the error state shows only when there is nothing.
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [worshipServiceId]);

  useFocusEffect(
    useCallback(() => {
      loadService();
      return () => {
        requestRef.current += 1;
      };
    }, [loadService]),
  );

  const handleEdit = () => {
    if (worshipServiceId) {
      navigation.navigate('EditWorshipService', {worshipServiceId});
    }
  };

  const handleDelete = () => {
    if (worshipServiceId) {
      navigation.navigate('DeleteWorshipService', {worshipServiceId});
    }
  };

  return (
    <ScreenContainer
      title={t('worshipServiceDetail') || 'Worship Service Detail'}
      loading={loading}
      error={service ? null : loadError}
      onRetry={loadService}
      scroll>
      {!service ? (
        <ListEmptyState title={t('noDataFound') || 'No data found'} />
      ) : (
        <>
          <DetailCard title={service.name}>
            <DetailRow label={t('day') || 'Day'} value={service.day_name || '—'} />
            <DetailRow label={t('time') || 'Time'} value={formatTime(service.time)} />
            <DetailRow
              label={t('created') || 'Created'}
              value={formatCreated(service.created)}
            />
          </DetailCard>
          <DetailActions
            itemName={service.name}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </ScreenContainer>
  );
};

export default WorshipServiceDetailScreen;
