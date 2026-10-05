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
import {useNavigation} from '@react-navigation/native';
import api from '../../../config/api';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {createOverseerGoalPeriod} from '../services/overseerGoals.service';
import {ms} from '../../../shared/utils/scale';

const AddOverseerGoalsScreen = () => {
  const navigation = useNavigation<any>();
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
      params: {page: 1, limit: 50, sort_by: 'name', sort_desc: false, ...(search ? {search} : {})},
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
      params: {page: 1, limit: 50, sort_by: 'name', sort_desc: false, ...(search ? {search} : {})},
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
      params: {page: 1, limit: 50, sort_by: 'name', sort_desc: false, ...(search ? {name: search} : {})},
    });
    const items = res?.data?.data?.items ?? [];
    setNationOptions(
      items.map((item: any) => ({
        label: item.name,
        value: item.id,
      })),
    );
  };

  const [loadError, setLoadError] = useState<unknown>(null);

  const loadFormData = async () => {
    try {
      await Promise.all([loadUsers(), loadChurches(), loadNations()]);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load add goal period form data:', error);
      // Empty user / church / nation pickers would make the form unusable.
      setLoadError(error);
    }
  };

  useEffect(() => {
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <ScreenContainer
      title={t('addGoalPeriod')}
      error={loadError}
      onRetry={loadFormData}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? ms(64)
            : (StatusBar.currentHeight || 0) + ms(50)
        }
        style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <FormField label={t('assignedTo')} required>
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
          </FormField>

          <FormField label={t('church')} required>
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
          </FormField>

          <FormField label={t('nation')} required>
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
          </FormField>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormField label={t('startYear')} required>
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
              </FormField>
            </View>

            <View style={styles.halfField}>
              <FormField label={t('endYear')} required>
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
              </FormField>
            </View>
          </View>

          <FormActions
            onCancel={() => navigation.goBack()}
            onSave={onSave}
            submitting={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(32),
  },
  row: {
    flexDirection: 'row',
    gap: ms(12),
  },
  halfField: {
    flex: 1,
  },
});

export default AddOverseerGoalsScreen;
