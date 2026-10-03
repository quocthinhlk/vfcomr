import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteOverseerGoalPeriod,
  getOverseerGoalPeriodDetail,
} from '../services/overseerGoals.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';

export const DeleteOverseerGoalPeriodScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route.params?.goalPeriodId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();

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
      navigation.navigate('OverseerGoals', {reload: true});
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || t('failedToDeleteGoalPeriod'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header title={`${t('delete')} ${t('overseerGoalDetail')}`} />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete')} "${name}"?`}
          </Text>
          <View style={styles.row}>
            <CancelButton
              label={t('cancel')}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            />
            <DeleteButton
              label={t('delete')}
              onPress={onConfirm}
              disabled={submitting}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: ms(16),
  },
  desc: {
    color: '#555',
    fontSize: fs(14),
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
});

export default DeleteOverseerGoalPeriodScreen;
