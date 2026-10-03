import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteChurchRegion,
  getChurchRegionById,
} from '../services/churchregion.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {fs, ms} from '../../../shared/utils/scale';
import {returnToList} from '../../../shared/utils/returnToList';

export const DeleteChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchRegionId: number | undefined = route.params?.churchRegionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (churchRegionId) {
      getChurchRegionById(churchRegionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const data = res?.data?.data || res?.data;
          setName(data?.name || 'this region');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [churchRegionId]);

  const onConfirm = async () => {
    if (!churchRegionId) return;
    try {
      setSubmitting(true);
      await deleteChurchRegion(churchRegionId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchApostolicRegions')} ${t('success')}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete church region');
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
          <Header title={`${t('delete')} ${t('churchApostolicRegions')}`} />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete')} ${t('churchApostolicRegions')} "${name}"?`}
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
    paddingLeft: ms(16),
    paddingRight: ms(16),
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

export default DeleteChurchRegionScreen;


