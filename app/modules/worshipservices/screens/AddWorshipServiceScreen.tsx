import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {createWorshipService} from '../services/worshipService.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import {ScreenContainer} from '../../../shared/components/crud';
import {WorshipServiceForm} from '../components/WorshipServiceForm';

export const AddWorshipServiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [dayName, setDayName] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
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
    (async () => {
      try {
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', 'Church ID not found');
          navigation.goBack();
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', 'Invalid Church ID');
          navigation.goBack();
          return;
        }
        setChurchId(id);
        // Fetch church name
        const res = await api.get(`churches/${id}`);
        const churchData = res?.data?.data;
        if (churchData?.name && mounted) {
          setChurchName(churchData.name);
        }
      } catch (e) {
        console.error('Error fetching church info:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation, t]);

  const onSave = async () => {
    if (!churchId) {
      Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
      return;
    }

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
      await createWorshipService(churchId, {
        name: name.trim(),
        day_name: dayName as string,
        time: time as string,
      });
      Alert.alert(
        t('success') || 'Success',
        `${t('add') || 'Add'} ${t('worshipService') || 'Worship Service'} ${t('success') || 'success'}`,
      );
      navigation.navigate('WorshipServices', {reload: true});
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToCreateWorshipService') || 'Failed to create Worship Service',
      );
    } finally {
      setSubmitting(false);
    }
  };

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

export default AddWorshipServiceScreen;
