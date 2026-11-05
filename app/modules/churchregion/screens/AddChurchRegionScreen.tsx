import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  createChurchRegion,
  getChurchRegionHierarchy,
  uploadChurchRegionLogo,
} from '../services/churchregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {ChurchRegionLogoField} from '../components/ChurchRegionUI';
import {
  REGION_NAME_MAX,
  buildParentOptions,
  validateRegionName,
} from '../utils/churchRegion.utils';

export const AddChurchRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const {t} = useTranslation();
  const {imagePath, handleImagePick, clearImage} = useImagePicker();
  // One save at a time: a fast double tap created the region twice.
  const submitOnce = useSubmitOnce();

  // Parent list failed (e.g. offline): show a retryable error, not an empty dropdown.
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchHierarchy = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const resp = await getChurchRegionHierarchy();
      if (mountedRef.current) {
        setOptions(buildParentOptions(resp?.data ?? resp));
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
  }, []);

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
    if (validateRegionName(name)) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      const logoPath = imagePath ? await uploadChurchRegionLogo(imagePath, name.trim()) : '';
      await createChurchRegion({
        name: name.trim(),
        parent_id: parentId ?? null,
        logo_path: logoPath,
      });
      Alert.alert(t('success') || 'Success', `${t('churchApostolicRegions')}: ${t('add')} ${t('success')}`);
      markDataChanged('churchRegions');
      // React Navigation 7's navigate pushes a second list on top, so Back
      // reopened the filled form (and a second Save made a duplicate).
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'ChurchRegions') && navigation.popTo) {
        navigation.popTo('ChurchRegions', params);
      } else if (navigation.replace) {
        navigation.replace('ChurchRegions', params);
      } else {
        navigation.navigate('ChurchRegions', params);
      }
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('addNew')} ${t('churchApostolicRegions')}`}
      scroll
      loading={optionsLoading}
      error={optionsError}
      onRetry={fetchHierarchy}>
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
