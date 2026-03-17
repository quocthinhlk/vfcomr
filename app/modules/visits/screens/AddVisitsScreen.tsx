import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {createVisitsBulk, CreateVisitPayload} from '../services/visit.service';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import {COLORS} from '../../../shared/constants/colors';

interface VisitFormItem {
  year: number;
  week_number: number | null;
  number_of_days: number | null;
}

export const AddVisitsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  // Screen chưa hoàn thiện → tạm thời khóa các CTA chính để tránh user thao tác.
  const screenDisabled = true;
  const [visits, setVisits] = useState<VisitFormItem[]>([
    {
      year: new Date().getFullYear(),
      week_number: null,
      number_of_days: null,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<number, Record<string, boolean>>>({});
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const {t} = useTranslation();
  const C = useThemedColors();

  const clearInvalid = (index: number, key: string) =>
    setInvalid(prev => ({
      ...prev,
      [index]: {...(prev[index] || {}), [key]: false},
    }));

  const yearOptions = Array.from({length: 10}, (_, i) => {
    const y = new Date().getFullYear() - 5 + i;
    return {label: String(y), value: y};
  });

  const weekOptions = Array.from({length: 52}, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  const daysOptions = Array.from({length: 7}, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Get user ID
        const userRes = await api.get('users/me');
        const userData = userRes?.data?.data;
        if (userData?.id && mounted) {
          setUserId(userData.id);
        }

        // Get church ID
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (!savedChurchId) {
          Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          navigation.goBack();
          return;
        }
        const id = parseInt(savedChurchId, 10);
        if (isNaN(id)) {
          Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
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
        console.error('Error fetching info:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation, t]);

  const addVisit = () => {
    if (screenDisabled) {
      return;
    }
    setVisits([
      ...visits,
      {
        year: new Date().getFullYear(),
        week_number: null,
        number_of_days: null,
      },
    ]);
  };

  const removeVisit = (index: number) => {
    if (screenDisabled) {
      return;
    }
    if (visits.length > 1) {
      setVisits(visits.filter((_, i) => i !== index));
      setInvalid(prev => {
        const newInvalid = {...prev};
        delete newInvalid[index];
        // Reindex
        const reindexed: Record<number, Record<string, boolean>> = {};
        Object.keys(newInvalid).forEach(key => {
          const oldIndex = parseInt(key, 10);
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = newInvalid[oldIndex];
          } else if (oldIndex < index) {
            reindexed[oldIndex] = newInvalid[oldIndex];
          }
        });
        return reindexed;
      });
    }
  };

  const updateVisit = (index: number, field: keyof VisitFormItem, value: any) => {
    setVisits(prev => {
      const updated = [...prev];
      updated[index] = {...updated[index], [field]: value};
      return updated;
    });
    clearInvalid(index, field);
  };

  const onSave = async () => {
    if (screenDisabled) {
      return;
    }
    if (!churchId || !userId) {
      Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
      return;
    }

    const newInvalid: Record<number, Record<string, boolean>> = {};
    let hasError = false;

    visits.forEach((visit, index) => {
      const visitInvalid: Record<string, boolean> = {};
      visitInvalid.week_number = visit.week_number === null;
      visitInvalid.number_of_days = visit.number_of_days === null;
      
      if (visitInvalid.week_number || visitInvalid.number_of_days) {
        hasError = true;
        newInvalid[index] = visitInvalid;
      }
    });

    setInvalid(newInvalid);

    if (hasError) {
      return;
    }

    try {
      setSubmitting(true);
      const payloads: CreateVisitPayload[] = visits.map(visit => ({
        user_id: userId,
        church_id: churchId,
        year: visit.year,
        week_number: visit.week_number!,
        number_of_days: visit.number_of_days!,
      }));

      await createVisitsBulk(payloads);
      Alert.alert(
        t('success') || 'Success',
        t('visitsCreatedSuccess') || 'Visits created successfully!',
      );
      navigation.navigate('Visits', {reload: true});
    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message || t('failedToCreateVisits') || 'Failed to create visits',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{flex: 1}}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={styles.container}>
            <Header
              title={t('addVisits') || 'Add Visits'}
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

            {screenDisabled ? (
              <View
                style={[
                  styles.devNotice,
                  {backgroundColor: 'rgba(219,45,45,0.08)', borderColor: COLORS.dangerColor},
                ]}>
                <Text style={[styles.devNoticeText, {color: COLORS.dangerColor}]}>
                  {t('featureUnderDevelopment') ||
                    'Tính năng này đang được hoàn thiện. Vui lòng quay lại sau.'}
                </Text>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              <View style={styles.form}>
                {visits.map((visit, index) => (
                  <View
                    key={index}
                    style={[styles.visitCard, {backgroundColor: C.surface, borderColor: C.border}]}>
                    <View style={styles.visitHeader}>
                      <Text style={[styles.visitTitle, {color: C.textPrimary}]}>
                        {t('visit') || 'Visit'} {index + 1}
                      </Text>
                      {visits.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeVisit(index)}
                          disabled={screenDisabled}
                          style={[
                            styles.removeBtn,
                            {backgroundColor: COLORS.dangerColor},
                            screenDisabled ? styles.disabledTouchable : null,
                          ]}>
                          <Text style={styles.removeBtnText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('year') || 'Year'} *
                      </Text>
                      <ElementDropdown
                        data={yearOptions}
                        value={visit.year as any}
                        onChange={v => updateVisit(index, 'year', v as number)}
                        placeholder={t('year') || 'Year'}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: C.inputBorder,
                          } as any
                        }
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('week') || 'Week'} *
                      </Text>
                      <ElementDropdown
                        data={weekOptions}
                        value={visit.week_number as any}
                        onChange={v => updateVisit(index, 'week_number', v as number)}
                        placeholder={t('week') || 'Week'}
                        error={!!invalid[index]?.week_number}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: invalid[index]?.week_number ? '#db2d2d' : C.inputBorder,
                          } as any
                        }
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('numberOfDays') || 'Number of Days'} *
                      </Text>
                      <ElementDropdown
                        data={daysOptions}
                        value={visit.number_of_days as any}
                        onChange={v => updateVisit(index, 'number_of_days', v as number)}
                        placeholder={t('numberOfDays') || 'Number of Days'}
                        error={!!invalid[index]?.number_of_days}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: invalid[index]?.number_of_days ? '#db2d2d' : C.inputBorder,
                          } as any
                        }
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={addVisit}
                  disabled={screenDisabled}
                  style={[
                    styles.addBtn,
                    {backgroundColor: C.surface, borderColor: C.border},
                    screenDisabled ? styles.disabledTouchable : null,
                  ]}>
                  <Text style={[styles.addBtnText, {color: C.textPrimary}]}>
                    + {t('addVisit') || 'Add Visit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.actions, {borderTopColor: C.border}]}>
              <CancelButton
                label={t('cancel') || 'Cancel'}
                onPress={() => navigation.goBack()}
                disabled={submitting}
              />
              <SaveButton
                label={t('save') || 'Save'}
                onPress={onSave}
                disabled={screenDisabled || submitting}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  devNotice: {
    marginBottom: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  devNoticeText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(8),
    gap: ms(16),
  },
  visitCard: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: rs(8),
    elevation: 3,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(12),
  },
  visitTitle: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  removeBtn: {
    width: ms(28),
    height: ms(28),
    borderRadius: rs(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: fs(20),
    fontWeight: 'bold',
  },
  disabledTouchable: {
    opacity: 0.45,
  },
  field: {
    marginBottom: ms(12),
  },
  fieldLabel: {
    fontSize: fs(14),
    fontWeight: '500',
    marginBottom: ms(6),
  },
  addBtn: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    paddingVertical: ms(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
  },
});

export default AddVisitsScreen;

