import React, {useState} from 'react';
import {View, StyleSheet, Alert, TextInput, Switch} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {createChurchNetwork} from '../services/churchnetwork.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {fs, ms, rs, hs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';

export const AddChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pastorLocked, setPastorLocked] = useState(false);
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
      await createChurchNetwork({ name: name.trim(), pastor_credential_locked: pastorLocked });
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('churchNetwork')} ${t('success')}`);
      navigation.navigate('ChurchNetworks', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create church network');
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
                  title={`${t('addNew')} ${t('churchNetwork')}`}
                  showMenu={false}
                />
                <Text
                  style={[
                    formStyles.label,
                    {color: C.textPrimary, marginTop: ms(12)},
                  ]}>
                  {t('churchNetwork')}
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
                  placeholder={t('churchNetwork')}
                  placeholderTextColor={C.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
                <View style={formStyles.switchRow}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textPrimary, marginBottom: 0},
                    ]}>
                    {t('pastorCredentialLocked')}
                  </Text>
                  <Switch
                    style={{transform: [{scaleX: 0.9}, {scaleY: 0.9}]}}
                    value={pastorLocked}
                    onValueChange={setPastorLocked}
                    thumbColor={COLORS.white}
                    trackColor={{
                      false: C.border,
                      true: COLORS.mainColor,
                    }}
                  />
                </View>
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
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(12),
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
});

export default AddChurchNetworkScreen; 