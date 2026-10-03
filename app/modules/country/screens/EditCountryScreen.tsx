import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {getCountryById, updateCountry} from '../services/country.service';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';

export const EditCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const countryId: number | undefined = route.params?.countryId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (countryId) {
      getCountryById(countryId)
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
  }, [countryId]);

  const onSave = async () => {
    if (!countryId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateCountry(countryId, { name: name.trim() });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('country')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update country');
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
                  title={`${t('edit')} ${t('country')}`}
                  showMenu={false}
                />
                <Text
                  style={[
                    formStyles.label,
                    {color: C.textPrimary, marginTop: ms(12)},
                  ]}>
                  {t('country')}
                </Text>
                <AppInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('country')}
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
});

export default EditCountryScreen; 