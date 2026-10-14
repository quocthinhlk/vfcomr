import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  flattenGeographicalRegionTree,
  getGeographicalRegionTree,
  GeographicalRegionItem,
  updateGeographicalRegion,
} from '../services/geographicalregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import {useThemedColors} from '../../../shared/styles/theme';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

/**
 * PATCH geographical-regions/{id}. The API has no "get one" endpoint, so the
 * list passes the region it was opened from (`region` param).
 */
export const EditGeographicalRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const region: GeographicalRegionItem | undefined = route.params?.region;

  const [name, setName] = useState(region?.name ?? '');
  const [parentId, setParentId] = useState<number | null>(region?.parent_id ?? null);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

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

  const fetchTree = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      // The region itself and its sub-regions cannot become its parent.
      const out = flattenGeographicalRegionTree(await getGeographicalRegionTree(), region?.id);
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
  }, [region?.id]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const onNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) {
      setNameError('');
    }
  };

  const onSave = async () => {
    if (!region) {
      return;
    }
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateGeographicalRegion(region.id, {
        name: name.trim(),
        parent_id: parentId ?? null,
      });
      Alert.alert(
        t('success') || 'Success',
        `${t('geographicalRegions')}: ${t('edit')} ${t('success')}`,
      );
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('geographicalRegion')}`}
      scroll
      loading={optionsLoading}
      error={optionsError}
      onRetry={fetchTree}>
      <FormField label={t('name')} required error={nameError}>
        <AppInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('geographicalRegion')}
          error={!!nameError}
          editable={!submitting && !!region}
          accessibilityLabel={`${t('name')}, ${t('required')}`}
        />
      </FormField>
      <FormField label={t('parentRegion')}>
        <ElementDropdown
          data={options}
          value={parentId}
          onChange={v =>
            setParentId((typeof v === 'number' ? v : Number(v)) || null)
          }
          placeholder={t('parentRegion')}
          renderItem={createHierarchyDropdownRenderItem(C) as any}
          search
        />
      </FormField>
      <FormActions
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        submitting={submitting}
      />
    </ScreenContainer>
  );
};

export default EditGeographicalRegionScreen;
