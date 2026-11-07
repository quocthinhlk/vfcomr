import React, {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createWorshipService} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import {ScreenContainer} from '../../../shared/components/crud';
import {WorshipServiceForm} from '../components/WorshipServiceForm';
import {
  buildWorshipServicePayload,
  dayOptions,
  validateWorshipService,
  WorshipServiceErrors,
} from '../utils/worshipService.utils';

export const AddWorshipServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [dayName, setDayName] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<WorshipServiceErrors>({});
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();
  // A fast double tap on Save created the service twice.
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        const id = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
        if (Number.isNaN(id)) {
          Alert.alert(
            t('error') || 'Error',
            savedChurchId ? t('invalidChurchId') : t('churchIdNotFound'),
          );
          navigation.goBack();
          return;
        }
        if (!mounted) {
          return;
        }
        setChurchId(id);
        const res = await api.get(`churches/${id}`);
        const churchData = res?.data?.data;
        if (churchData?.name && mounted) {
          setChurchName(String(churchData.name).trim());
        }
      } catch (e) {
        console.error('Error fetching church info:', e);
      }
    })();
    return () => {
      mounted = false;
    };
    // Once on open (t changing with the language must not run it again).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = submitOnce(async () => {
    if (!churchId) {
      Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
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
      await createWorshipService(churchId, buildWorshipServicePayload(values));
      markDataChanged('worshipServices');
      Alert.alert(
        t('success') || 'Success',
        `${t('add') || 'Add'} ${t('worshipService') || 'Worship Service'} ${t('success') || 'success'}`,
      );
      // React Navigation 7's navigate pushed a second list on top, so Back
      // reopened the filled form.
      const params = {reload: true};
      const routes: {name: string}[] = navigation.getState?.()?.routes ?? [];
      if (routes.some(r => r.name === 'WorshipServices') && navigation.popTo) {
        navigation.popTo('WorshipServices', params);
      } else if (navigation.replace) {
        navigation.replace('WorshipServices', params);
      } else {
        navigation.navigate('WorshipServices', params);
      }
    } catch (e) {
      Alert.alert(
        t('error') || 'Error',
        getApiErrorMessage(e, t) || t('failedToCreateWorshipService'),
      );
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  const title = `${t('create') || 'Create'} ${t('worshipService') || 'Worship Service'}`;

  return (
    <ScreenContainer title={title}>
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

export default AddWorshipServiceScreen;
