import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { getChurchRegionById, updateChurchRegion, getChurchRegionHierarchy } from '../services/churchregion.service';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import ElementDropdown, { ElementDropdownItem } from '../../../shared/components/ElementDropdown';

export const EditChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchRegionId: number | undefined = route.params?.churchRegionId;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (churchRegionId) {
      getChurchRegionById(churchRegionId).then(res => {
        if (!mounted) return;
        const data = res?.data?.data || res?.data;
        setName(data?.name || '');
        setParentId(data?.parent_id ?? null);
      }).catch(() => {});
    }
    return () => { (mounted = false); };
  }, [churchRegionId]);

  useEffect(() => {
    let mounted = true;
    const fetchHierarchy = async () => {
      try {
        const resp = await getChurchRegionHierarchy();
        const tree = (resp?.data ?? resp) as any[];
        const out: ElementDropdownItem[] = [];
        const walk = (nodes: any[], depth: number) => {
          nodes?.forEach(n => {
            out.push({ label: `${'— '.repeat(depth)}${n.name}`, value: n.id });
            if (n.children && n.children.length) walk(n.children, depth + 1);
          });
        };
        walk(tree || [], 0);
        if (mounted) setOptions(out);
      } catch {}
    };
    fetchHierarchy();
    return () => { mounted = false; };
  }, []);

  const onSave = async () => {
    if (!churchRegionId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateChurchRegion(churchRegionId, { name: name.trim(), parent_id: parentId ?? null });
      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('edit')} ${t('success')}`);
      navigation.navigate('ChurchRegions', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update church region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
          <Header title={`${t('edit')} ${t('churchApostolicRegions')}`} />
          <Text style={[styles.label, { color: C.textPrimary }]}>{t('churchRegion') || t('churchApostolicRegions')}</Text>
          <TextInput
            style={[styles.input, { borderColor: (C as any).inputBorder || C.border, color: C.textPrimary, backgroundColor: (C as any).card || C.background }]}
            placeholder={t('churchRegion') || t('churchApostolicRegions')}
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
  row: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
});

export default EditChurchRegionScreen;


