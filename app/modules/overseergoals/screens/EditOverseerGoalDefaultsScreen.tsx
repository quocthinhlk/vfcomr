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
import {useNavigation, useRoute} from '@react-navigation/native';
import api from '../../../config/api';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {
  getOverseerGoalPeriodDetail,
  updateOverseerGoalPeriodParameters,
} from '../services/overseerGoals.service';
import {ms} from '../../../shared/utils/scale';
import {returnAfterEdit} from '../../../shared/utils/returnToList';

const EditOverseerGoalDefaultsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route?.params?.goalPeriodId;
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retryLoad = () => setReloadKey(k => k + 1);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [assignedTo, setAssignedTo] = useState('');
  const [localChurchId, setLocalChurchId] = useState<number | null>(null);
  const [nationId, setNationId] = useState<number | null>(null);
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
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

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!goalPeriodId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [detailResponse] = await Promise.all([
          getOverseerGoalPeriodDetail(goalPeriodId),
          loadChurches(),
          loadNations(),
        ]);
        if (!mounted) {
          return;
        }
        const goalPeriod = detailResponse?.data?.goal_period;
        setAssignedTo(goalPeriod?.user_name || '');
        setLocalChurchId(goalPeriod?.local_church_id ?? null);
        setNationId(goalPeriod?.nation_id ?? null);
        setStartYear(goalPeriod?.start_year ? String(goalPeriod.start_year) : '');
        setEndYear(goalPeriod?.end_year ? String(goalPeriod.end_year) : '');
        setLoadError(null);
      } catch (error) {
        console.error('Failed to load goal period parameters:', error);
        // Don't offer a blank parameters form that would overwrite real values.
        if (mounted) {
          setLoadError(error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [goalPeriodId, reloadKey]);

  const onSave = async () => {
    const startYearNumber = Number(startYear);
    const endYearNumber = Number(endYear);
    const nextInvalid: Record<string, boolean> = {
      localChurchId: !localChurchId,
      nationId: !nationId,
      startYear: !startYear.trim() || !Number.isFinite(startYearNumber) || startYearNumber <= 0,
      endYear: !endYear.trim() || !Number.isFinite(endYearNumber) || endYearNumber <= 0,
    };
    setInvalid(nextInvalid);

    if (Object.values(nextInvalid).some(Boolean) || !goalPeriodId) {
      return;
    }

    try {
      setSubmitting(true);
      await updateOverseerGoalPeriodParameters(goalPeriodId, {
        local_church_id: Number(localChurchId),
        nation_id: Number(nationId),
        start_year: startYearNumber,
        end_year: endYearNumber,
      });
      Alert.alert(t('success'), t('goalParametersUpdatedSuccess'));
      returnAfterEdit(navigation);
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('failedToUpdateGoalParameters'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      title={t('editParameters')}
      loading={loading}
      error={loadError}
      onRetry={retryLoad}>
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
          <FormField label={t('assignedTo')}>
            <AppInput value={assignedTo} editable={false} />
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

export default EditOverseerGoalDefaultsScreen;
