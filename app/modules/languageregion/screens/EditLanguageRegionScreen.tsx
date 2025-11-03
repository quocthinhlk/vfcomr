import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { getLanguageRegionById, updateLanguageRegion, listLanguageRegions, LanguageRegionItem } from '../services/languageregion.service';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import ElementDropdown, { ElementDropdownItem } from '../../../shared/components/ElementDropdown';

export const EditLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageRegionId: number | undefined = route.params?.languageRegionId;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (languageRegionId) {
      getLanguageRegionById(languageRegionId).then(res => {
        if (!mounted) return;
        const data = res?.data;
        setName(data?.name || '');
        setParentId(data?.parent_id ?? null);
        setDisabled(!!data?.disabled);
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [languageRegionId]);

  useEffect(() => {
    let mounted = true;
    const fetchParents = async () => {
      try {
        const resp = await listLanguageRegions();
        const all = resp?.data?.items ?? [];
        const roots = all.filter((r: LanguageRegionItem) => r.parent_id === null);
        const out: ElementDropdownItem[] = roots.map(r => ({ label: r.name, value: r.id }));
        if (mounted) setOptions(out);
      } catch {}
    };
    fetchParents();
    return () => { mounted = false; };
  }, []);

  const onSave = async () => {
    if (!languageRegionId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateLanguageRegion(languageRegionId, { name: name.trim(), parent_id: parentId ?? null, disabled });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('languageRegion')} ${t('success')}`);
      navigation.navigate('LanguageRegions', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update language region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
          <Header title={`${t('edit')} ${t('languageRegion')}`} />
          <Text style={[styles.label, { color: C.textPrimary }]}>{t('languageRegion')}</Text>
          <TextInput
            style={[styles.input, { borderColor: (C as any).inputBorder || C.border, color: C.textPrimary, backgroundColor: (C as any).card || C.background }]}
            placeholder={t('languageRegion')}
            placeholderTextColor={C.textSecondary}
            value={name}
            onChangeText={setName}
          />
          <Text style={[styles.label, { color: C.textPrimary }]}>{t('churchParent')}</Text>
          <ElementDropdown
            data={options}
            value={parentId}
            onChange={(v) => setParentId((typeof v === 'number' ? v : Number(v)) || null)}
            placeholder={t('churchParent')}
            containerStyle={{ marginBottom: 8 }}
          />
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: C.textPrimary }]}>{t('disabled')}</Text>
            <Switch value={disabled} onValueChange={setDisabled} />
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
  switchRow: {
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

export default EditLanguageRegionScreen;
