import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteChurchType,
  getChurchTypeById,
} from '../services/churchtype.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {fs, ms} from '../../../shared/utils/scale';

export const DeleteChurchTypeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchTypeId: number | undefined = route.params?.churchTypeId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (churchTypeId) {
      getChurchTypeById(churchTypeId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this church type');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [churchTypeId]);

  const onConfirm = async () => {
    if (!churchTypeId) return;
    try {
      setSubmitting(true);
      await deleteChurchType(churchTypeId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchType')} ${t('success')}`);
      navigation.navigate('ChurchTypes', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete church type');
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
          <Header title={`${t('delete')} ${t('churchType')}`} />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete')} ${t('churchType')} "${name}"?`}
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
  title: {
    marginTop: ms(16),
    marginBottom: ms(8),
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

export default DeleteChurchTypeScreen; 