import React, {useCallback, useState} from 'react';
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!worshipServiceId) {
          if (!cancelled) {
            setService(null);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setLoading(true);
        }
        try {
          const res = await getWorshipServiceById(worshipServiceId);
          if (!cancelled) {
            setService(res?.data ?? null);
          }
        } catch {
          if (!cancelled) {
            setService(null);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [worshipServiceId]),
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
