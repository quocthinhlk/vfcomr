import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteVisit,
  getVisitById,
} from '../services/visit.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';

export const DeleteVisitScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId: number | undefined = route.params?.visitId;
  const [visitInfo, setVisitInfo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();

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
      navigation.navigate('Visits', {reload: true});
    } catch (e) {
      Alert.alert(t('error') || 'Error', t('failedToDeleteVisit') || 'Failed to delete Visit');
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
          <Header
            title={`${t('delete') || 'Delete'} ${t('visit') || 'Visit'}`}
          />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete') || 'Delete'} ${t('visit') || 'Visit'} "${visitInfo}"?`}
          </Text>
          <View style={styles.row}>
            <CancelButton
              label={t('cancel') || 'Cancel'}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            />
            <DeleteButton
              label={t('delete') || 'Delete'}
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
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  desc: {
    fontSize: fs(14),
    marginTop: ms(16),
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
});

export default DeleteVisitScreen;

