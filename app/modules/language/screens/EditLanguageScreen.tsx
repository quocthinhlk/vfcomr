import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {
  getLanguageById,
  updateLanguage,
} from '../services/language.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';

export const EditLanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageId: number | undefined = route.params?.languageId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (languageId) {
      getLanguageById(languageId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || '');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [languageId]);

  const onSave = async () => {
    if (!languageId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateLanguage(languageId, { name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('language')} ${t('success')}`);
      navigation.navigate('Languages', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update language');
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
          <Grid>
            <Row>
              <Col>
                <Header
                  title={`${t('edit')} ${t('language')}`}
                  showMenu={false}
                />
                <Text
                  style={[
                    formStyles.label,
                    {color: C.textPrimary, marginTop: ms(12)},
                  ]}>
                  {t('language')}
                </Text>
                <AppInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('language')}
                />
                <View style={formStyles.buttonRow}>
                  <CancelButton
                    label={t('cancel')}
                    onPress={() => navigation.goBack()}
                    disabled={submitting}
                  />
                  <SaveButton
                    label={t('save')}
                    onPress={onSave}
                    disabled={submitting}
                  />
                </View>
              </Col>
            </Row>
          </Grid>
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
});

export default EditLanguageScreen;
