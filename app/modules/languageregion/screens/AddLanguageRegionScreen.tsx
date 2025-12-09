import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { formStyles } from '../../../shared/styles/form';
import { createLanguageRegion, listLanguageRegions, LanguageRegionItem } from '../services/languageregion.service';
import { SaveButton, CancelButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import ElementDropdown, { ElementDropdownItem } from '../../../shared/components/ElementDropdown';
import { Col, Row, Grid } from 'react-native-easy-grid';

export const AddLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await createLanguageRegion({ name: name.trim(), parent_id: parentId ?? null, disabled });
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('languageRegion')} ${t('success')}`);
      navigation.navigate('LanguageRegions', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create language region');
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
                <Header title={`${t('addNew')} ${t('languageRegion')}`} showMenu={false} />
                <Text style={[formStyles.label, { color: C.textPrimary, marginTop: 12 }]}>{t('languageRegion')}</Text>
                <TextInput
                  style={[
                    formStyles.textField,
                    {
                      marginTop: 4,
                      marginBottom: 12,
                      borderColor: (C as any).inputBorder || C.border,
                      color: C.textPrimary,
                      backgroundColor: (C as any).card || C.background,
                    },
                  ]}
                  placeholder={t('languageRegion')}
                  placeholderTextColor={C.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
                <Text style={[formStyles.label, { color: C.textPrimary }]}>{t('churchParent')}</Text>
                <ElementDropdown
                  data={options}
                  value={parentId}
                  onChange={(v) => setParentId((typeof v === 'number' ? v : Number(v)) || null)}
                  placeholder={t('churchParent')}
                  containerStyle={{ marginBottom: 8 }}
                />
                <View style={formStyles.switchRow}>
                  <Text style={[formStyles.label, { color: C.textPrimary, marginBottom: 0 }]}>{t('disabled')}</Text>
                  <Switch value={disabled} onValueChange={setDisabled} />
                </View>
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

export default AddLanguageRegionScreen;
