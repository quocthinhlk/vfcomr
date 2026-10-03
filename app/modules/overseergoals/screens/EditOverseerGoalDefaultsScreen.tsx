import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
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
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import api from '../../../config/api';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {formStyles} from '../../../shared/styles/form';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {CancelButton, SaveButton} from '../../../shared/components/ActionButtons';
import {
  getOverseerGoalPeriodDetail,
  updateOverseerGoalPeriodParameters,
} from '../services/overseerGoals.service';
import {fs, ms} from '../../../shared/utils/scale';
import {returnAfterEdit} from '../../../shared/utils/returnToList';

const EditOverseerGoalDefaultsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route?.params?.goalPeriodId;
  const C = useThemedColors();
  const {t} = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      } catch (error) {
        console.error('Failed to load goal period parameters:', error);
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
  }, [goalPeriodId]);

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
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('editParameters')} showMenu={false} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={C.textPrimary} />
          </View>
        ) : (
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
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={[formStyles.label, {color: C.textSecondary}]}>
                    {t('assignedTo')}
                  </Text>
                  <AppInput value={assignedTo} editable={false} />
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
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

export default EditOverseerGoalDefaultsScreen;
