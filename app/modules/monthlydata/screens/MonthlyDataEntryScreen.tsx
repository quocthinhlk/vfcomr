import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import AppInput from '../../../shared/components/AppInput';
import {
  WeeklyReportData,
  WorshipSession,
  ChurchMetrics,
  getWeeklyReport,
  createOrUpdateWeeklyReport,
  batchCreateOrUpdateWeeklyReports,
} from '../services/monthlydata.service';
import {formStyles} from '../../../shared/styles/form';
import {listWorshipServicesByChurch} from '../../worshipservices/services/worshipService.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RouteParams {
  churchId: number;
  churchName: string;
  year: number;
  month: number;
  weekNumbers: number[];
}

// Helper function to get week date range
const getWeekDateRange = (year: number, weekNumber: number): string => {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7;
  const weekStart = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };
  
  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
};

// Helper function to format number with thousand separators
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '';
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// Helper function to parse formatted number string to number
const parseNumber = (formattedStr: string): number | null => {
  if (!formattedStr || formattedStr.trim() === '') return null;
  // Remove all non-digit characters
  const cleanStr = formattedStr.replace(/[^\d]/g, '');
  if (!cleanStr) return null;
  const num = parseInt(cleanStr, 10);
  return isNaN(num) ? null : num;
};

export default function MonthlyDataEntryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  
  const params = route.params as RouteParams;
  const {churchId, churchName, year, weekNumbers} = params;

  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [weekData, setWeekData] = useState<Map<number, WeeklyReportData>>(new Map());
  const [worshipSessions, setWorshipSessions] = useState<WorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWeeks, setLoadingWeeks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const currentWeekNumber = weekNumbers[currentWeekIndex];
  const currentData = weekData.get(currentWeekNumber);

  // Load worship sessions and first week data immediately, then load other weeks in background
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Try to load first week to get worship sessions structure
      const firstWeekNumber = weekNumbers[0];
      try {
        const firstWeekData = await getWeeklyReport(churchId, year, firstWeekNumber);
        if (firstWeekData.worship_sessions && firstWeekData.worship_sessions.length > 0) {
          setWorshipSessions(firstWeekData.worship_sessions);
          setWeekData(prev => new Map(prev).set(firstWeekNumber, firstWeekData));
        } else {
          // If no worship sessions, try to get from any recent week
          await loadWorshipSessionsFromAnyWeek();
        }
      } catch (error: any) {
        // If first week doesn't exist, try to get worship sessions from any week
        console.log(`Week ${firstWeekNumber} not found, trying to get worship sessions from any week`);
        await loadWorshipSessionsFromAnyWeek();
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
      // Load other weeks in background
      loadOtherWeeksInBackground();
    }
  };

  const loadWorshipSessionsFromAnyWeek = async () => {
    // Try to get worship sessions from any existing week report
    for (const weekNumber of weekNumbers) {
      try {
        const data = await getWeeklyReport(churchId, year, weekNumber);
        if (data.worship_sessions && data.worship_sessions.length > 0) {
          setWorshipSessions(data.worship_sessions);
          setWeekData(prev => new Map(prev).set(weekNumber, data));
          return;
        }
      } catch (error) {
        // Continue to next week
      }
    }
    // If no worship sessions found, get worship services from church
    try {
      const servicesResponse = await listWorshipServicesByChurch(churchId);
      if (servicesResponse.data && servicesResponse.data.length > 0) {
        const sessions: WorshipSession[] = servicesResponse.data.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
          day_name: ws.day_name,
          time: ws.time,
          attendance: {
            adult_attendance: null,
            youth_attendance: null,
            child_attendance: null,
            number_of_service_for_children: null,
            total_attendance: null,
          },
        }));
        setWorshipSessions(sessions);
      }
    } catch (error) {
      console.error('Error loading worship services:', error);
    }
  };

  const loadOtherWeeksInBackground = async () => {
    // Load data for other weeks in parallel
    const promises = weekNumbers.map(async (weekNumber) => {
      // Skip if already loaded
      if (weekData.has(weekNumber)) return;
      
      setLoadingWeeks(prev => new Set(prev).add(weekNumber));
      try {
        const data = await getWeeklyReport(churchId, year, weekNumber);
        setWeekData(prev => new Map(prev).set(weekNumber, data));
      } catch (error: any) {
        // If report doesn't exist, that's okay - we'll create it when saving
        console.log(`Week ${weekNumber} report not found`);
      } finally {
        setLoadingWeeks(prev => {
          const newSet = new Set(prev);
          newSet.delete(weekNumber);
          return newSet;
        });
      }
    });
    
    await Promise.all(promises);
  };

  // Load data for a specific week when switching to it
  const loadWeekData = useCallback(async (weekNumber: number) => {
    if (weekData.has(weekNumber)) {
      // Data already loaded
      const data = weekData.get(weekNumber);
      if (data?.worship_sessions) {
        setWorshipSessions(data.worship_sessions);
      }
      return;
    }

    // Load data for this week
    setLoadingWeeks(prev => new Set(prev).add(weekNumber));
    try {
      const data = await getWeeklyReport(churchId, year, weekNumber);
      setWeekData(prev => new Map(prev).set(weekNumber, data));
      if (data.worship_sessions) {
        setWorshipSessions(data.worship_sessions);
      }
    } catch (error: any) {
      // If report doesn't exist, that's okay
      console.log(`Week ${weekNumber} report not found`);
    } finally {
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekNumber);
        return newSet;
      });
    }
  }, [churchId, year, weekData]);

  const updateWorshipSession = (sessionId: number, field: string, value: string) => {
    // Parse the input value (remove formatting, only keep digits)
    const numValue = parseNumber(value);
    setWorshipSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              attendance: {
                ...session.attendance,
                [field]: numValue,
                total_attendance:
                  field === 'adult_attendance' ||
                  field === 'youth_attendance' ||
                  field === 'child_attendance'
                    ? calculateTotalAttendance({
                        ...session.attendance,
                        [field]: numValue,
                      })
                    : session.attendance.total_attendance,
              },
            }
          : session,
      ),
    );
  };

  const calculateTotalAttendance = (attendance: any): number | null => {
    const adult = attendance.adult_attendance || 0;
    const youth = attendance.youth_attendance || 0;
    const child = attendance.child_attendance || 0;
    const total = adult + youth + child;
    return total > 0 ? total : null;
  };

  const updateChurchMetrics = (field: keyof ChurchMetrics, value: string) => {
    // Parse the input value (remove formatting, only keep digits)
    const numValue = parseNumber(value);
    const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);
    const updatedData: WeeklyReportData = {
      ...(currentData || {
        church_id: churchId,
        year,
        week_number: currentWeekNumber,
        worship_sessions: [],
        church_metrics: {} as ChurchMetrics,
      }),
      church_metrics: {
        ...currentMetrics,
        [field]: numValue,
      },
    };
    setWeekData(prev => new Map(prev).set(currentWeekNumber, updatedData));
  };

  const handleSave = async () => {
    if (!currentWeekNumber) return;

    setSaving(true);
    try {
      const data = weekData.get(currentWeekNumber);
      const metrics = data?.church_metrics || ({} as ChurchMetrics);

      const payload = {
        year,
        week_number: currentWeekNumber,
        worship_sessions: worshipSessions.map(session => ({
          id: session.id,
          attendance: {
            adult_attendance: session.attendance.adult_attendance,
            youth_attendance: session.attendance.youth_attendance,
            child_attendance: session.attendance.child_attendance,
            number_of_service_for_children: session.attendance.number_of_service_for_children,
          },
        })),
        church_metrics: metrics,
      };

      await createOrUpdateWeeklyReport(churchId, payload);
      
      // Update local data
      const updatedData: WeeklyReportData = {
        church_id: churchId,
        year,
        week_number: currentWeekNumber,
        currency_id: data?.currency_id,
        worship_sessions: worshipSessions,
        church_metrics: metrics,
      };
      setWeekData(prev => new Map(prev).set(currentWeekNumber, updatedData));

      Alert.alert(t('success') || 'Success', t('dataSavedSuccessfully') || 'Data saved successfully');
    } catch (error: any) {
      console.error('Error saving data:', error);
      Alert.alert(t('error') || 'Error', error?.message || t('failedToSaveData') || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payloads = weekNumbers.map(weekNumber => {
        const data = weekData.get(weekNumber);
        const metrics = data?.church_metrics || ({} as ChurchMetrics);
        const sessions = weekNumber === currentWeekNumber 
          ? worshipSessions 
          : data?.worship_sessions || worshipSessions;

        return {
          church_id: churchId,
          year,
          week_number: weekNumber,
          worship_sessions: sessions.map(session => ({
            id: session.id,
            attendance: {
              adult_attendance: session.attendance.adult_attendance,
              youth_attendance: session.attendance.youth_attendance,
              child_attendance: session.attendance.child_attendance,
              number_of_service_for_children: session.attendance.number_of_service_for_children,
            },
          })),
          church_metrics: metrics,
        };
      });

      await batchCreateOrUpdateWeeklyReports(payloads);
      Alert.alert(t('success') || 'Success', t('allDataSavedSuccessfully') || 'All data saved successfully');
      
      // Reload data for all weeks in background
      loadOtherWeeksInBackground();
    } catch (error: any) {
      console.error('Error saving all data:', error);
      Alert.alert(t('error') || 'Error', error?.message || t('failedToSaveData') || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < weekNumbers.length - 1) {
      // Save current week data before switching
      const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);
      const updatedData: WeeklyReportData = {
        ...(currentData || {
          church_id: churchId,
          year,
          week_number: currentWeekNumber,
          worship_sessions: [],
          church_metrics: {} as ChurchMetrics,
        }),
        worship_sessions: worshipSessions,
        church_metrics: currentMetrics,
      };
      setWeekData(prev => new Map(prev).set(currentWeekNumber, updatedData));
      
      // Switch to next week
      const nextIndex = currentWeekIndex + 1;
      setCurrentWeekIndex(nextIndex);
      const nextWeekNumber = weekNumbers[nextIndex];
      loadWeekData(nextWeekNumber);
    }
  };

  const handleBackWeek = () => {
    if (currentWeekIndex > 0) {
      // Save current week data before switching
      const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);
      const updatedData: WeeklyReportData = {
        ...(currentData || {
          church_id: churchId,
          year,
          week_number: currentWeekNumber,
          worship_sessions: [],
          church_metrics: {} as ChurchMetrics,
        }),
        worship_sessions: worshipSessions,
        church_metrics: currentMetrics,
      };
      setWeekData(prev => new Map(prev).set(currentWeekNumber, updatedData));
      
      // Switch to previous week
      const prevIndex = currentWeekIndex - 1;
      setCurrentWeekIndex(prevIndex);
      const prevWeekNumber = weekNumbers[prevIndex];
      loadWeekData(prevWeekNumber);
    }
  };

  // Update worship sessions when switching weeks
  useEffect(() => {
    if (currentData?.worship_sessions) {
      setWorshipSessions(currentData.worship_sessions);
    }
  }, [currentWeekNumber]);

  if (loading) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mainColor} />
          <Text style={[styles.loadingText, {color: C.textSecondary}]}>
            {t('loading')}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
      <View style={styles.headerWrapper}>
        <Header
            title={t('monthlyData') || 'Monthly Data'}
            showMenu={false}
          />
      </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Church Name and Week Info */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoLabel, {color: C.textPrimary}]}>
              {t('enterDataFor') || 'Enter Data for'}: {churchName}
            </Text>
            <Text style={[styles.weekInfo, {color: C.textPrimary}]}>
              {t('week') || 'Week'} {currentWeekNumber} ({getWeekDateRange(year, currentWeekNumber)})
            </Text>
          </View>

          {/* Week Navigation */}
          {weekNumbers.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekNavContainer}
              style={styles.weekNavScrollView}>
              {weekNumbers.map((weekNum, index) => (
                <TouchableOpacity
                  key={weekNum}
                  style={[
                    styles.weekNavButton,
                    {
                      backgroundColor: index === currentWeekIndex ? COLORS.mainColor : C.surface,
                      borderColor: index === currentWeekIndex ? COLORS.mainColor : C.border,
                    },
                  ]}
                  onPress={() => {
                    // Save current week before switching
                    const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);
                    const updatedData: WeeklyReportData = {
                      ...(currentData || {
                        church_id: churchId,
                        year,
                        week_number: currentWeekNumber,
                        worship_sessions: [],
                        church_metrics: {} as ChurchMetrics,
                      }),
                      worship_sessions: worshipSessions,
                      church_metrics: currentMetrics,
                    };
                    setWeekData(prev => new Map(prev).set(currentWeekNumber, updatedData));
                    
                    // Switch week
                    setCurrentWeekIndex(index);
                    loadWeekData(weekNum);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.weekNavText,
                      {
                        color: index === currentWeekIndex ? '#fff' : C.textPrimary,
                      },
                    ]}>
                    {t('week') || 'Week'} {weekNum}
                  </Text>
                  <Text
                    style={[
                      styles.weekNavDateText,
                      {
                        color: index === currentWeekIndex ? '#fff' : C.textPrimary,
                      },
                    ]}>
                    {getWeekDateRange(year, weekNum)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Main Worship Service Attendance */}
          <View style={styles.section}>
            {worshipSessions.length > 0 ? (
              worshipSessions.map((session, index) => (
                <View key={session.id} style={styles.sessionContainer}>
                  {worshipSessions.length > 1 && (
                    <Text style={[styles.sessionName, {color: C.textPrimary}]}>
                      {t('mainWorshipServiceAttendance') || 'Main Worship Service Attendance'}: {session.name} ({session.day_name} {session.time?.substring(0, 5)})
                    </Text>
                  )}
                  
                  <View style={styles.fieldContainer}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('adults') || 'Adults'}
                    </Text>
                    <AppInput
                      value={formatNumber(session.attendance.adult_attendance)}
                      onChangeText={value => updateWorshipSession(session.id, 'adult_attendance', value)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('youth') || 'Youth [13-22]'}
                    </Text>
                    <AppInput
                      value={formatNumber(session.attendance.youth_attendance)}
                      onChangeText={value => updateWorshipSession(session.id, 'youth_attendance', value)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('children') || 'Children [0-12]'}
                    </Text>
                    <AppInput
                      value={formatNumber(session.attendance.child_attendance)}
                      onChangeText={value => updateWorshipSession(session.id, 'child_attendance', value)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('numberOfServicesForChildren') || 'Number of Services for Children'}
                    </Text>
                    <AppInput
                      value={formatNumber(session.attendance.number_of_service_for_children)}
                      onChangeText={value => updateWorshipSession(session.id, 'number_of_service_for_children', value)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('totalAttendance') || 'Total Attendance'}
                    </Text>
                    <AppInput
                      value={formatNumber(session.attendance.total_attendance)}
                      editable={false}
                      containerStyle={{backgroundColor: C.bgSelectedOption}}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.noDataText, {color: C.textSecondary}]}>
                {t('noWorshipServicesFound') || 'No worship services found'}
              </Text>
            )}
          </View>

          {/* Cell Groups */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('cellGroups') || 'Cell Groups'}
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfCellGroups') || 'Number of Cell Groups'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_cell_groups)}
                onChangeText={value => updateChurchMetrics('number_of_cell_groups', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('totalAttendanceInAll') || 'Total Attendance in All'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.cell_group_weekly_attendance)}
                onChangeText={value => updateChurchMetrics('cell_group_weekly_attendance', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Prayer Meetings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('prayerMeetings') || 'Prayer Meetings'}
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfPrayerMeetings') || 'Number of Prayer Meetings'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_prayer_meetings)}
                onChangeText={value => updateChurchMetrics('number_of_prayer_meetings', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('totalAttendanceInAll') || 'Total Attendance in All'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.prayer_meeting_weekly_attendance)}
                onChangeText={value => updateChurchMetrics('prayer_meeting_weekly_attendance', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Decisions, Discipling & Water Baptisms */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('decisionsDisciplingWaterBaptisms') || 'Decisions, Discipling & Water Baptisms'}
            </Text>
            
            <View style={styles.fieldContainer}>
              <View style={styles.labelWithHelp}>
                <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                  {t('numberOfNewDecisions') || 'Number of New Decisions'}
                </Text>
                <Text style={[styles.helpIcon, {color: C.textSecondary}]}>?</Text>
              </View>
              <AppInput
                value={formatNumber(currentMetrics.weekly_decisions_made)}
                onChangeText={value => updateChurchMetrics('weekly_decisions_made', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberBeingActivelyDiscipled') || 'Number being Actively Discipled'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.being_actively_discipled)}
                onChangeText={value => updateChurchMetrics('being_actively_discipled', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfWaterBaptised') || 'Number of Water Baptised'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.weekly_water_baptism)}
                onChangeText={value => updateChurchMetrics('weekly_water_baptism', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberInEncounterNextStepWeekend') || 'Number in an Encounter / Next Step Weekend'}
              </Text>
              <AppInput
                value={''} // This field is not in the API, keeping for UI consistency
                onChangeText={() => {}}
                keyboardType="numeric"
                placeholder="0"
                editable={false}
              />
            </View>
          </View>

          {/* Teaching & Training */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('teachingTraining') || 'Teaching & Training'}
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfGtLiwClasses') || 'Number of GT/LIW Classes'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_liw_classes)}
                onChangeText={value => updateChurchMetrics('number_of_liw_classes', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('totalAttendanceInAllGtLiwClasses') || 'Total Attendance in all GT/LIW Classes'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.liw_total_students)}
                onChangeText={value => updateChurchMetrics('liw_total_students', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('noOfLeadersInTrainingForPastoralOrChurchPlantingDuties') || 'No of Leaders in training for Pastoral or Church Planting duties'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_leaders_in_training_for_cpm)}
                onChangeText={value => updateChurchMetrics('number_of_leaders_in_training_for_cpm', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Giving */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('giving') || 'Giving'}
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('tithesOfferings') || 'Tithes + Offerings (VNĐ)'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.giving_in_local_currency)}
                onChangeText={value => updateChurchMetrics('giving_in_local_currency', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('missionsGivingMfp') || 'Missions Giving [MFP] (VNĐ)'}
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.mfp_in_local_currency)}
                onChangeText={value => updateChurchMetrics('mfp_in_local_currency', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.navButton, styles.backButton, {backgroundColor: COLORS.mainColor}]}
              onPress={handleBackWeek}
              disabled={currentWeekIndex === 0 || saving}
              activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.backButtonText}>
                  {t('back') || 'Back'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.nextButton, {backgroundColor: COLORS.mainColor}]}
              onPress={currentWeekIndex < weekNumbers.length - 1 ? handleNextWeek : handleSaveAll}
              disabled={saving}
              activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {currentWeekIndex < weekNumbers.length - 1
                    ? t('next') || 'Next'
                    : t('saveAll') || 'Save All'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: ms(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ms(16),
    fontSize: fs(14),
  },
  headerWrapper: {
    paddingHorizontal: ms(16),
  },
  infoContainer: {
    padding: ms(12),
    borderRadius: rs(8),
    marginBottom: ms(16),
  },
  infoLabel: {
    fontSize: fs(12),
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: ms(10),
  },
  weekInfo: {
    fontSize: fs(12),
    textAlign: 'center',
    fontWeight: '500',
    // marginBottom: ms(10),
  },
  weekNavScrollView: {
    marginBottom: ms(8),
  },
  weekNavContainer: {
    flexDirection: 'row',
    gap: ms(8),
    paddingHorizontal: ms(4),
  },
  weekNavButton: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: rs(3),
    borderWidth: 1,
    minWidth: ws(100),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(12),
  },
  weekNavText: {
    fontSize: fs(12),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: ms(4),
  },
  weekNavDateText: {
    fontSize: fs(10),
    fontWeight: '400',
    textAlign: 'center',
  },
  section: {
    // padding: ms(16),
    borderRadius: rs(8),
    marginBottom: ms(16),
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(16),
  },
  sessionContainer: {
    marginBottom: ms(8),
    paddingBottom: ms(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sessionName: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(12),
  },
  fieldContainer: {
    marginBottom: ms(16),
  },
  labelWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  helpIcon: {
    fontSize: fs(16),
    marginLeft: ms(4),
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: ms(20),
    fontSize: fs(14),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: ms(8),
    marginBottom: ms(16),
    gap: ms(12),
  },
  navButton: {
    flex: 1,
    paddingVertical: ms(12),
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hs(44),
  },
  backButton: {
    // Back button styles
  },
  nextButton: {
    // Next button styles
  },
  backButtonText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '600',
  },
});

