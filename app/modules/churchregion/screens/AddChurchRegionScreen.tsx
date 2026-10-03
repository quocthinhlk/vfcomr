import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  createChurchRegion,
  getChurchRegionHierarchy,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import api from '../../../config/api';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {ChurchRegionLogoField} from '../components/ChurchRegionUI';

export const AddChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  useEffect(() => {
    let mounted = true;
    const fetchHierarchy = async () => {
      try {
        const resp = await getChurchRegionHierarchy();
        const tree = (resp?.data ?? resp) as any[];
        const out: ElementDropdownItem[] = [];
        const walk = (nodes: any[], depth: number) => {
          nodes?.forEach(n => {
            out.push({label: `${'— '.repeat(depth)}${n.name}`, value: n.id});
            if (n.children && n.children.length) {
              walk(n.children, depth + 1);
            }
          });
        };
        walk(tree || [], 0);
        if (mounted) {
          setOptions(out);
        }
      } catch {}
    };
    fetchHierarchy();
    return () => {
      mounted = false;
    };
  }, []);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);

      // Upload image first if selected
      let uploadedLogoPath: string | null = null;
      if (imagePath) {
        const form = new FormData();
        const fileName = imagePath.split('/').pop() || 'logo.jpg';
        form.append('file', { uri: imagePath, name: fileName, type: 'image/jpeg' } as any);
        form.append('entity_type', 'church-regions');
        form.append('alt_text', name.trim());
        const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedLogoPath = uploadRes?.data?.data?.path || null;
      }

      await createChurchRegion({
        name: name.trim(),
        parent_id: parentId ?? null,
        logo_path: uploadedLogoPath ?? undefined,
      } as any);
      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('add')} ${t('success')}`);
      navigation.navigate('ChurchRegions', { reload: true });
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || 'Failed to create church region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer title={`${t('addNew')} ${t('churchApostolicRegions')}`} scroll>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchRegion') || t('churchApostolicRegions')}
          error={!!nameError}
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
      <ChurchRegionLogoField
        imageUri={imagePath || null}
        onPick={handleImagePick}
        onClear={clearImage}
      />
      <FormActions
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        submitting={submitting}
      />
    </ScreenContainer>
  );
};

export default AddChurchRegionScreen;
