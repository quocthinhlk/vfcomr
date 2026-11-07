import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  updateWorshipService,
  getWorshipServiceById,
} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import api from '../../../config/api';
import {ScreenContainer} from '../../../shared/components/crud';
import {WorshipServiceForm} from '../components/WorshipServiceForm';
import {
  buildWorshipServicePayload,
  canonicalDay,
  dayOptions,
  validateWorshipService,
  WorshipServiceErrors,
} from '../utils/worshipService.utils';

export const EditWorshipServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [name, setName] = useState('');
  const [dayName, setDayName] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<WorshipServiceErrors>({});
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();
  // A second tap while saving sent the PATCH twice.
  const submitOnce = useSubmitOnce();
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const clearError = (key: keyof WorshipServiceErrors) =>
    setErrors(prev => (prev[key] ? {...prev, [key]: undefined} : prev));

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const loadService = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    if (!worshipServiceId) {
      setLoading(false);
      return;
    }
    // Retry showed the error until the answer came back.
    setLoading(true);
    try {
      const res = await getWorshipServiceById(worshipServiceId);
      if (!isCurrent()) {
        return;
      }
      const service = res?.data;
      if (service) {
        setName(service.name || '');
        // "monday" was not matched by the picker and showed no day.
        setDayName(canonicalDay(service.day_name) || null);
        setTime(service.time || null);
        // Fetch church name
        if (service.church_id) {
          api
            .get(`churches/${service.church_id}`)
            .then(churchRes => {
              const churchData = churchRes?.data?.data;
              if (churchData?.name && isCurrent()) {
                setChurchName(String(churchData.name).trim());
              }
            })
            .catch(() => {});
        }
      }
      setLoadError(null);
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching worship service:', e);
        // Never show a blank form the user could save over real data.
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [worshipServiceId]);

  useEffect(() => {
    loadService();
    return () => {
      requestRef.current += 1;
    };
  }, [loadService]);

  const onSave = submitOnce(async () => {
    if (!worshipServiceId || loadError) {
      return;
    }
    const values = {name, dayName, time};
    const local = validateWorshipService(values, t);
    setErrors(local);
    if (Object.keys(local).length) {
      return;
    }

    try {
      setSubmitting(true);
      await updateWorshipService(worshipServiceId, buildWorshipServicePayload(values));
      markDataChanged('worshipServices');
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('worshipService') || 'Worship Service'} ${t('success') || 'success'}`,
      );
      returnAfterEdit(navigation);
    } catch (e) {
      Alert.alert(
        t('error') || 'Error',
        getApiErrorMessage(e, t) || t('failedToUpdateWorshipService'),
      );
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  const title = `${t('update') || 'Update'} ${t('worshipService') || 'Worship Service'}`;

  return (
    <ScreenContainer
      title={title}
      loading={loading}
      error={loadError}
      onRetry={loadService}>
      <WorshipServiceForm
        subtitle={
          churchName
            ? `${title} ${t('for') || 'for'} ${churchName}`
            : undefined
        }
        name={name}
        onNameChange={text => {
          setName(text);
          clearError('name');
        }}
        dayName={dayName}
        onDayNameChange={v => {
          setDayName(v);
          clearError('dayName');
        }}
        dayNameOptions={dayOptions(t, dayName)}
        time={time}
        onTimeChange={val => {
          setTime(val);
          if (val) {
            clearError('time');
          }
        }}
        errors={errors}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default EditWorshipServiceScreen;
