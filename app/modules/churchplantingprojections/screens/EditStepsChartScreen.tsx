import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {formStyles} from '../../../shared/styles/form';
import {
  updateStepsChart,
  getStepsChartByProjectionId,
  getChurchPlantingProjectionById,
  StepsChartItem,
} from '../services/churchPlantingProjection.service';
import api from '../../../config/api';
import {FormActions, ScreenContainer} from '../../../shared/components/crud';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs, ws} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {useKeepFocusedInputVisible} from '../../../shared/hooks/useKeepFocusedInputVisible';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {
  buildStepsPayload,
  formatApiDate,
  parseApiDate,
  stepKey,
} from '../utils/projection.utils';

export const EditStepsChartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectionId: number | undefined = route.params?.projectionId;
  const [stepsChart, setStepsChart] = useState<StepsChartItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [churchName, setChurchName] = useState<string>('');
  const {t} = useTranslation();
  const C = useThemedColors();

  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const scrollRef = useRef<ScrollView>(null);
  // Android 15+ (edge-to-edge): keep the focused value above the keyboard.
  useKeepFocusedInputVisible(scrollRef);
  const submitOnce = useSubmitOnce();

  // Named so the error state's "Try again" can re-run it.
  const loadStepsChart = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    if (!projectionId) {
      setLoading(false);
      return;
    }
    try {
      const [stepsRes, projectionRes] = await Promise.all([
        getStepsChartByProjectionId(projectionId),
        getChurchPlantingProjectionById(projectionId),
      ]);
      if (!isCurrent()) {
        return;
      }
      setStepsChart(stepsRes?.data || null);
      setLoadError(null);

      // Fetch church name
      const projection = projectionRes?.data;
      if (projection?.church_id) {
        api
          .get(`churches/${projection.church_id}`)
          .then(churchRes => {
            const churchData = churchRes?.data?.data;
            if (churchData?.name && isCurrent()) {
              setChurchName(churchData.name);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      if (isCurrent()) {
        console.error('Error fetching steps chart:', e);
        // Previously this left an endless spinner.
        setLoadError(e);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [projectionId]);

  useEffect(() => {
    mountedRef.current = true;
    loadStepsChart();
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, [loadStepsChart]);

  const formatDateForAPI = formatApiDate;
  const parseDateFromAPI = parseApiDate;

  // Functional update: two calls in one handler used to overwrite each other
  // (the date proposed was lost), and fast typing could drop characters.
  const setChartField = (key: string, value: string | null | boolean) => {
    setStepsChart(prev => (prev ? ({...prev, [key]: value} as StepsChartItem) : prev));
  };
  const updateStepField = (
    stepNum: number,
    field: string,
    value: string | null | boolean,
  ) => setChartField(stepKey(stepNum, field), value);

  // One save at a time: a fast double tap sent the steps twice.
  const onSave = submitOnce(async () => {
    if (!projectionId || !stepsChart) return;

    try {
      setSubmitting(true);
      const payload = buildStepsPayload(stepsChart);
      await updateStepsChart(projectionId, payload);
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('stepsChart') || 'Steps Chart'} ${t('success') || 'success'}`,
      );
      markDataChanged('churchPlantingProjections');
      returnAfterEdit(navigation);
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || t('failedToUpdateStepsChart') || 'Failed to update Steps Chart');
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  if (loading || loadError || !stepsChart) {
    return (
      <ScreenContainer
        title={`${t('edit') || 'Edit'} ${t('stepsChart') || 'Steps Chart'}`}
        loading={!loadError}
        error={loadError}
        onRetry={loadStepsChart}
      />
    );
  }

  const rows = [
    {title: stepsChart.row1_title, key: 'row1'},
    {title: stepsChart.row2_title, key: 'row2'},
    {title: stepsChart.row3_title, key: 'row3'},
    {title: stepsChart.row4_title, key: 'row4'},
    {title: stepsChart.row5_title, key: 'row5'},
    {title: stepsChart.row6_title, key: 'row6'},
    {title: stepsChart.row7_title, key: 'row7'},
    {title: stepsChart.row8_title, key: 'row8'},
    {title: stepsChart.row9_title, key: 'row9'},
  ];

  const steps = [1, 2, 3, 4, 5, 6];

  return (
    <ScreenContainer title={`${t('edit') || 'Edit'} ${t('stepsChart') || 'Steps Chart'}`}>
      {churchName ? (
        <Text style={[styles.churchNameText, {color: C.textPrimary}]}>
          {t('edit') || 'Edit'} {t('stepsChart') || 'Steps Chart'} {t('for') || 'for'} {churchName}
        </Text>
      ) : null}

      <KeyboardAvoidingView
        // Offset 0 on Android: status bar + 50 left a blank band above the
        // keyboard that hid the value being typed.
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View style={styles.form}>
            {/* Row Titles */}
            <View style={[styles.section, {backgroundColor: C.surface, borderColor: C.border, shadowColor: '#000'}]}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {t('rowTitles') || 'Row Titles'}
              </Text>
              {rows.map((row, index) => (
                <View key={row.key} style={[styles.field, index < rows.length - 1 && {borderBottomColor: C.border}]}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('row') || 'Row'} {index + 1}:
                  </Text>
                  <AppInput
                    value={row.title}
                    onChangeText={text => setChartField(`${row.key}_title`, text)}
                    maxLength={255}
                    placeholder={t('rowTitle') || 'Row Title'}
                  />
                </View>
              ))}
            </View>

            {/* Steps Data */}
            {steps.map(stepNum => (
              <View key={stepNum} style={[styles.section, {backgroundColor: C.surface, borderColor: C.border, shadowColor: '#000'}]}>
                <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                  {t('step') || 'Step'} {stepNum}
                </Text>

                <View style={[styles.field, {borderBottomColor: C.border}]}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('dateProposed') || 'Date Proposed'}:
                  </Text>
                  <DateTripleDropdown
                    value={parseDateFromAPI(
                      stepsChart[
                        `step${stepNum}_date_proposed` as keyof StepsChartItem
                      ] as string | null,
                    )}
                    // Only the current date: *_date_proposed_original is the first
                    // plan and is kept (as on the web).
                    onChange={date =>
                      updateStepField(stepNum, 'date_proposed', formatDateForAPI(date))
                    }
                    yearRange={50}
                    startYear={new Date().getFullYear()}
                  />
                </View>

                <View style={[styles.field, {borderBottomColor: C.border}]}>
                  <Text
                    style={[
                      formStyles.label,
                      {color: C.textSecondary, marginBottom: ms(4)},
                    ]}>
                    {t('dateCompleted') || 'Date Completed'}:
                  </Text>
                  <DateTripleDropdown
                    value={parseDateFromAPI(
                      stepsChart[
                        `step${stepNum}_date_completed` as keyof StepsChartItem
                      ] as string | null,
                    )}
                    onChange={date =>
                      updateStepField(stepNum, 'date_completed', formatDateForAPI(date))
                    }
                    yearRange={50}
                    startYear={new Date().getFullYear()}
                  />
                </View>

                {rows.map((row, rowIndex) => {
                  const valueKey = `step${stepNum}_${row.key}_value` as keyof StepsChartItem;
                  const completedKey = `step${stepNum}_${row.key}_completed` as keyof StepsChartItem;
                  const value = (stepsChart[valueKey] as string) || '';
                  const completed = (stepsChart[completedKey] as boolean) || false;

                  return (
                    <View 
                      key={row.key} 
                      style={[
                        styles.field,
                        {borderBottomColor: C.border},
                        rowIndex === rows.length - 1 && {borderBottomWidth: 0}
                      ]}>
                      <View style={styles.rowFieldHeader}>
                        <Text
                          style={[
                            formStyles.label,
                            {color: C.textSecondary, marginBottom: ms(4), flex: 1},
                          ]}>
                          {row.title}:
                        </Text>
                        <TouchableOpacity
                          accessibilityRole="checkbox"
                          accessibilityState={{checked: completed}}
                          accessibilityLabel={`${t('step') || 'Step'} ${stepNum} - ${row.title}`}
                          hitSlop={8}
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: completed ? C.bgSelectedOption : C.inputBg,
                              borderColor: completed ? C.border : C.border,
                            },
                          ]}
                          onPress={() => {
                            updateStepField(stepNum, `${row.key}_completed`, !completed);
                          }}>
                          <Text style={[styles.checkboxText, {color: completed ? C.textPrimary : C.textSecondary}]}>
                            {completed ? '✓' : ''}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <AppInput
                        value={value}
                        onChangeText={text => {
                          updateStepField(stepNum, `${row.key}_value`, text);
                        }}
                        placeholder={t('value') || 'Value'}
                        multiline
                        numberOfLines={2}
                        // AppInput has a fixed one-line height: multi-line
                        // values were cut off (Android shows no scroll hint).
                        style={styles.multiline}
                      />
                    </View>
                  );
                })}
              </View>
            ))}

            <FormActions
              onCancel={() => navigation.goBack()}
              onSave={onSave}
              submitting={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  churchNameText: {
    marginTop: ms(8),
    marginBottom: ms(12),
    fontSize: fs(14),
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  form: {
    marginTop: ms(8),
    gap: ms(16),
  },
  section: {
    marginBottom: ms(20),
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: rs(8),
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(16),
  },
  field: {
    marginBottom: ms(16),
    paddingBottom: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    marginBottom: ms(4),
  },
  checkbox: {
    width: ws(32),
    height: ws(32),
    borderRadius: rs(6),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiline: {
    height: undefined,
    minHeight: hs(64),
    maxHeight: hs(160),
    paddingTop: ms(8),
    textAlignVertical: 'top',
  },
  checkboxText: {
    fontSize: fs(16),
    fontWeight: 'bold',
  },
});

export default EditStepsChartScreen;

