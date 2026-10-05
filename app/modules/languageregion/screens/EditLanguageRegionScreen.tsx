import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  getLanguageRegionById,
  updateLanguageRegion,
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

export const EditLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageRegionId: number | undefined = route.params?.languageRegionId;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [options, setOptions] = useState<ElementDropdownItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!languageRegionId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const {t} = useTranslation();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Named so the error state's "Try again" can re-run it.
  const load = useCallback(async () => {
    if (!languageRegionId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getLanguageRegionById(languageRegionId);
      if (!mountedRef.current) {
        return;
      }
      const data = res?.data;
      setName(data?.name || '');
      setParentId(data?.parent_id ?? null);
      setDisabled(!!data?.disabled);
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
  }, [languageRegionId]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!languageRegionId) return;
    if (!name.trim()) {
      Alert.alert(t('validation') || 'Validation', t('fillRequiredFields') || 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await updateLanguageRegion(languageRegionId, { name: name.trim(), parent_id: parentId ?? null, disabled });
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('languageRegion')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to update language region');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('languageRegion')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
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

export default EditLanguageRegionScreen;
