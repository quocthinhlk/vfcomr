import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteWorshipService,
  getWorshipServiceById,
} from '../services/worshipService.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';

export const DeleteWorshipServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (worshipServiceId) {
      getWorshipServiceById(worshipServiceId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this Worship Service');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [worshipServiceId]);

  const onConfirm = async () => {
    if (!worshipServiceId) return;
    try {
      setSubmitting(true);
      await deleteWorshipService(worshipServiceId);
      Alert.alert(
        t('success') || 'Success',
        `${t('delete') || 'Delete'} ${t('worshipService') || 'Worship Service'} ${t('success') || 'success'}`,
      );
      navigation.navigate('WorshipServices', {reload: true});
    } catch (e) {
      Alert.alert(t('error') || 'Error', t('failedToDeleteWorshipService') || 'Failed to delete Worship Service');
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
            title={`${t('delete') || 'Delete'} ${t('worshipService') || 'Worship Service'}`}
          />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete') || 'Delete'} ${t('worshipService') || 'Worship Service'} "${name}"?`}
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
    color: '#555',
    fontSize: fs(14),
    marginTop: ms(16),
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
});

export default DeleteWorshipServiceScreen;
