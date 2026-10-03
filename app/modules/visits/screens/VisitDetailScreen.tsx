import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {getVisitById} from '../services/visit.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {VisitItem} from '../services/visit.service';
import api from '../../../config/api';
import {getIsoWeekDateRangeLabelFull} from '../../../shared/utils/isoWeek';
import {
  DetailActions,
  DetailCard,
  DetailRow,
  ListEmptyState,
  ScreenContainer,
} from '../../../shared/components/crud';

export const VisitDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId: number | undefined = route.params?.visitId;
  const [visit, setVisit] = useState<VisitItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (visitId) {
      getVisitById(visitId)
        .then(async res => {
          if (!mounted) {
            return;
          }
          const visitData = res?.data || null;
          setVisit(visitData);

          // Fetch church name
          if (visitData?.church_id) {
            try {
              const churchRes = await api.get(`churches/${visitData.church_id}`);
              const churchData = churchRes?.data?.data;
              if (churchData?.name && mounted) {
                setChurchName(churchData.name);
              }
            } catch (e) {
              console.error('Error fetching church info:', e);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [visitId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const heroTitle = useMemo(() => {
    if (!visit) return '';
    return getIsoWeekDateRangeLabelFull(visit.year, visit.week_number);
  }, [t, visit]);

  return (
    <ScreenContainer title={t('visitDetail') || 'Visit Detail'} loading={loading} scroll>
      {!visit ? (
        <ListEmptyState />
      ) : (
        <>
          <DetailCard title={heroTitle}>
            <DetailRow
              label={t('churchName') || 'Church'}
              value={visit.church_name ?? churchName ?? String(visit.church_id)}
            />
            <DetailRow
              label={t('userName') || 'Name'}
              value={visit.user_name ?? String(visit.user_id)}
            />
            <DetailRow
              label={t('numberOfDays') || 'Number of Days'}
              value={visit.number_of_days}
            />
            <DetailRow label={t('created') || 'Created'} value={formatDate(visit.Created)} />
            <DetailRow label={t('modified') || 'Modified'} value={formatDate(visit.Modified)} />
          </DetailCard>
          <DetailActions
            itemName={heroTitle}
            onEdit={() => navigation.navigate('EditVisit', {visitId: visit.id})}
          />
        </>
      )}
    </ScreenContainer>
  );
};

export default VisitDetailScreen;

