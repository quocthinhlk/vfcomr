import React, {useEffect, useRef, useState} from 'react';
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
  getAllNationOptions,
  getOverseerGoalPeriodDetail,
  GoalPeriodDetailItem,
  PickerOption,
  updateOverseerGoalPeriodParameters,
} from '../services/overseerGoals.service';
import {repairText} from '../config/goalPeriodFields';
import {useThemedColors} from '../../../shared/styles/theme';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import {ms} from '../../../shared/utils/scale';
import {returnAfterEdit} from '../../../shared/utils/returnToList';

const EditOverseerGoalParametersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalPeriodId: number | undefined = route?.params?.goalPeriodId;
  const {t} = useTranslation();
  const C = useThemedColors();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retryLoad = () => setReloadKey(k => k + 1);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriodDetailItem | null>(null);
  const [localChurchId, setLocalChurchId] = useState<number | null>(null);
  const [nationId, setNationId] = useState<number | null>(null);
  const [churchOptions, setChurchOptions] = useState<PickerOption[]>([]);
  const currentChurchRef = useRef<PickerOption | null>(null);
  // Nation = a geographical region (whole tree, as on the old web form).
  const [nationOptions, setNationOptions] = useState<PickerOption[]>([]);

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

  const loadChurches = async (search = '') => {
    const res = await api.get('churches', {
      params: {page: 1, limit: 50, sort_by: 'name', sort_desc: false, ...(search ? {search} : {})},
    });
    const items = res?.data?.data?.items ?? [];
    const options: PickerOption[] = items.map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
    // The list is one search page; keep the saved church pickable (and its label shown).
    const current = currentChurchRef.current;
    if (!search && current && !options.some(option => option.value === current.value)) {
      options.unshift(current);
    }
    setChurchOptions(options);
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
        const [detailResponse, nations] = await Promise.all([
          getOverseerGoalPeriodDetail(goalPeriodId),
          getAllNationOptions(),
        ]);
        if (!mounted) {
          return;
        }
        const period = detailResponse?.data?.goal_period ?? null;
        currentChurchRef.current = period?.local_church_id
          ? {
              label: repairText(period.local_church_name) || `#${period.local_church_id}`,
              value: period.local_church_id,
            }
          : null;
        await loadChurches();
        if (!mounted) {
          return;
        }
        setGoalPeriod(period);
        setLocalChurchId(period?.local_church_id ?? null);
        setNationId(period?.nation_id ?? null);
        setNationOptions(nations);
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
    const nextInvalid: Record<string, boolean> = {
      localChurchId: !localChurchId,
      nationId: !nationId,
    };
    setInvalid(nextInvalid);

    if (Object.values(nextInvalid).some(Boolean) || !goalPeriodId || !goalPeriod) {
      return;
    }

    try {
      setSubmitting(true);
      await updateOverseerGoalPeriodParameters(goalPeriodId, {
        local_church_id: Number(localChurchId),
        nation_id: Number(nationId),
        // Years are read-only here (old web): send them back unchanged.
        start_year: goalPeriod.start_year,
        end_year: goalPeriod.end_year,
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
          <FormField label={t('overseer')}>
            <AppInput value={repairText(goalPeriod?.user_name)} editable={false} />
          </FormField>

          <FormField label={t('localChurch')} required>
            <ElementDropdown
              data={churchOptions}
              value={localChurchId}
              onChange={value => {
                setLocalChurchId(value as number);
                clearInvalid('localChurchId');
              }}
              placeholder={t('selectLocalChurch')}
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
              renderItem={createHierarchyDropdownRenderItem(C) as any}
            />
          </FormField>

          {/* Read-only, as on the old web form ("Nil" there when empty). */}
          {[
            {label: t('churchNetworks'), value: goalPeriod?.church_network},
            {label: t('geographicalRegions'), value: goalPeriod?.geographical_region},
            {label: t('churchApostolicRegions'), value: goalPeriod?.church_region},
            {label: t('languageRegions'), value: goalPeriod?.language_region},
          ].map(row => (
            <FormField key={row.label} label={row.label}>
              <AppInput value={repairText(row.value) || '-'} editable={false} multiline />
            </FormField>
          ))}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormField label={t('startYear')}>
                <AppInput
                  value={goalPeriod?.start_year ? String(goalPeriod.start_year) : ''}
                  editable={false}
                />
              </FormField>
            </View>

            <View style={styles.halfField}>
              <FormField label={t('endYear')}>
                <AppInput
                  value={goalPeriod?.end_year ? String(goalPeriod.end_year) : ''}
                  editable={false}
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

export default EditOverseerGoalParametersScreen;
