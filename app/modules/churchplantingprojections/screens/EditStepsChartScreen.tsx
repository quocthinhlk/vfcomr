import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {
  updateStepsChart,
  getStepsChartByProjectionId,
  getChurchPlantingProjectionById,
  StepsChartItem,
} from '../services/churchPlantingProjection.service';
import api from '../../../config/api';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs, ws} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';

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

  useEffect(() => {
    let mounted = true;
    if (projectionId) {
      Promise.all([
        getStepsChartByProjectionId(projectionId),
        getChurchPlantingProjectionById(projectionId),
      ])
        .then(([stepsRes, projectionRes]) => {
          if (!mounted) {
            return;
          }
          setStepsChart(stepsRes?.data || null);
          
          // Fetch church name
          const projection = projectionRes?.data;
          if (projection?.church_id) {
            api
              .get(`churches/${projection.church_id}`)
              .then(churchRes => {
                const churchData = churchRes?.data?.data;
                if (churchData?.name && mounted) {
                  setChurchName(churchData.name);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [projectionId]);

  const formatDateForAPI = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateFromAPI = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  };

  const updateStepField = (
    stepNum: number,
    field: string,
    value: string | Date | null | boolean,
  ) => {
    if (!stepsChart) return;
    const key = `step${stepNum}_${field}` as keyof StepsChartItem;
    setStepsChart({
      ...stepsChart,
      [key]: value,
    });
  };

  const onSave = async () => {
    if (!projectionId || !stepsChart) return;

    try {
      setSubmitting(true);
      const payload: any = {
        date_proposed: stepsChart.date_proposed,
        date_completed: stepsChart.date_completed,
        row1_title: stepsChart.row1_title,
        row2_title: stepsChart.row2_title,
        row3_title: stepsChart.row3_title,
        row4_title: stepsChart.row4_title,
        row5_title: stepsChart.row5_title,
        row6_title: stepsChart.row6_title,
        row7_title: stepsChart.row7_title,
        row8_title: stepsChart.row8_title,
        row9_title: stepsChart.row9_title,
      };

      // Add all step fields
      for (let stepNum = 1; stepNum <= 6; stepNum++) {
        const dateProposed = stepsChart[`step${stepNum}_date_proposed` as keyof StepsChartItem] as
          | string
          | null;
        const dateProposedOriginal = stepsChart[
          `step${stepNum}_date_proposed_original` as keyof StepsChartItem
        ] as string | null;
        const dateCompleted = stepsChart[
          `step${stepNum}_date_completed` as keyof StepsChartItem
        ] as string | null;

        payload[`step${stepNum}_date_proposed`] = dateProposed;
        payload[`step${stepNum}_date_proposed_original`] = dateProposedOriginal || dateProposed;
        payload[`step${stepNum}_date_completed`] = dateCompleted;

        for (let rowNum = 1; rowNum <= 9; rowNum++) {
          const valueKey = `step${stepNum}_row${rowNum}_value` as keyof StepsChartItem;
          const completedKey = `step${stepNum}_row${rowNum}_completed` as keyof StepsChartItem;
          payload[`step${stepNum}_row${rowNum}_value`] =
            stepsChart[valueKey] as string | null;
          payload[`step${stepNum}_row${rowNum}_completed`] =
            stepsChart[completedKey] as boolean | null;
        }
      }

      // Add step 7-9 completed fields
      for (let stepNum = 7; stepNum <= 9; stepNum++) {
        for (let rowNum = 1; rowNum <= 9; rowNum++) {
          const completedKey = `step${stepNum}_row${rowNum}_completed` as keyof StepsChartItem;
          payload[`step${stepNum}_row${rowNum}_completed`] =
            stepsChart[completedKey] as boolean | null;
        }
      }

      await updateStepsChart(projectionId, payload);
      Alert.alert(
        t('success') || 'Success',
        `${t('edit') || 'Edit'} ${t('stepsChart') || 'Steps Chart'} ${t('success') || 'success'}`,
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('error') || 'Error', e?.message || t('failedToUpdateStepsChart') || 'Failed to update Steps Chart');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !stepsChart) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={styles.container}>
            <Header
              title={`${t('edit') || 'Edit'} ${t('stepsChart') || 'Steps Chart'}`}
              showMenu={false}
            />
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('loading') || 'Loading'}...
            </Text>
          </View>
        </View>
      </SafeAreaView>
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
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header
            title={`${t('edit') || 'Edit'} ${t('stepsChart') || 'Steps Chart'}`}
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
                        onChangeText={text => {
                          const key = `${row.key}_title` as keyof StepsChartItem;
                          setStepsChart({
                            ...stepsChart,
                            [key]: text,
                          });
                        }}
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
                        onChange={date => {
                          const dateStr = formatDateForAPI(date);
                          updateStepField(stepNum, 'date_proposed', dateStr);
                          updateStepField(stepNum, 'date_proposed_original', dateStr);
                        }}
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
                        onChange={date => {
                          const dateStr = formatDateForAPI(date);
                          updateStepField(stepNum, 'date_completed', dateStr);
                        }}
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
                            style={{textAlignVertical: 'top'}}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}

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
  checkboxText: {
    fontSize: fs(16),
    fontWeight: 'bold',
  },
  loading: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default EditStepsChartScreen;

