import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createChurchPlantingProjection} from '../services/churchPlantingProjection.service';
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
  addMonths,
  buildCreatePayload,
  validateProjectionForm,
} from '../utils/projection.utils';

export const AddChurchPlantingProjectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [values, setValues] = useState<ProjectionFormValues>(EMPTY_PROJECTION_FORM);
  const [invalid, setInvalid] = useState<Partial<Record<ProjectionFormField, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState('');
  // Church + countries are required by the form: if they fail (e.g. offline)
  // show a retryable error instead of a form with an empty Nation dropdown.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  // The pioneering date follows preparation + 6 months (the web's default)
  // until the user picks one.
  const pioneeringTouchedRef = useRef(false);
  const scrollToFieldRef = useRef<((key: ProjectionFormField) => void) | null>(null);
  // One save at a time: a fast double tap created the projection twice.
  const submitOnce = useSubmitOnce();
  const countries = useCountryOptions();
  const {fetchPage} = countries;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      const id = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
      if (isNaN(id)) {
        Alert.alert(
          t('error') || 'Error',
          savedChurchId
            ? t('invalidChurchId') || 'Invalid Church ID'
            : t('churchIdNotFound') || 'Church ID not found',
        );
        navigation.goBack();
        return;
      }
      setChurchId(id);
      const [churchRes] = await Promise.all([api.get(`churches/${id}`), fetchPage(1, '')]);
      if (mountedRef.current) {
        setChurchName(churchRes?.data?.data?.name || '');
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
  }, [navigation, t, fetchPage]);

  useEffect(() => {
    mountedRef.current = true;
    loadInitial();
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitial]);

  const onChange = useCallback(
    <K extends ProjectionFormField>(key: K, value: ProjectionFormValues[K]) => {
      if (key === 'startDatePioneering') {
        pioneeringTouchedRef.current = true;
      }
      setValues(prev => {
        const next = {...prev, [key]: value};
        if (key === 'startDatePreparation' && !pioneeringTouchedRef.current) {
          next.startDatePioneering = value ? addMonths(value as Date, 6) : null;
        }
        return next;
      });
      setInvalid(prev => {
        const autoPioneering = key === 'startDatePreparation' && !pioneeringTouchedRef.current;
        if (!prev[key] && !(autoPioneering && prev.startDatePioneering)) {
          return prev;
        }
        const next = {...prev, [key]: false};
        if (autoPioneering && value) {
          next.startDatePioneering = false;
        }
        return next;
      });
    },
    [],
  );

  const onSave = submitOnce(async () => {
    if (!churchId) {
      Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
      return;
    }
    const nextInvalid = validateProjectionForm(values, 'create');
    setInvalid(nextInvalid);
    const first = firstInvalidField(nextInvalid);
    if (first) {
      scrollToFieldRef.current?.(first);
      return;
    }
    try {
      setSubmitting(true);
      await createChurchPlantingProjection(buildCreatePayload(values, churchId));
      Alert.alert(
        t('success') || 'Success',
        `${t('add') || 'Add'} ${t('churchPlantingProjection') || 'Church Planting Projection'} ${t('success') || 'success'}`,
      );
      // React Navigation 7's navigate pushes another list on top, so Back led
      // to the filled form again (a second Save made a duplicate). Go back to
      // the list below, or replace this form with it (opened from the dashboard).
      markDataChanged('churchPlantingProjections');
      const params = {reload: true, refetchKey: Date.now()};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'ChurchPlantingProjections') && navigation.popTo) {
        navigation.popTo('ChurchPlantingProjections', params);
      } else if (navigation.replace) {
        navigation.replace('ChurchPlantingProjections', params);
      } else {
        navigation.navigate('ChurchPlantingProjections', params);
      }
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToCreateProjection') || 'Failed to create Church Planting Projection',
      );
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  const title = `${t('create') || 'Create'} ${t('churchPlantingProjection') || 'Church Planting Projection'}`;

  return (
    <ScreenContainer title={title} loading={loading} error={loadError} onRetry={loadInitial}>
      <ProjectionForm
        heading={churchName ? `${title} ${t('for') || 'for'} ${churchName}` : undefined}
        values={values}
        onChange={onChange}
        invalid={invalid}
        datesRequired
        countries={countries}
        submitting={submitting}
        onCancel={() => navigation.goBack()}
        onSave={onSave}
        scrollToFieldRef={scrollToFieldRef}
      />
    </ScreenContainer>
  );
};

export default AddChurchPlantingProjectionScreen;
