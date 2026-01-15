import React, {useState, useEffect, useCallback, useRef} from 'react';
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
import {SaveButton, CancelButton} from '../../../shared/components/ActionButtons';
import HelpIcon from '../../../shared/components/HelpIcon';
import {useMonthlyData} from '../context/MonthlyDataContext';

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
  const {getWeekData, setWeekData: saveWeekDataToContext} = useMonthlyData();
  
  const params = route.params as RouteParams;
  const {churchId, churchName, year, weekNumbers} = params;

  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [weekData, setWeekData] = useState<Map<number, WeeklyReportData>>(new Map());
  const [worshipSessions, setWorshipSessions] = useState<WorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWeeks, setLoadingWeeks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Map<string, boolean>>(new Map());
  const [completedWeeks, setCompletedWeeks] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Map<string, any>>(new Map());
  const loadingQueueRef = useRef<number[]>([]);

  const currentWeekNumber = weekNumbers[currentWeekIndex];
  const currentData = weekData.get(currentWeekNumber);

  // Load worship sessions structure and first week data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load worship services structure first
      const worshipServicesResult = await listWorshipServicesByChurch(churchId);
      
      if (worshipServicesResult?.data?.length > 0) {
        const sessions: WorshipSession[] = worshipServicesResult.data.map((ws: any) => ({
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

      // Start loading weeks sequentially
      if (weekNumbers.length > 0) {
        loadingQueueRef.current = [...weekNumbers];
        loadWeekSequentially();
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setLoading(false);
    }
  };

  // Load weeks sequentially - show first week immediately when loaded
  const loadWeekSequentially = async () => {
    if (loadingQueueRef.current.length === 0) {
      setLoading(false);
      return;
    }

    const weekNumber = loadingQueueRef.current.shift()!;
    setLoadingWeeks(prev => new Set(prev).add(weekNumber));

    try {
      // Check context first
      const contextData = getWeekData(churchId, year, weekNumber);
      if (contextData) {
        // Restore from context
        const restoredData: WeeklyReportData = {
          church_id: churchId,
          year,
          week_number: weekNumber,
          worship_sessions: contextData.worshipSessions,
          church_metrics: contextData.churchMetrics,
        };
        setWeekData(prev => new Map(prev).set(weekNumber, restoredData));
        
        // If this is the first week, show it immediately
        if (weekNumber === weekNumbers[0]) {
          setWorshipSessions(contextData.worshipSessions);
          setLoading(false);
        }
      } else {
        // Load from API
        const data = await getWeeklyReport(churchId, year, weekNumber);
        setWeekData(prev => new Map(prev).set(weekNumber, data));
        
        // If this is the first week, show it immediately
        if (weekNumber === weekNumbers[0]) {
          if (data.worship_sessions && data.worship_sessions.length > 0) {
            setWorshipSessions(data.worship_sessions);
          }
          setLoading(false);
        }
      }
    } catch (error: any) {
      // If report doesn't exist, create empty structure
      const emptyData: WeeklyReportData = {
        church_id: churchId,
        year,
        week_number: weekNumber,
        worship_sessions: [],
        church_metrics: {} as ChurchMetrics,
      };
      setWeekData(prev => new Map(prev).set(weekNumber, emptyData));
      
      // If this is the first week, show it immediately
      if (weekNumber === weekNumbers[0]) {
        setLoading(false);
      }
    } finally {
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekNumber);
        return newSet;
      });
      
      // Continue loading next week
      if (loadingQueueRef.current.length > 0) {
        loadWeekSequentially();
      } else {
        setLoading(false);
      }
    }
  };

  // Load data for a specific week when switching to it
  const loadWeekData = useCallback(async (weekNumber: number) => {
    // Check if already loaded
    if (weekData.has(weekNumber)) {
      const data = weekData.get(weekNumber);
      if (data?.worship_sessions) {
        setWorshipSessions(data.worship_sessions);
      }
      return;
    }

    // Check context first
    const contextData = getWeekData(churchId, year, weekNumber);
    if (contextData) {
      const restoredData: WeeklyReportData = {
        church_id: churchId,
        year,
        week_number: weekNumber,
        worship_sessions: contextData.worshipSessions,
        church_metrics: contextData.churchMetrics,
      };
      setWeekData(prev => new Map(prev).set(weekNumber, restoredData));
      setWorshipSessions(contextData.worshipSessions);
      return;
    }

    // Load from API
    setLoadingWeeks(prev => new Set(prev).add(weekNumber));
    try {
      const data = await getWeeklyReport(churchId, year, weekNumber);
      setWeekData(prev => new Map(prev).set(weekNumber, data));
      if (data.worship_sessions) {
        setWorshipSessions(data.worship_sessions);
      }
    } catch (error: any) {
      // If report doesn't exist, create empty structure
      const emptyData: WeeklyReportData = {
        church_id: churchId,
        year,
        week_number: weekNumber,
        worship_sessions: [],
        church_metrics: {} as ChurchMetrics,
      };
      setWeekData(prev => new Map(prev).set(weekNumber, emptyData));
    } finally {
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekNumber);
        return newSet;
      });
    }
  }, [churchId, year, weekData, getWeekData]);

  const updateWorshipSession = (sessionId: number, field: string, value: string) => {
    // Parse the input value (remove formatting, only keep digits)
    const numValue = parseNumber(value);
    setWorshipSessions(prev => {
      const updated = prev.map(session =>
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
      );
      
      // Save to context
      const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);
      saveWeekDataToContext(churchId, year, currentWeekNumber, updated, currentMetrics);
      
      return updated;
    });
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
    const updatedMetrics = {
      ...currentMetrics,
      [field]: numValue,
    };
    const updatedData: WeeklyReportData = {
      ...(currentData || {
        church_id: churchId,
        year,
        week_number: currentWeekNumber,
        worship_sessions: [],
        church_metrics: {} as ChurchMetrics,
      }),
      church_metrics: updatedMetrics,
    };
    setWeekData(prev => new Map(prev).set(currentWeekNumber, updatedData));
    
    // Save to context
    saveWeekDataToContext(churchId, year, currentWeekNumber, worshipSessions, updatedMetrics);
    
    // Clear error when user types
    setFieldErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(`church_metrics.${field}`);
      return newMap;
    });
  };

  // Check if a week has all required fields filled
  const checkWeekCompleted = useCallback((weekNum: number, data: WeeklyReportData | undefined): boolean => {
    if (!data) return false;
    
    // Check worship sessions - at least one session must have attendance
    const hasWorshipData = data.worship_sessions && data.worship_sessions.some(session => 
      session.attendance.adult_attendance !== null ||
      session.attendance.youth_attendance !== null ||
      session.attendance.child_attendance !== null
    );
    
    if (!hasWorshipData) return false;
    
    // Check church metrics - all required fields must be filled
    const metrics = data.church_metrics;
    const requiredFields: (keyof ChurchMetrics)[] = [
      'number_of_cell_groups',
      'cell_group_weekly_attendance',
      'number_of_prayer_meetings',
      'prayer_meeting_weekly_attendance',
      'weekly_decisions_made',
      'being_actively_discipled',
      'weekly_water_baptism',
      'number_of_liw_classes',
      'liw_total_students',
      'number_of_leaders_in_training_for_cpm',
      'giving_in_local_currency',
      'mfp_in_local_currency',
    ];
    
    return requiredFields.every(field => metrics[field] !== null && metrics[field] !== undefined);
  }, []);

  // Validate current week data
  const validateCurrentWeek = (): {isValid: boolean; firstErrorField?: string} => {
    const errors = new Map<string, boolean>();
    let firstErrorField: string | undefined;
    
    // Validate worship sessions
    if (worshipSessions.length === 0) {
      const fieldKey = 'worship_sessions';
      errors.set(fieldKey, true);
      if (!firstErrorField) firstErrorField = fieldKey;
    } else {
      worshipSessions.forEach((session, index) => {
        if (session.attendance.adult_attendance === null && 
            session.attendance.youth_attendance === null && 
            session.attendance.child_attendance === null) {
          const fieldKey = `worship_session_${session.id}_attendance`;
          errors.set(fieldKey, true);
          if (!firstErrorField) firstErrorField = fieldKey;
        }
      });
    }
    
    // Validate church metrics
    const metrics = currentData?.church_metrics || ({} as ChurchMetrics);
    const requiredFields: Array<{key: keyof ChurchMetrics; fieldKey: string}> = [
      {key: 'number_of_cell_groups', fieldKey: 'church_metrics.number_of_cell_groups'},
      {key: 'cell_group_weekly_attendance', fieldKey: 'church_metrics.cell_group_weekly_attendance'},
      {key: 'number_of_prayer_meetings', fieldKey: 'church_metrics.number_of_prayer_meetings'},
      {key: 'prayer_meeting_weekly_attendance', fieldKey: 'church_metrics.prayer_meeting_weekly_attendance'},
      {key: 'weekly_decisions_made', fieldKey: 'church_metrics.weekly_decisions_made'},
      {key: 'being_actively_discipled', fieldKey: 'church_metrics.being_actively_discipled'},
      {key: 'weekly_water_baptism', fieldKey: 'church_metrics.weekly_water_baptism'},
      {key: 'number_of_liw_classes', fieldKey: 'church_metrics.number_of_liw_classes'},
      {key: 'liw_total_students', fieldKey: 'church_metrics.liw_total_students'},
      {key: 'number_of_leaders_in_training_for_cpm', fieldKey: 'church_metrics.number_of_leaders_in_training_for_cpm'},
      {key: 'giving_in_local_currency', fieldKey: 'church_metrics.giving_in_local_currency'},
      {key: 'mfp_in_local_currency', fieldKey: 'church_metrics.mfp_in_local_currency'},
    ];
    
    requiredFields.forEach(({key, fieldKey}) => {
      if (metrics[key] === null || metrics[key] === undefined) {
        errors.set(fieldKey, true);
        if (!firstErrorField) firstErrorField = fieldKey;
      }
    });
    
    setFieldErrors(errors);
    return {isValid: errors.size === 0, firstErrorField};
  };

  // Scroll to field with error
  const scrollToField = (fieldKey: string) => {
    setTimeout(() => {
      const fieldRef = fieldRefs.current.get(fieldKey);
      if (fieldRef && scrollViewRef.current) {
        try {
          (fieldRef as any).measureLayout(
            scrollViewRef.current as any,
            (x: number, y: number) => {
              scrollViewRef.current?.scrollTo({y: Math.max(0, y - 100), animated: true});
            },
            () => {}
          );
        } catch (error) {
          console.error('Error scrolling to field:', error);
        }
      }
    }, 100);
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
    // Validate before saving
    const validation = validateCurrentWeek();
    if (!validation.isValid) {
      Alert.alert(
        t('error') || 'Error',
        t('pleaseFillAllRequiredFields') || 'Please fill all required fields',
      );
      if (validation.firstErrorField) {
        scrollToField(validation.firstErrorField);
      }
      return;
    }
    
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
    } catch (error: any) {
      console.error('Error saving all data:', error);
      Alert.alert(t('error') || 'Error', error?.message || t('failedToSaveData') || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < weekNumbers.length - 1) {
      // Validate before moving to next week
      const validation = validateCurrentWeek();
      if (!validation.isValid) {
        Alert.alert(
          t('error') || 'Error',
          t('pleaseFillAllRequiredFields') || 'Please fill all required fields',
        );
        if (validation.firstErrorField) {
          scrollToField(validation.firstErrorField);
        }
        return;
      }
      
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
      
      // Save to context
      saveWeekDataToContext(churchId, year, currentWeekNumber, worshipSessions, currentMetrics);
      
      // Mark week as completed
      if (checkWeekCompleted(currentWeekNumber, updatedData)) {
        setCompletedWeeks(prev => new Set(prev).add(currentWeekNumber));
      }
      
      // Switch to next week
      const nextIndex = currentWeekIndex + 1;
      setCurrentWeekIndex(nextIndex);
      const nextWeekNumber = weekNumbers[nextIndex];
      loadWeekData(nextWeekNumber);
      setFieldErrors(new Map()); // Clear errors when switching weeks
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
      
      // Save to context
      saveWeekDataToContext(churchId, year, currentWeekNumber, worshipSessions, currentMetrics);
      
      // Switch to previous week
      const prevIndex = currentWeekIndex - 1;
      setCurrentWeekIndex(prevIndex);
      const prevWeekNumber = weekNumbers[prevIndex];
      loadWeekData(prevWeekNumber);
    }
  };

  // Check if current week is completed based on current form state
  const isCurrentWeekCompleted = useCallback(() => {
    // Check worship sessions - at least one session must have attendance
    const hasWorshipData = worshipSessions.length > 0 && worshipSessions.some(session => 
      session.attendance.adult_attendance !== null ||
      session.attendance.youth_attendance !== null ||
      session.attendance.child_attendance !== null
    );
    
    if (!hasWorshipData) return false;
    
    // Check church metrics - all required fields must be filled
    const metrics = currentData?.church_metrics || ({} as ChurchMetrics);
    const requiredFields: (keyof ChurchMetrics)[] = [
      'number_of_cell_groups',
      'cell_group_weekly_attendance',
      'number_of_prayer_meetings',
      'prayer_meeting_weekly_attendance',
      'weekly_decisions_made',
      'being_actively_discipled',
      'weekly_water_baptism',
      'number_of_liw_classes',
      'liw_total_students',
      'number_of_leaders_in_training_for_cpm',
      'giving_in_local_currency',
      'mfp_in_local_currency',
    ];
    
    return requiredFields.every(field => metrics[field] !== null && metrics[field] !== undefined);
  }, [worshipSessions, currentData]);

  // Update worship sessions when switching weeks
  useEffect(() => {
    // Check context first when switching weeks
    const contextData = getWeekData(churchId, year, currentWeekNumber);
    if (contextData) {
      setWorshipSessions(contextData.worshipSessions);
    } else if (currentData?.worship_sessions) {
      setWorshipSessions(currentData.worship_sessions);
    }
    
    // Check if current week is completed
    if (currentData) {
      const isCompleted = checkWeekCompleted(currentWeekNumber, currentData);
      if (isCompleted) {
        setCompletedWeeks(prev => new Set(prev).add(currentWeekNumber));
      }
    }
    setFieldErrors(new Map()); // Clear errors when switching weeks
  }, [currentWeekNumber, currentData, checkWeekCompleted, churchId, year, getWeekData]);

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
          ref={scrollViewRef}
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
              {weekNumbers.map((weekNum, index) => {
                const weekDataForCheck = weekData.get(weekNum);
                const isLoading = loadingWeeks.has(weekNum);
                const isCompleted = completedWeeks.has(weekNum) || checkWeekCompleted(weekNum, weekDataForCheck);
                const isCurrent = index === currentWeekIndex;
                
                // Can access if:
                // 1. It's the first week (index 0)
                // 2. It's the current week
                // 3. Previous week is completed AND this week's data is loaded
                const canAccess = 
                  index === 0 || 
                  isCurrent || 
                  (index > 0 && 
                   (completedWeeks.has(weekNumbers[index - 1]) || 
                    checkWeekCompleted(weekNumbers[index - 1], weekData.get(weekNumbers[index - 1]))) &&
                   !isLoading &&
                   weekData.has(weekNum));
                
                return (
                  <TouchableOpacity
                    key={weekNum}
                    style={[
                      styles.weekNavButton,
                      {
                        backgroundColor: isCurrent ? COLORS.mainColor : isCompleted ? COLORS.successColor : C.surface,
                        borderColor: isCurrent ? COLORS.mainColor : isCompleted ? COLORS.successColor : C.border,
                        opacity: canAccess ? 1 : 0.5,
                      },
                    ]}
                    onPress={() => {
                      if (!canAccess) {
                        if (isLoading) {
                          Alert.alert(
                            t('error') || 'Error',
                            t('loading') || 'Week data is still loading',
                          );
                        } else {
                          Alert.alert(
                            t('error') || 'Error',
                            t('pleaseCompletePreviousWeeks') || 'Please complete previous weeks first',
                          );
                        }
                        return;
                      }
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
                      
                      // Save to context
                      saveWeekDataToContext(churchId, year, currentWeekNumber, worshipSessions, currentMetrics);
                      
                      // Switch week
                      setCurrentWeekIndex(index);
                      loadWeekData(weekNum);
                    }}
                    disabled={!canAccess}
                    activeOpacity={0.7}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={isCurrent || isCompleted ? '#fff' : COLORS.mainColor} />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.weekNavText,
                            {
                              color: isCurrent || isCompleted ? '#fff' : C.textPrimary,
                            },
                          ]}>
                          {t('week') || 'Week'} {weekNum}
                        </Text>
                        <Text
                          style={[
                            styles.weekNavDateText,
                            {
                              color: isCurrent || isCompleted ? '#fff' : C.textPrimary,
                            },
                          ]}>
                          ({getWeekDateRange(year, weekNum)})
                        </Text>
                        {isCompleted && !isCurrent && (
                          <Text style={styles.weekNavCheckmark}>✓</Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Main Worship Service Attendance */}
          <View style={styles.section}>
            {worshipSessions.length > 0 ? (
              worshipSessions.map((session, index) => {
                const attendanceError = fieldErrors.has(`worship_session_${session.id}_attendance`);
                return (
                  <View 
                    key={session.id} 
                    style={styles.sessionContainer}
                    ref={(ref) => {
                      if (ref) fieldRefs.current.set(`worship_session_${session.id}`, ref);
                    }}>
                    {worshipSessions.length > 1 && (
                      <Text style={[styles.sessionName, {color: C.textPrimary}]}>
                        {index + 1}. {t('mainWorshipServiceAttendance') || 'Main Worship Service Attendance'}: {session.name} ({session.day_name} {session.time?.substring(0, 5)})
                      </Text>
                    )}
                    
                    <View 
                      style={styles.fieldContainer}
                      ref={(ref) => {
                        if (ref) fieldRefs.current.set(`worship_session_${session.id}_attendance`, ref);
                      }}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('adults') || 'Adults'} *
                      </Text>
                      <AppInput
                        value={formatNumber(session.attendance.adult_attendance)}
                        onChangeText={value => {
                          updateWorshipSession(session.id, 'adult_attendance', value);
                          setFieldErrors(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(`worship_session_${session.id}_attendance`);
                            return newMap;
                          });
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        error={attendanceError && session.attendance.adult_attendance === null && session.attendance.youth_attendance === null && session.attendance.child_attendance === null}
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
                );
              })
            ) : (
              <Text style={[styles.noDataText, {color: C.textSecondary}]}>
                {t('noWorshipServicesFound') || 'No worship services found'}
              </Text>
            )}
          </View>

          {/* Cell Groups */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {worshipSessions.length + 1}. {t('cellGroups') || 'Cell Groups'}
            </Text>
            
            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.number_of_cell_groups', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfCellGroups') || 'Number of Cell Groups'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_cell_groups)}
                onChangeText={value => updateChurchMetrics('number_of_cell_groups', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.number_of_cell_groups')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.cell_group_weekly_attendance', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('totalAttendanceInAll') || 'Total Attendance in All'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.cell_group_weekly_attendance)}
                onChangeText={value => updateChurchMetrics('cell_group_weekly_attendance', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.cell_group_weekly_attendance')}
              />
            </View>
          </View>

          {/* Prayer Meetings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {worshipSessions.length + 2}. {t('prayerMeetings') || 'Prayer Meetings'}
            </Text>
            
            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.number_of_prayer_meetings', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfPrayerMeetings') || 'Number of Prayer Meetings'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_prayer_meetings)}
                onChangeText={value => updateChurchMetrics('number_of_prayer_meetings', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.number_of_prayer_meetings')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.prayer_meeting_weekly_attendance', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('totalAttendanceInAll') || 'Total Attendance in All'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.prayer_meeting_weekly_attendance)}
                onChangeText={value => updateChurchMetrics('prayer_meeting_weekly_attendance', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.prayer_meeting_weekly_attendance')}
              />
            </View>
          </View>

          {/* Decisions, Discipling & Water Baptisms */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {worshipSessions.length + 3}. {t('decisionsDisciplingWaterBaptisms') || 'Decisions, Discipling & Water Baptisms'}
            </Text>
            
            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.weekly_decisions_made', ref);
              }}>
              <View style={styles.labelWithHelp}>
                <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                  {t('numberOfNewDecisions') || 'Number of New Decisions'} *
                </Text>
                <HelpIcon
                  title={t('numberOfNewDecisions') || 'Number of New Decisions'}
                  message={t('helpNumberOfNewDecisions') || 'Number of people who gave their lives to Christ in that week'}
                />
              </View>
              <AppInput
                value={formatNumber(currentMetrics.weekly_decisions_made)}
                onChangeText={value => updateChurchMetrics('weekly_decisions_made', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.weekly_decisions_made')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.being_actively_discipled', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberBeingActivelyDiscipled') || 'Number being Actively Discipled'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.being_actively_discipled)}
                onChangeText={value => updateChurchMetrics('being_actively_discipled', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.being_actively_discipled')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.weekly_water_baptism', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfWaterBaptised') || 'Number of Water Baptised'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.weekly_water_baptism)}
                onChangeText={value => updateChurchMetrics('weekly_water_baptism', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.weekly_water_baptism')}
              />
            </View>

            {/* <View style={styles.fieldContainer}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberInEncounterNextStepWeekend') || 'Number in an Encounter / Next Step Weekend'}
              </Text>
              <AppInput
                value={''} // This field is not in the API, keeping for UI consistency
                onChangeText={() => {}}
                keyboardType="numeric"
                placeholder="0"
              />
            </View> */}
          </View>

          {/* Teaching & Training */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {worshipSessions.length + 4}. {t('teachingTraining') || 'Teaching & Training'}
            </Text>
            
            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.number_of_liw_classes', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('numberOfGtLiwClasses') || 'Number of GT/LIW Classes'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_liw_classes)}
                onChangeText={value => updateChurchMetrics('number_of_liw_classes', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.number_of_liw_classes')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.liw_total_students', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('totalAttendanceInAllGtLiwClasses') || 'Total Attendance in all GT/LIW Classes'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.liw_total_students)}
                onChangeText={value => updateChurchMetrics('liw_total_students', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.liw_total_students')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.number_of_leaders_in_training_for_cpm', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('noOfLeadersInTrainingForPastoralOrChurchPlantingDuties') || 'No of Leaders in training for Pastoral or Church Planting duties'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.number_of_leaders_in_training_for_cpm)}
                onChangeText={value => updateChurchMetrics('number_of_leaders_in_training_for_cpm', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.number_of_leaders_in_training_for_cpm')}
              />
            </View>
          </View>

          {/* Giving */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {worshipSessions.length + 5}. {t('giving') || 'Giving'}
            </Text>
            
            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.giving_in_local_currency', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('tithesOfferings') || 'Tithes + Offerings (VNĐ)'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.giving_in_local_currency)}
                onChangeText={value => updateChurchMetrics('giving_in_local_currency', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.giving_in_local_currency')}
              />
            </View>

            <View 
              style={styles.fieldContainer}
              ref={(ref) => {
                if (ref) fieldRefs.current.set('church_metrics.mfp_in_local_currency', ref);
              }}>
              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                {t('missionsGivingMfp') || 'Missions Giving [MFP] (VNĐ)'} *
              </Text>
              <AppInput
                value={formatNumber(currentMetrics.mfp_in_local_currency)}
                onChangeText={value => updateChurchMetrics('mfp_in_local_currency', value)}
                keyboardType="numeric"
                placeholder="0"
                error={fieldErrors.has('church_metrics.mfp_in_local_currency')}
              />
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <CancelButton
              label={t('back') || 'Back'}
              onPress={handleBackWeek}
              disabled={currentWeekIndex === 0 || saving}
              style={styles.navButton}
            />
            <SaveButton
              label={
                currentWeekIndex < weekNumbers.length - 1
                  ? t('next') || 'Next'
                  : t('saveAll') || 'Save All'
              }
              onPress={currentWeekIndex < weekNumbers.length - 1 ? handleNextWeek : handleSaveAll}
              disabled={saving || (currentWeekIndex < weekNumbers.length - 1 && !isCurrentWeekCompleted())}
              style={styles.navButton}
            />
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
  weekNavCheckmark: {
    fontSize: fs(12),
    fontWeight: 'bold',
    color: '#fff',
    marginTop: ms(2),
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
  },
});

