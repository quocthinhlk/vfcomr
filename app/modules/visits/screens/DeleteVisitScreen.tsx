import React, {useEffect, useState} from 'react';
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
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    if (visitId) {
      getVisitById(visitId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const visit = res?.data;
          if (visit) {
            setVisitInfo(
              `${t('year') || 'Year'} ${visit.year} • ${t('week') || 'Week'} ${visit.week_number}`,
            );
          } else {
            setVisitInfo(t('visit') || 'this Visit');
          }
        })
        .catch(() => {
          if (mounted) {
            setVisitInfo(t('visit') || 'this Visit');
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [visitId, t]);

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
    <ScreenContainer title={`${t('delete') || 'Delete'} ${t('visit') || 'Visit'}`} scroll>
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

