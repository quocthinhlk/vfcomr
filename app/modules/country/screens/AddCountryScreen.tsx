import React, {useState} from 'react';
import {View, StyleSheet, Alert, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {createCountry} from '../services/country.service';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';

export const AddCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await createCountry({ name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('country')} ${t('success')}`);
      navigation.navigate('Countries', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create country');
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
                  title={`${t('addNew')} ${t('country')}`}
                  showMenu={false}
                />
                <Text
                  style={[
                    formStyles.label,
                    {color: C.textPrimary, marginTop: ms(12)},
                  ]}>
                  {t('country')}
                </Text>
                <TextInput
                  style={[
                    formStyles.textField,
                    {
                      marginTop: ms(4),
                      marginBottom: ms(16),
                      borderColor: (C as any).inputBorder || C.border,
                      color: C.textPrimary,
                      backgroundColor: (C as any).card || C.background,
                    },
                  ]}
                  placeholder={t('country')}
                  placeholderTextColor={C.textSecondary}
                  value={name}
                  onChangeText={setName}
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
    padding: ms(16),
  },
  title: {
    marginTop: ms(16),
    marginBottom: ms(8),
  },
  input: {
    height: hs(44),
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: rs(6),
    paddingHorizontal: ms(12),
    color: '#000',
  },
  label: {
    marginTop: ms(8),
    marginBottom: ms(4),
    color: '#333',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
  cancelBtnText: {
    color: COLORS.mainColor,
  },
});

export default AddCountryScreen; 