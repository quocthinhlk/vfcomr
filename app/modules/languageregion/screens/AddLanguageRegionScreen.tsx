import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  LanguageRegionItem,
  createLanguageRegion,
  listLanguageRegions,
} from '../services/languageregion.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
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

export const AddLanguageRegionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [values, setValues] = useState<LanguageRegionFormValues>({
    name: '',
    parentId: null,
    disabled: false,
  });
  const [nameError, setNameError] = useState<RegionNameError | null>(null);
  const [regions, setRegions] = useState<LanguageRegionItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // The parent list failed silently before (empty dropdown): show a retry.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  // One save at a time: a fast double tap created the region twice.
  const submitOnce = useSubmitOnce();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listLanguageRegions();
      if (mountedRef.current) {
        setRegions(res?.data?.items ?? []);
      }
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

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
    const error = validateRegionName(values.name, regions);
    if (error) {
      setNameError(error);
      return;
    }
    try {
      setSubmitting(true);
      await createLanguageRegion({
        name: cleanRegionName(values.name),
        parent_id: values.parentId,
        disabled: values.disabled,
      });
      markDataChanged('languageRegions');
      Alert.alert(t('success') || 'Success', `${t('add')} ${t('languageRegion')} ${t('success')}`);
      // React Navigation 7's navigate pushes a second list on top, so Back
      // reopened the filled form.
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'LanguageRegions') && navigation.popTo) {
        navigation.popTo('LanguageRegions', params);
      } else if (navigation.replace) {
        navigation.replace('LanguageRegions', params);
      } else {
        navigation.navigate('LanguageRegions', params);
      }
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
      title={`${t('addNew')} ${t('languageRegion')}`}
      scroll
      loading={loading}
      error={loadError}
      onRetry={load}>
      <LanguageRegionForm
        values={values}
        onChange={onChange}
        nameError={nameError}
        parentOptions={parentOptions(regions)}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default AddLanguageRegionScreen;
