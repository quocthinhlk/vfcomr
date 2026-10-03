import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  createLanguageRegion,
  listLanguageRegions,
  LanguageRegionItem,
} from '../services/languageregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import {
  FormActions,
  FormDivider,
  FormField,
  FormSwitchRow,
  ScreenContainer,
} from '../../../shared/components/crud';

export const AddLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    const fetchParents = async () => {
      try {
        const resp = await listLanguageRegions();
        const all = resp?.data?.items ?? [];
        const roots = all.filter(
          (r: LanguageRegionItem) => r.parent_id === null,
        );
        const out: ElementDropdownItem[] = roots.map(r => ({
          label: r.name,
          value: r.id,
        }));
        if (mounted) {
          setOptions(out);
        }
      } catch {}
    };
    fetchParents();
    return () => {
      mounted = false;
    };
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
    <ScreenContainer title={`${t('addNew')} ${t('languageRegion')}`} scroll>
      <FormField label={t('name')} required>
        <AppInput
          value={name}
          onChangeText={setName}
          placeholder={t('languageRegion')}
          editable={!submitting}
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormField label={t('churchParent')}>
        <ElementDropdown
          data={options}
          value={parentId}
          onChange={v =>
            setParentId(
              (typeof v === 'number' ? v : Number(v)) || null,
            )
          }
          placeholder={t('churchParent')}
        />
      </FormField>
      <FormDivider />
      <FormSwitchRow
        label={t('disabled')}
        value={disabled}
        onValueChange={setDisabled}
        disabled={submitting}
      />
      <FormActions
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        submitting={submitting}
      />
    </ScreenContainer>
  );
};

export default AddLanguageRegionScreen;
