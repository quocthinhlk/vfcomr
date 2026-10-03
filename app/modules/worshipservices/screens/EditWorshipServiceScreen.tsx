import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {
  updateWorshipService,
  getWorshipServiceById,
} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import api from '../../../config/api';
import {ScreenContainer} from '../../../shared/components/crud';
import {WorshipServiceForm} from '../components/WorshipServiceForm';

export const EditWorshipServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const worshipServiceId: number | undefined = route.params?.worshipServiceId;
  const [name, setName] = useState('');
  const [dayName, setDayName] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const dayNameOptions = [
    {label: 'Sunday', value: 'Sunday'},
    {label: 'Monday', value: 'Monday'},
    {label: 'Tuesday', value: 'Tuesday'},
    {label: 'Wednesday', value: 'Wednesday'},
    {label: 'Thursday', value: 'Thursday'},
    {label: 'Friday', value: 'Friday'},
    {label: 'Saturday', value: 'Saturday'},
  ];

  useEffect(() => {
    let mounted = true;
    if (worshipServiceId) {
      getWorshipServiceById(worshipServiceId)
        .then(res => {
          if (!mounted) {
            return;
          }
          const service = res?.data;
          if (service) {
            setName(service.name || '');
            setDayName(service.day_name || null);
            setTime(service.time || null);
            setChurchId(service.church_id);
            // Fetch church name
            if (service.church_id) {
              api
                .get(`churches/${service.church_id}`)
                .then(churchRes => {
                  const churchData = churchRes?.data?.data;
                  if (churchData?.name && mounted) {
                    setChurchName(churchData.name);
                  }
                })
                .catch(() => {});
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [worshipServiceId]);

  const onSave = async () => {
    if (!worshipServiceId) return;

    const newInvalid: Record<string, boolean> = {};
    newInvalid.name = !name.trim();
    newInvalid.dayName = !dayName;
    newInvalid.time = !time;

    setInvalid(newInvalid);

    if (newInvalid.name || newInvalid.dayName || newInvalid.time) {
      return;
    }

    try {
      setSubmitting(true);
      await updateWorshipService(worshipServiceId, {
        name: name.trim(),
        day_name: dayName as string,
        time: time as string,
      });
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('worshipService') || 'Worship Service'} ${t('success') || 'success'}`,
      );
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToUpdateWorshipService') || 'Failed to update Worship Service',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title = `${t('update') || 'Update'} ${t('worshipService') || 'Worship Service'}`;

  return (
    <ScreenContainer title={title} loading={loading}>
      <WorshipServiceForm
        subtitle={
          churchName
            ? `${title} ${t('for') || 'for'} ${churchName}`
            : undefined
        }
        name={name}
        onNameChange={text => {
          setName(text);
          clearInvalid('name');
        }}
        dayName={dayName}
        onDayNameChange={v => {
          setDayName(v);
          clearInvalid('dayName');
        }}
        dayNameOptions={dayNameOptions}
        time={time}
        onTimeChange={val => {
          setTime(val);
          clearInvalid('time');
        }}
        invalid={invalid}
        submitting={submitting}
        onSave={onSave}
        onCancel={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default EditWorshipServiceScreen;
