import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteLanguageRegion,
  getLanguageRegionById,
} from '../services/languageregion.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {fs, ms} from '../../../shared/utils/scale';

export const DeleteLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageRegionId: number | undefined = route.params?.languageRegionId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (languageRegionId) {
      getLanguageRegionById(languageRegionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this language region');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [languageRegionId]);

  const onConfirm = async () => {
    if (!languageRegionId) return;
    try {
      setSubmitting(true);
      await deleteLanguageRegion(languageRegionId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('languageRegion')} ${t('success')}`);
      navigation.navigate('LanguageRegions', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete language region');
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
          <Header title={`${t('delete')} ${t('languageRegion')}`} />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete')} ${t('languageRegion')} "${name}"?`}
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

export default DeleteLanguageRegionScreen;
