import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteChurchPlantingProjection,
  getChurchPlantingProjectionById,
} from '../services/churchPlantingProjection.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {returnToList} from '../../../shared/utils/returnToList';

export const DeleteChurchPlantingProjectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectionId: number | undefined = route.params?.projectionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();

  useEffect(() => {
    let mounted = true;
    if (projectionId) {
      getChurchPlantingProjectionById(projectionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.proposed_church_name || 'this Church Planting Projection');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [projectionId]);

  const onConfirm = async () => {
    if (!projectionId) return;
    try {
      setSubmitting(true);
      await deleteChurchPlantingProjection(projectionId);
      Alert.alert(
        t('success') || 'Success',
        `${t('delete') || 'Delete'} ${t('churchPlantingProjection') || 'Church Planting Projection'} ${t('success') || 'success'}`,
      );
      returnToList(navigation);
    } catch (e) {
      Alert.alert(
        t('error') || 'Error',
        t('failedToDeleteProjection') || 'Failed to delete Church Planting Projection',
      );
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
            title={`${t('delete') || 'Delete'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`}
          />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete') || 'Delete'} ${t('churchPlantingProjection') || 'Church Planting Projection'} "${name}"?`}
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

export default DeleteChurchPlantingProjectionScreen;

