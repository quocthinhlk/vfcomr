import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  LanguageRegionItem,
  getLanguageRegionById,
  listLanguageRegions,
  updateLanguageRegion,
} from '../services/languageregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {fixMojibake} from '../../../shared/utils/displayText';
import {ScreenContainer} from '../../../shared/components/crud';
import LanguageRegionForm, {
  LanguageRegionFormValues,
} from '../components/LanguageRegionForm';
import {
  RegionNameError,
  cleanRegionName,
  parentOptions,
  validateRegionName,
} from '../utils/languageRegion.utils';

export const EditLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const languageRegionId: number | undefined = route.params?.languageRegionId;
  const {t} = useTranslation();
  const [values, setValues] = useState<LanguageRegionFormValues>({
    name: '',
    parentId: null,
    disabled: false,
  });
  const [saved, setSaved] = useState<LanguageRegionItem | null>(null);
  const [regions, setRegions] = useState<LanguageRegionItem[]>([]);
  const [nameError, setNameError] = useState<RegionNameError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!languageRegionId);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  // One save at a time: a fast double tap sent the update twice.
  const submitOnce = useSubmitOnce();

  // Record and parent list together: without the list the saved parent
  // showed blank and could be lost on save (it failed silently before).
  const load = useCallback(async () => {
    if (!languageRegionId) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, list] = await Promise.all([
        getLanguageRegionById(languageRegionId),
        listLanguageRegions(),
      ]);
      if (!mountedRef.current) {
        return;
      }
      const data = res?.data;
      if (!data) {
        throw new Error('');
      }
      setSaved(data);
      setRegions(list?.data?.items ?? []);
      setValues({
        // Broken UTF-8 repaired, so saving does not keep "PortuguÃªs".
        name: fixMojibake(data.name || ''),
        parentId: data.parent_id || null,
        disabled: !!data.disabled,
      });
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
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const onChange = useCallback(
    <K extends keyof LanguageRegionFormValues>(key: K, value: LanguageRegionFormValues[K]) => {
      setValues(prev => ({...prev, [key]: value}));
      if (key === 'name') {
        setNameError(null);
      }
    },
    [],
  );

  const onSave = submitOnce(async () => {
    if (!languageRegionId || !saved) {
      return;
    }
    const error = validateRegionName(values.name, regions, languageRegionId, saved.name);
    if (error) {
      setNameError(error);
      return;
    }
    try {
      setSubmitting(true);
      await updateLanguageRegion(languageRegionId, {
        name: cleanRegionName(values.name),
        parent_id: values.parentId,
        disabled: values.disabled,
      });
      markDataChanged('languageRegions');
      if (saved.parent_id && !values.parentId) {
        // The API answers success but keeps the parent when it gets null.
        const check = await getLanguageRegionById(languageRegionId).catch(() => null);
        const kept = check?.data?.parent_id;
        if (kept) {
          if (mountedRef.current) {
            setValues(prev => ({...prev, parentId: kept}));
          }
          Alert.alert(t('error') || 'Error', t('churchRegionParentNotRemoved'));
          return;
        }
      }
      Alert.alert(t('success') || 'Success', `${t('edit')} ${t('languageRegion')} ${t('success')}`);
      returnAfterEdit(navigation);
    } catch (e) {
      // The API's reason instead of a fixed English text.
      Alert.alert(t('error') || 'Error', getApiErrorMessage(e, t));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  return (
    <ScreenContainer
      title={`${t('edit')} ${t('languageRegion')}`}
      scroll
      loading={loading}
      error={loadError}
      errorMessage={!languageRegionId ? t('noDataFound') : undefined}
      onRetry={load}>
      <LanguageRegionForm
        values={values}
        onChange={onChange}
        nameError={nameError}
        parentOptions={parentOptions(regions, languageRegionId, saved?.parent_id)}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default EditLanguageRegionScreen;
