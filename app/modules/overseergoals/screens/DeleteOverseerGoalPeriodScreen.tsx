import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteOverseerGoalPeriod,
  getOverseerGoalPeriodDetail,
} from '../services/overseerGoals.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {returnToList} from '../../../shared/utils/returnToList';
import {
  DeleteConfirmView,
  ScreenContainer,
} from '../../../shared/components/crud';

export const DeleteOverseerGoalPeriodScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route.params?.goalPeriodId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;

    if (goalPeriodId) {
      getOverseerGoalPeriodDetail(goalPeriodId)
        .then(res => {
          if (!mounted) {
            return;
          }

          const goalPeriod = res?.data?.goal_period;
          const periodLabel =
            goalPeriod?.start_year && goalPeriod?.end_year
              ? `${goalPeriod.start_year} - ${goalPeriod.end_year}`
              : '';
          const summary = [goalPeriod?.nation_name, periodLabel]
            .filter(Boolean)
            .join(' - ');

          setName(summary || t('overseerGoalDetail'));
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [goalPeriodId, t]);

  const onConfirm = async () => {
    if (!goalPeriodId) {
      return;
    }

    try {
      setSubmitting(true);
      await deleteOverseerGoalPeriod(goalPeriodId);
      Alert.alert(t('success'), t('goalPeriodDeletedSuccess'));
      returnToList(navigation);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || t('failedToDeleteGoalPeriod'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('delete')} ${t('overseerGoalDetail')}`}
      showMenu
      scroll>
      <DeleteConfirmView
        name={name}
        onCancel={() => navigation.goBack()}
        onConfirm={onConfirm}
        submitting={submitting}
        disabled={!goalPeriodId}
      />
    </ScreenContainer>
  );
};

export default DeleteOverseerGoalPeriodScreen;
