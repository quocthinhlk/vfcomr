import React, {useEffect, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import api from '../../../config/api';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {formStyles} from '../../../shared/styles/form';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {CancelButton, SaveButton} from '../../../shared/components/ActionButtons';
import {createOverseerGoalPeriod} from '../services/overseerGoals.service';
import {fs, ms} from '../../../shared/utils/scale';

const AddOverseerGoalsScreen = () => {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const {t} = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<number | null>(null);
  const [localChurchId, setLocalChurchId] = useState<number | null>(null);
  const [nationId, setNationId] = useState<number | null>(null);
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [userOptions, setUserOptions] = useState<Array<{label: string; value: number}>>([]);
  const [churchOptions, setChurchOptions] = useState<
    Array<{label: string; value: number}>
  >([]);
  const [nationOptions, setNationOptions] = useState<
    Array<{label: string; value: number}>
  >([]);

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const normalizePositiveNumberInput = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    return digitsOnly;
  };

  const loadUsers = async (search = '') => {
    const res = await api.get('users/overseers', {
      params: {page: 1, limit: 50, ...(search ? {search} : {})},
    });
    const items = res?.data?.data?.items ?? [];
    setUserOptions(
      items.map((item: any) => ({
        label: item.name,
        value: item.id,
      })),
    );
  };

  const loadChurches = async (search = '') => {
    const res = await api.get('churches', {
      params: {page: 1, limit: 50, ...(search ? {search} : {})},
    });
    const items = res?.data?.data?.items ?? [];
    setChurchOptions(
      items.map((item: any) => ({
        label: item.name,
        value: item.id,
      })),
    );
  };

  const loadNations = async (search = '') => {
    const res = await api.get('countries', {
      params: {page: 1, limit: 50, ...(search ? {name: search} : {})},
    });
    const items = res?.data?.data?.items ?? [];
    setNationOptions(
      items.map((item: any) => ({
        label: item.name,
        value: item.id,
      })),
    );
  };

  useEffect(() => {
    Promise.all([loadUsers(), loadChurches(), loadNations()]).catch(error => {
      console.error('Failed to load add goal period form data:', error);
    });
  }, []);

  const onSave = async () => {
    const startYearNumber = Number(startYear);
    const endYearNumber = Number(endYear);
    const nextInvalid: Record<string, boolean> = {
      userId: !userId,
      localChurchId: !localChurchId,
      nationId: !nationId,
      startYear:
        !startYear.trim() ||
        !Number.isFinite(startYearNumber) ||
        startYearNumber <= 0,
      endYear:
        !endYear.trim() || !Number.isFinite(endYearNumber) || endYearNumber <= 0,
    };
    setInvalid(nextInvalid);

    if (Object.values(nextInvalid).some(Boolean)) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await createOverseerGoalPeriod({
        user_id: Number(userId),
        local_church_id: Number(localChurchId),
        nation_id: Number(nationId),
        start_year: startYearNumber,
        end_year: endYearNumber,
      });
      const createdId =
        response?.data?.goal_period?.id ?? response?.data?.id ?? response?.goal_period?.id;

      Alert.alert(t('success'), t('goalPeriodCreatedSuccess'));
      if (createdId) {
        navigation.replace('OverseerGoalDetail', {goalPeriodId: createdId});
      } else {
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('failedToCreateGoalPeriod'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('addGoalPeriod')} showMenu={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={
            Platform.OS === 'ios'
              ? ms(64)
              : (StatusBar.currentHeight || 0) + ms(50)
          }
          style={{flex: 1}}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[formStyles.label, {color: C.textSecondary}]}>
                  {t('assignedTo')} <Text style={styles.required}>*</Text>
                </Text>
                <ElementDropdown
                  data={userOptions}
                  value={userId}
                  onChange={value => {
                    setUserId(value as number);
                    clearInvalid('userId');
                  }}
                  placeholder={t('selectAssignedTo')}
                  error={!!invalid.userId}
                  onSearchText={text => loadUsers(text)}
                />
              </View>

              <View style={styles.field}>
                <Text style={[formStyles.label, {color: C.textSecondary}]}>
                  {t('church')} <Text style={styles.required}>*</Text>
                </Text>
                <ElementDropdown
                  data={churchOptions}
                  value={localChurchId}
                  onChange={value => {
                    setLocalChurchId(value as number);
                    clearInvalid('localChurchId');
                  }}
                  placeholder={t('selectChurch')}
                  error={!!invalid.localChurchId}
                  onSearchText={text => loadChurches(text)}
                />
              </View>

              <View style={styles.field}>
                <Text style={[formStyles.label, {color: C.textSecondary}]}>
                  {t('nation')} <Text style={styles.required}>*</Text>
                </Text>
                <ElementDropdown
                  data={nationOptions}
                  value={nationId}
                  onChange={value => {
                    setNationId(value as number);
                    clearInvalid('nationId');
                  }}
                  placeholder={t('selectNation')}
                  error={!!invalid.nationId}
                  onSearchText={text => loadNations(text)}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                  <Text style={[formStyles.label, {color: C.textSecondary}]}>
                    {t('startYear')} <Text style={styles.required}>*</Text>
                  </Text>
                  <AppInput
                    value={startYear}
                    onChangeText={text => {
                      setStartYear(normalizePositiveNumberInput(text));
                      clearInvalid('startYear');
                    }}
                    placeholder={t('startYear')}
                    keyboardType="numeric"
                    error={!!invalid.startYear}
                  />
                </View>

                <View style={[styles.field, styles.halfField]}>
                  <Text style={[formStyles.label, {color: C.textSecondary}]}>
                    {t('endYear')} <Text style={styles.required}>*</Text>
                  </Text>
                  <AppInput
                    value={endYear}
                    onChangeText={text => {
                      setEndYear(normalizePositiveNumberInput(text));
                      clearInvalid('endYear');
                    }}
                    placeholder={t('endYear')}
                    keyboardType="numeric"
                    error={!!invalid.endYear}
                  />
                </View>
              </View>

              <View style={formStyles.buttonRow}>
                <CancelButton
                  label={t('cancel')}
                  onPress={() => navigation.goBack()}
                  disabled={submitting}
                />
                <SaveButton
                  label={submitting ? t('saving') : t('save')}
                  onPress={onSave}
                  disabled={submitting}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(8),
    gap: ms(14),
  },
  field: {
    marginBottom: ms(2),
  },
  row: {
    flexDirection: 'row',
    gap: ms(12),
  },
  halfField: {
    flex: 1,
  },
  required: {
    color: '#c00000',
  },
});

export default AddOverseerGoalsScreen;
