import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { getCountryById, updateCountry } from '../services/country.service';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';

export const EditCountryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const countryId: number | undefined = route.params?.countryId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (countryId) {
      getCountryById(countryId).then(res => {
        if (!mounted) return;
        setName(res?.data?.name || '');
      }).catch(() => {});
    }
    return () => { mounted = false; };
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
      navigation.navigate('Countries', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update country');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
          <Header title={`${t('edit')} ${t('country')}`} showMenu={false} />
          <Text style={[styles.label, { color: C.textPrimary }]}>{t('country')}</Text>
          <TextInput
            style={[styles.input, { borderColor: (C as any).inputBorder || C.border, color: C.textPrimary, backgroundColor: (C as any).card || C.background }]}
            placeholder={t('country')}
            placeholderTextColor={C.textSecondary}
            value={name}
            onChangeText={setName}
          />
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
    padding: 16,
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
  row: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
});

export default EditCountryScreen; 