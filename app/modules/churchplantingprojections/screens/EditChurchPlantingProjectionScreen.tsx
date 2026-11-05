import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  ChurchPlantingProjectionItem,
  getChurchPlantingProjectionById,
  updateChurchPlantingProjection,
} from '../services/churchPlantingProjection.service';
import {ScreenContainer} from '../../../shared/components/crud';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import api from '../../../config/api';
import ProjectionForm, {firstInvalidField} from '../components/ProjectionForm';
import {useCountryOptions} from '../hooks/useCountryOptions';
import {
  EMPTY_PROJECTION_FORM,
  ProjectionFormField,
  ProjectionFormValues,
  buildUpdatePayload,
  formValuesFromProjection,
  validateProjectionForm,
} from '../utils/projection.utils';

export const EditChurchPlantingProjectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectionId: number | undefined = route.params?.projectionId;
  const {t} = useTranslation();
  const [projection, setProjection] = useState<ChurchPlantingProjectionItem | null>(null);
  const [values, setValues] = useState<ProjectionFormValues>(EMPTY_PROJECTION_FORM);
  const [invalid, setInvalid] = useState<Partial<Record<ProjectionFormField, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const scrollToFieldRef = useRef<((key: ProjectionFormField) => void) | null>(null);
  const submitOnce = useSubmitOnce();
  const countries = useCountryOptions();
  const {fetchPage, ensureSelected} = countries;

  // Named so the error state's "Try again" can re-run it.
  const loadProjection = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    if (!projectionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res] = await Promise.all([
        getChurchPlantingProjectionById(projectionId),
        fetchPage(1, ''),
      ]);
      if (!isCurrent()) {
        return;
      }
      const data = res?.data;
      if (!data) {
        throw new Error('Projection not found');
      }
      setProjection(data);
      setValues(formValuesFromProjection(data));
      // The saved nation is usually not on the first page of countries.
      ensureSelected(data.country_id);
      if (data.church_id) {
        api
          .get(`churches/${data.church_id}`)
          .then(churchRes => {
            const name = churchRes?.data?.data?.name;
            if (name && isCurrent()) {
              setChurchName(name);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching church planting projection:', e);
        // Never show a blank form the user could save over real data.
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [projectionId, fetchPage, ensureSelected]);

  useEffect(() => {
    mountedRef.current = true;
    loadProjection();
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, [loadProjection]);

  const onChange = useCallback(
    <K extends ProjectionFormField>(key: K, value: ProjectionFormValues[K]) => {
      setValues(prev => ({...prev, [key]: value}));
      setInvalid(prev => (prev[key] ? {...prev, [key]: false} : prev));
    },
    [],
  );

  const onSave = submitOnce(async () => {
    if (!projectionId || !projection || loadError) {
      return;
    }
    const nextInvalid = validateProjectionForm(values, 'edit');
    setInvalid(nextInvalid);
    const first = firstInvalidField(nextInvalid);
    if (first) {
      scrollToFieldRef.current?.(first);
      return;
    }
    try {
      setSubmitting(true);
      await updateChurchPlantingProjection(projectionId, buildUpdatePayload(values, projection));
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('churchPlantingProjection') || 'Church Planting Projection'} ${t('success') || 'success'}`,
      );
      markDataChanged('churchPlantingProjections');
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToUpdateProjection') || 'Failed to update Church Planting Projection',
      );
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  const title = `${t('update') || 'Update'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`;

  return (
    <ScreenContainer
      title={title}
      loading={loading}
      error={loadError}
      errorMessage={!loading && !loadError && !projectionId ? t('noDataFound') : undefined}
      onRetry={loadProjection}>
      {projection ? (
        <ProjectionForm
          heading={churchName ? `${title} ${t('for') || 'for'} ${churchName}` : undefined}
          values={values}
          onChange={onChange}
          invalid={invalid}
          datesRequired={false}
          countries={countries}
          submitting={submitting}
          onCancel={() => navigation.goBack()}
          onSave={onSave}
          scrollToFieldRef={scrollToFieldRef}
        />
      ) : null}
    </ScreenContainer>
  );
};

export default EditChurchPlantingProjectionScreen;
