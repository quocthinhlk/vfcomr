import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { formStyles } from '../../../shared/styles/form';
import { createLanguage } from '../services/language.service';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import { Col, Row, Grid } from 'react-native-easy-grid';

export const AddLanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await createLanguage({ name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('language')} ${t('success')}`);
      navigation.navigate('Languages', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create language');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
          <Grid>
            <Row>
              <Col>
          <Header title={`${t('addNew')} ${t('language')}`} showMenu={false} />
                <Text style={[formStyles.label, { color: C.textPrimary, marginTop: 12 }]}>{t('language')}</Text>
          <TextInput
                  style={[
                    formStyles.textField,
                    {
                      marginTop: 4,
                      marginBottom: 16,
                      borderColor: (C as any).inputBorder || C.border,
                      color: C.textPrimary,
                      backgroundColor: (C as any).card || C.background,
                    },
                  ]}
            placeholder={t('language')}
            placeholderTextColor={C.textSecondary}
            value={name}
            onChangeText={setName}
          />
                <View style={formStyles.buttonRow}>
            <CancelButton label={t('cancel')} onPress={() => navigation.goBack()} disabled={submitting} />
            <SaveButton label={t('save')} onPress={onSave} disabled={submitting} />
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
    paddingLeft: 16,
    paddingRight: 16,
  },
});

export default AddLanguageScreen;
