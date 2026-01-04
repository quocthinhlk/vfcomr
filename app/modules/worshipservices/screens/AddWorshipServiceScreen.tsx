import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {createWorshipService} from '../services/worshipService.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import TimePicker from '../../../shared/components/TimePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';

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
  const C = useThemedColors();

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

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={`${t('create') || 'Create'} ${t('worshipService') || 'Worship Service'}`}
            showMenu={false}
          />
          
          {churchName ? (
            <View style={[styles.churchNameContainer, {backgroundColor: C.surface, borderColor: C.border}]}>
              <Text style={[styles.churchNameLabel, {color: C.textSecondary}]}>
                {t('church') || 'Church'}:{' '}
              </Text>
              <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
                {churchName}
              </Text>
            </View>
          ) : null}
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={
              Platform.OS === 'ios'
                ? hs(64)
                : (StatusBar.currentHeight || 0) + hs(50)
            }
            style={{flex: 1}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('name') || 'Name'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <AppInput
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      clearInvalid('name');
                    }}
                    placeholder={t('name') || 'Name'}
                    error={!!invalid.name}
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('day') || 'Day'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <ElementDropdown
                    data={dayNameOptions}
                    value={dayName as any}
                    onChange={v => {
                      setDayName(v as string);
                      clearInvalid('dayName');
                    }}
                    placeholder={t('selectDay') || 'Select Day'}
                    error={!!invalid.dayName}
                    containerStyle={
                      {
                        backgroundColor: C.inputBg,
                        borderColor: invalid.dayName ? '#db2d2d' : C.inputBorder,
                      } as any
                    }
                  />
                </View>

                <View style={styles.field}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('time') || 'Time'}{' '}
                    <Text style={{color: '#c00000'}}>*</Text>
                  </Text>
                  <TimePicker 
                    value={time} 
                    onChange={(val) => {
                      setTime(val);
                      clearInvalid('time');
                    }}
                    error={!!invalid.time}
                  />
                </View>

                <View style={formStyles.buttonRow}>
                  <CancelButton
                    label={t('cancel') || 'Cancel'}
                    onPress={() => navigation.goBack()}
                    disabled={submitting}
                  />
                  <SaveButton
                    label={t('save') || 'Save'}
                    onPress={onSave}
                    disabled={submitting}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  churchNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(8),
    marginBottom: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  churchNameLabel: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  churchNameText: {
    fontSize: fs(14),
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(8),
    gap: ms(16),
  },
  field: {
    marginBottom: ms(8),
  },
});

export default AddWorshipServiceScreen;
