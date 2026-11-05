import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getChurchRegionById,
  updateChurchRegion,
  getChurchRegionHierarchy,
  uploadChurchRegionLogo,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  REGION_NAME_MAX,
  buildParentOptions,
  validateRegionName,
} from '../utils/churchRegion.utils';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import {useImagePicker} from '../../church/hooks/useImagePicker';
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
  // Parent saved on the server: the API ignores parent_id null, so removing
  // a parent is checked after saving.
  const [savedParentId, setSavedParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!churchRegionId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const [nameError, setNameError] = useState('');
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const {t} = useTranslation();
  const {imagePath, handleImagePick, clearImage} = useImagePicker();
  // One save at a time: a fast double tap sent the update (and upload) twice.
  const submitOnce = useSubmitOnce();

  // imageRemoved stays set after picking a new image: if that image is then
  // cleared too, the tile is empty and saving must remove the old logo (it
  // used to be kept).

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Named so the error state's "Try again" can re-run it.
  const load = useCallback(async () => {
    if (!churchRegionId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getChurchRegionById(churchRegionId);
      if (!mountedRef.current) {
        return;
      }
      const data = res?.data?.data || res?.data;
      setName(data?.name || '');
      setParentId(data?.parent_id || null);
      setSavedParentId(data?.parent_id || null);
      const logoUrl = data?.logo_url || null;
      setExistingLogoUrl(logoUrl);
      setOriginalLogoUrl(logoUrl);
    } catch (e) {
      // Without the record the form would be blank: show a retryable error.
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [churchRegionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Without the parent list the saved parent shows blank and could be lost on save.
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<unknown>(null);
  const fetchHierarchy = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const resp = await getChurchRegionHierarchy();
      // Not itself or a region under it: that parent would make a loop.
      const out = buildParentOptions(resp?.data ?? resp, churchRegionId);
      if (mountedRef.current) {
        setOptions(out);
      }
    } catch (e) {
      if (mountedRef.current) {
        setOptionsError(e);
      }
    } finally {
      if (mountedRef.current) {
        setOptionsLoading(false);
      }
    }
  }, [churchRegionId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = submitOnce(async () => {
    if (!churchRegionId) {
      return;
    }
    if (validateRegionName(name)) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);

      const updateData: {name: string; parent_id: number | null; logo_path?: string} = {
        name: name.trim(),
        parent_id: parentId ?? null,
      };
      if (imagePath) {
        // A new logo was picked.
        updateData.logo_path = await uploadChurchRegionLogo(imagePath, name.trim());
      } else if (imageRemoved && originalLogoUrl) {
        // The saved logo was removed.
        updateData.logo_path = '';
      }
      // Otherwise logo_path is left out and the saved logo is kept.

      await updateChurchRegion(churchRegionId, updateData);
      markDataChanged('churchRegions');

      if (savedParentId && !parentId) {
        // The API answers success but keeps the parent when it gets null.
        const check = await getChurchRegionById(churchRegionId).catch(() => null);
        const keptParent = (check?.data?.data || check?.data)?.parent_id;
        if (keptParent) {
          if (mountedRef.current) {
            setParentId(keptParent);
          }
          Alert.alert(t('error') || 'Error', t('churchRegionParentNotRemoved'));
          return;
        }
      }

      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('edit')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('churchApostolicRegions')}`}
      scroll
      loading={loading || optionsLoading}
      error={loadError || optionsError}
      onRetry={() =>
        Promise.all([
          loadError ? load() : undefined,
          optionsError ? fetchHierarchy() : undefined,
        ])
      }>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('churchRegion') || t('churchApostolicRegions')}
          error={!!nameError}
          editable={!submitting}
          maxLength={REGION_NAME_MAX}
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormField label={t('churchParent')}>
        <ElementDropdown
          data={options}
          value={parentId}
          onChange={v => setParentId(v == null ? null : Number(v) || null)}
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
