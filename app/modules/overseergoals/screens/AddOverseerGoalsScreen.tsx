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
import {CommonActions, useNavigation} from '@react-navigation/native';
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
  createOverseerGoalPeriod,
  getOverseerChurchOptions,
  getOverseerNationOptions,
  PickerOption,
} from '../services/overseerGoals.service';
import {useThemedColors} from '../../../shared/styles/theme';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import {ms} from '../../../shared/utils/scale';

// Same as the old web form: Start Year from 2000 to five years ahead (newest
// first, defaults to this year); End Year is always Start Year + 2.
const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR_OPTIONS = Array.from({length: CURRENT_YEAR + 5 - 2000 + 1}, (_, index) => {
  const year = CURRENT_YEAR + 5 - index;
  return {label: String(year), value: year};
});
const GOAL_PERIOD_YEARS = 2;

const AddOverseerGoalsScreen = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<number | null>(null);
  const [localChurchId, setLocalChurchId] = useState<number | null>(null);
  const [nationId, setNationId] = useState<number | null>(null);
  const [startYear, setStartYear] = useState<number>(CURRENT_YEAR);
  const [userOptions, setUserOptions] = useState<Array<{label: string; value: number}>>([]);
  // Local Church / Nation are limited to what the picked overseer oversees.
  const [churchOptions, setChurchOptions] = useState<PickerOption[]>([]);
  const [nationOptions, setNationOptions] = useState<PickerOption[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const scopeRequestRef = useRef(0);

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));

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

  const [loadError, setLoadError] = useState<unknown>(null);

  const loadFormData = async () => {
    try {
      await loadUsers();
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load add goal period form data:', error);
      // An empty overseer picker would make the form unusable.
      setLoadError(error);
    }
  };

  useEffect(() => {
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOverseerScope = async (overseerId: number) => {
    const requestId = ++scopeRequestRef.current;
    setScopeLoading(true);
    setChurchOptions([]);
    setNationOptions([]);
    try {
      const [churches, nations] = await Promise.all([
        getOverseerChurchOptions(overseerId),
        getOverseerNationOptions(overseerId),
      ]);
      if (requestId === scopeRequestRef.current) {
        setChurchOptions(churches);
        setNationOptions(nations);
      }
    } catch (error: any) {
      console.error('Failed to load overseer churches / nations:', error);
      if (requestId === scopeRequestRef.current) {
        Alert.alert(t('error'), error?.message || t('failedToLoadData'));
      }
    } finally {
      if (requestId === scopeRequestRef.current) {
        setScopeLoading(false);
      }
    }
  };

  const onSelectOverseer = (value: number | null) => {
    setUserId(value);
    setLocalChurchId(null);
    setNationId(null);
    clearInvalid('userId');
    if (value) {
      loadOverseerScope(value);
    } else {
      scopeRequestRef.current += 1;
      setChurchOptions([]);
      setNationOptions([]);
      setScopeLoading(false);
    }
  };

  const onSave = async () => {
    const nextInvalid: Record<string, boolean> = {
      userId: !userId,
      localChurchId: !localChurchId,
      nationId: !nationId,
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
        start_year: startYear,
        end_year: startYear + GOAL_PERIOD_YEARS,
      });
      const createdId =
        response?.data?.goal_period?.id ?? response?.data?.id ?? response?.goal_period?.id;

      // The list underneath should show the new period even if Edit Goals is left without saving.
      const routes = navigation.getState?.()?.routes ?? [];
      const listRoute = routes.find((r: any) => r.name === 'OverseerGoals');
      if (listRoute) {
        navigation.dispatch({
          ...CommonActions.setParams({reload: true}),
          source: listRoute.key,
        });
      }

      Alert.alert(t('success'), t('goalPeriodCreatedSuccess'));
      // Old web: after Add, go straight to Edit Goals for the new period.
      if (createdId) {
        navigation.replace('EditOverseerGoals', {goalPeriodId: createdId});
      } else {
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('failedToCreateGoalPeriod'));
    } finally {
      setSubmitting(false);
    }
  };

  const scopePlaceholder = (placeholder: string) =>
    !userId ? t('selectOverseer') : scopeLoading ? t('loading') : placeholder;

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
          <FormField label={t('overseer')} required>
            <ElementDropdown
              data={userOptions}
              value={userId}
              onChange={value => onSelectOverseer(value ? Number(value) : null)}
              placeholder={t('selectOverseer')}
              error={!!invalid.userId}
              onSearchText={text => loadUsers(text)}
            />
          </FormField>

          <FormField label={t('localChurch')} required>
            <ElementDropdown
              data={churchOptions}
              value={localChurchId}
              onChange={value => {
                setLocalChurchId(value as number);
                clearInvalid('localChurchId');
              }}
              placeholder={scopePlaceholder(t('selectLocalChurch'))}
              error={!!invalid.localChurchId}
              disabled={!userId || scopeLoading}
              renderItem={createHierarchyDropdownRenderItem(C) as any}
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
              placeholder={scopePlaceholder(t('selectNation'))}
              error={!!invalid.nationId}
              disabled={!userId || scopeLoading}
              renderItem={createHierarchyDropdownRenderItem(C) as any}
            />
          </FormField>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormField label={t('startYear')} required>
                <ElementDropdown
                  data={START_YEAR_OPTIONS}
                  value={startYear}
                  onChange={value => {
                    if (value) {
                      setStartYear(Number(value));
                    }
                  }}
                  placeholder={t('selectYear')}
                  search={false}
                />
              </FormField>
            </View>

            <View style={styles.halfField}>
              <FormField label={t('endYear')}>
                <AppInput value={String(startYear + GOAL_PERIOD_YEARS)} editable={false} />
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
