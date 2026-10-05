import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getChurchRegionById,
  updateChurchRegion,
  getChurchRegionHierarchy,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import api from '../../../config/api';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {ChurchRegionLogoField} from '../components/ChurchRegionUI';

export const EditChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchRegionId: number | undefined = route.params?.churchRegionId;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!churchRegionId);
  const [nameError, setNameError] = useState('');
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const {t} = useTranslation();
  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  // Reset imageRemoved flag when user picks a new image
  useEffect(() => {
    if (imagePath) {
      setImageRemoved(false);
    }
  }, [imagePath]);

  useEffect(() => {
    let mounted = true;
    if (churchRegionId) {
      getChurchRegionById(churchRegionId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const data = res?.data?.data || res?.data;
          setName(data?.name || '');
          setParentId(data?.parent_id ?? null);
          const logoUrl = data?.logo_url || null;
          setExistingLogoUrl(logoUrl);
          setOriginalLogoUrl(logoUrl);
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      mounted = false;
    };
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
    if (!churchRegionId) return;
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);

      const updateData: any = {
        name: name.trim(),
        parent_id: parentId ?? null
      };

      // Determine if image was changed
      const imageChanged = imagePath || (imageRemoved && !existingLogoUrl);

      if (imageChanged) {
        if (imagePath) {
          // User uploaded a new image
          const form = new FormData();
          const fileName = imagePath.split('/').pop() || 'logo.jpg';
          form.append('file', { uri: imagePath, name: fileName, type: 'image/jpeg' } as any);
          form.append('entity_type', 'all');
          form.append('alt_text', name.trim());
          const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
          const uploadedPath = uploadRes?.data?.data?.path;
          if (!uploadedPath) {
            throw new Error(t('apiErrorUnexpected'));
          }
          updateData.logo_path = uploadedPath;
        } else if (imageRemoved && !existingLogoUrl) {
          // User removed the image without uploading a new one
          updateData.logo_path = '';
        }
      }
      // If no image change, don't include logo_path in update

      await updateChurchRegion(churchRegionId, updateData);
      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('edit')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('churchApostolicRegions')}`}
      scroll
      loading={loading}>
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
        imageUri={imagePath || existingLogoUrl}
        onPick={handleImagePick}
        onClear={
          imagePath
            ? clearImage
            : () => {
                setExistingLogoUrl(null);
                setImageRemoved(true);
              }
        }
      />
      <FormActions
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        submitting={submitting}
      />
    </ScreenContainer>
  );
};

export default EditChurchRegionScreen;
