import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { getChurchNetworkById, updateChurchNetwork } from '../services/churchnetwork.service';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';

export const EditChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pastorLocked, setPastorLocked] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (churchNetworkId) {
      getChurchNetworkById(churchNetworkId).then(res => {
        if (!mounted) return;
        setName(res?.data?.name || '');
        setPastorLocked(!!res?.data?.pastor_credential_locked);
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [churchNetworkId]);

  const onSave = async () => {
    if (!churchNetworkId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateChurchNetwork(churchNetworkId, { name: name.trim(), pastor_credential_locked: pastorLocked });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('churchNetwork')} ${t('success')}`);
      navigation.navigate('ChurchNetworks', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
        <Header title={`${t('edit')} ${t('churchNetwork')}`} />
          <Text style={[styles.label, { color: C.textPrimary }]}>{t('churchNetwork')}</Text>
          <TextInput
            style={[styles.input, { borderColor: (C as any).inputBorder || C.border, color: C.textPrimary, backgroundColor: (C as any).card || C.background }]}
            placeholder={t('churchNetwork')}
            placeholderTextColor={C.textSecondary}
            value={name}
            onChangeText={setName}
          />
          <View style={styles.lockRow}>
            <Text style={[styles.label, { color: C.textPrimary }]}>{t('pastorCredentialLocked')}</Text>
            <Switch value={pastorLocked} onValueChange={setPastorLocked} />
          </View>
          <View style={styles.row}>
            <CancelButton label={t('cancel')} onPress={() => navigation.goBack()} disabled={submitting} />
            <SaveButton label={t('save')} onPress={onSave} disabled={submitting} />
          </View>
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
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    color: '#000',
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    color: '#333',
    fontWeight: '600',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
});

export default EditChurchNetworkScreen; 