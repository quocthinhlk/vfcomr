import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  deleteOverseerGoalPeriod,
  getOverseerGoalPeriodDetail,
} from '../services/overseerGoals.service';
import {getNationNameMap} from '../services/overseerGoals.service';
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
  const [loading, setLoading] = useState(!!goalPeriodId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  // Don't ask to confirm deleting a record we couldn't load (e.g. offline).
  const load = useCallback(async () => {
    if (!goalPeriodId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, nationNames] = await Promise.all([
        getOverseerGoalPeriodDetail(goalPeriodId),
        // nation_id is a geographical region; the API's nation_name is wrong.
        getNationNameMap().catch(() => null),
      ]);
      if (!mountedRef.current) {
        return;
      }
      const goalPeriod = res?.data?.goal_period;
      const periodLabel =
        goalPeriod?.start_year && goalPeriod?.end_year
          ? `${goalPeriod.start_year} - ${goalPeriod.end_year}`
          : '';
      const nationName =
        goalPeriod?.nation_id != null ? nationNames?.get(Number(goalPeriod.nation_id)) : '';
      const summary = [nationName, periodLabel]
        .filter(Boolean)
        .join(' - ');

      setName(summary || t('overseerGoalDetail'));
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [goalPeriodId, t]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

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
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
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
