import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  createGeographicalRegion,
  getGeographicalRegionTree,
  GeographicalRegionTreeNode,
} from '../services/geographicalregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import ElementDropdown, {
  ElementDropdownItem,
} from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';

export const AddGeographicalRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const [name, setName] = useState('');
  // Opened from a sub-level of the list: that region is the default parent.
  const [parentId, setParentId] = useState<number | null>(
    route.params?.parentId ?? null,
  );
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
      const tree = await getGeographicalRegionTree();
      const out: ElementDropdownItem[] = [];
      const walk = (nodes: GeographicalRegionTreeNode[], depth: number) => {
        nodes?.forEach(n => {
          out.push({label: `${'— '.repeat(depth)}${n.name}`, value: n.id});
          if (n.children && n.children.length) {
            walk(n.children, depth + 1);
          }
        });
      };
      walk(tree, 0);
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
  }, []);

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
    if (!name.trim()) {
      setNameError(t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await createGeographicalRegion({
        name: name.trim(),
        parent_id: parentId ?? null,
      });
      Alert.alert(
        t('success') || 'Success',
        `${t('geographicalRegions')}: ${t('add')} ${t('success')}`,
      );
      navigation.navigate('GeographicalRegions', {reload: true});
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('addNew')} ${t('geographicalRegion')}`}
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
          editable={!submitting}
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

export default AddGeographicalRegionScreen;
