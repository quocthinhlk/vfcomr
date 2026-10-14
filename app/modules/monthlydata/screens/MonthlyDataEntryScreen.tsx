import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {parseApiError} from '../../../shared/utils/apiErrorHandler';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useLanguage} from '../../../shared/context/LanguageContext';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ws, ms, rs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import AppInput from '../../../shared/components/AppInput';
import {
  WeeklyReportData,
  WorshipSession,
  ChurchMetrics,
  getWeeklyReport,
  createOrUpdateWeeklyReport,
  batchCreateOrUpdateWeeklyReports,
  buildChurchMetricsPayload,
  buildWorshipSessionsPayload,
} from '../services/monthlydata.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SaveButton,
  CancelButton,
} from '../../../shared/components/ActionButtons';
import HelpIcon from '../../../shared/components/HelpIcon';
import {useMonthlyData} from '../context/MonthlyDataContext';
import api from '../../../config/api';
import {getIsoWeekDateRangeLabel, getIsoWeekDisplayYear} from '../../../shared/utils/isoWeek';
import {listWorshipServicesByChurch} from '../../worshipservices/services/worshipService.service';
import {getChurchDetail} from '../../church/services/church.service';
import type {MonthlyDataEntryColumnLayout} from '../constants/monthlyDataEntryLayout';
import {MonthlyDataEntryLayoutToggle} from '../components/MonthlyDataEntryLayoutToggle';
import {useMonthlyDataEntryColumnLayout} from '../hooks/useMonthlyDataEntryColumnLayout';
import {
  MONTHLY_DATA_ENTRY_DOUBLE_FIELD_WIDTH,
  MONTHLY_DATA_ENTRY_SINGLE_INPUT_WIDTH,
  MONTHLY_DATA_ENTRY_SINGLE_LABEL_WIDTH,
} from '../constants/monthlyDataEntryLayout';

type AppInputProps = React.ComponentProps<typeof AppInput>;

const MONTHLY_DATA_INPUT_FONT_SIZE = fs(15);

const MonthlyDataInput = ({style, ...props}: AppInputProps) => (
  <AppInput
    {...props}
    style={[{fontSize: MONTHLY_DATA_INPUT_FONT_SIZE}, style]}
  />
);

type MonthlyDataFieldSlot = {
  label: React.ReactNode;
  input: React.ReactNode;
};

type MonthlyDataFieldPairProps = {
  layout: MonthlyDataEntryColumnLayout;
  left: MonthlyDataFieldSlot;
  right: MonthlyDataFieldSlot;
  leftRefKey?: string;
  rightRefKey?: string;
  fieldRefs: React.MutableRefObject<Map<string, unknown>>;
};

function bindFieldRef(
  fieldRefs: React.MutableRefObject<Map<string, unknown>>,
  key?: string,
) {
  return (ref: View | null) => {
    if (ref && key) {
      fieldRefs.current.set(key, ref);
    }
  };
}

/** 1 col: label + input on one row (70% / 30%). 2 col: label above input, two equal 50% columns. */
function renderFormField(
  layout: MonthlyDataEntryColumnLayout,
  label: React.ReactNode,
  input: React.ReactNode,
  fieldRefs: React.MutableRefObject<Map<string, unknown>>,
  refKey?: string,
) {
  const labelWrap = (
    <View
      style={[
        styles.rowLabelWrapper,
        layout === 'double' && styles.rowLabelWrapperDouble,
        layout === 'single' && styles.rowLabelWrapperInline,
      ]}>
      {label}
    </View>
  );

  if (layout === 'single') {
    return (
      <View
        style={[styles.fieldContainer, styles.fieldInlineRow]}
        ref={bindFieldRef(fieldRefs, refKey)}>
        <View style={styles.fieldInlineLabel}>{labelWrap}</View>
        <View style={styles.fieldInlineInput}>
          <View style={styles.fieldInlineInputInner}>{input}</View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fieldContainer,
        styles.fieldContainerRow,
        styles.fieldContainerDouble,
      ]}
      ref={bindFieldRef(fieldRefs, refKey)}>
      {labelWrap}
      <View style={styles.fieldDoubleInputInner}>{input}</View>
    </View>
  );
}

/** Renders two fields: paired horizontally (2-col layout) or stacked (1-col). */
function MonthlyDataFieldPair({
  layout,
  left,
  right,
  leftRefKey,
  rightRefKey,
  fieldRefs,
}: MonthlyDataFieldPairProps) {
  const leftField = renderFormField(
    layout,
    left.label,
    left.input,
    fieldRefs,
    leftRefKey,
  );
  const rightField = renderFormField(
    layout,
    right.label,
    right.input,
    fieldRefs,
    rightRefKey,
  );

  if (layout === 'double') {
    return (
      <View style={styles.fieldRow}>
        <View style={[styles.fieldHalf, styles.fieldHalfLeft]}>{leftField}</View>
        <View style={[styles.fieldHalf, styles.fieldHalfRight]}>{rightField}</View>
      </View>
    );
  }

  return (
    <>
      {leftField}
      {rightField}
    </>
  );
}

interface RouteParams {
  churchId: number;
  churchName: string;
  year: number;
  month: number;
  weekNumbers: number[];
}

// Helper function to format number with thousand separators
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) {return '';}
  return num.toLocaleString('en-US', {maximumFractionDigits: 0});
};

// Helper function to parse formatted number string to number
const parseNumber = (formattedStr: string): number | null => {
  if (!formattedStr || formattedStr.trim() === '') {return null;}
  // Remove all non-digit characters
  const cleanStr = formattedStr.replace(/[^\d]/g, '');
  if (!cleanStr) {return null;}
  const num = parseInt(cleanStr, 10);
  return isNaN(num) ? null : num;
};

const getAdultAttendanceFieldKey = (sessionId: number) =>
  `worship_session_${sessionId}_attendance`;

const hasRequiredAdultAttendance = (
  sessions: WorshipSession[] | undefined,
): boolean => {
  if (!sessions || sessions.length === 0) {
    return false;
  }
  return sessions.every(
    session => session.attendance.adult_attendance !== null,
  );
};

export default function MonthlyDataEntryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const {selectedLanguage} = useLanguage();
  const C = useThemedColors();
  const {
    getWeekData,
    setWeekData: saveWeekDataToContext,
    removeWeekData: removeWeekDataFromContext,
  } = useMonthlyData();

  const params = (route.params ?? {}) as Partial<RouteParams>;
  const routeChurchId = params.churchId ?? null;
  const churchName = params.churchName ?? '';
  const year = typeof params.year === 'number' ? params.year : 0;
  const weekNumbers = Array.isArray(params.weekNumbers)
    ? params.weekNumbers
    : [];

  const [selectedWeekNumbers, setSelectedWeekNumbers] = useState<number[]>(weekNumbers);
  const [churchId, setChurchId] = useState<number | null>(
    routeChurchId || null,
  );
  const [displayChurchName, setDisplayChurchName] = useState<string>(
    churchName || '',
  );
  const [lastReportDate, setLastReportDate] = useState<string>('');
  /** From `GET /churches/:id` → `data.currency_name` (for giving field labels). */
  const [churchCurrencyName, setChurchCurrencyName] = useState<string>('');
  const dashboardInfoLoadKeyRef = useRef<string | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [weekData, setWeekData] = useState<Map<number, WeeklyReportData>>(
    new Map(),
  );
  const [worshipSessions, setWorshipSessions] = useState<WorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  /** First week could not be fetched (offline / timeout): never show it as an empty, saveable form. */
  const [initialLoadError, setInitialLoadError] = useState<unknown>(null);
  const [loadingWeeks, setLoadingWeeks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveOption, setSaveOption] = useState<'continue' | 'goToChurch'>(
    'continue',
  );
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const saveSuccessActionRef = useRef<(() => void) | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [completedWeeks, setCompletedWeeks] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollAnimRef = useRef<NodeJS.Timeout | null>(null);
  const scrollYRef = useRef(0);
  const fieldRefs = useRef<Map<string, any>>(new Map());
  const loadingQueueRef = useRef<number[]>([]);
  const loadingWeeksRef = useRef<Set<number>>(new Set());
  const loadedWeeksRef = useRef<Set<number>>(new Set());
  const loadWeekDataRef = useRef<(weekNumber: number) => void>(() => {});
  const worshipServicesRef = useRef<WorshipSession[] | null>(null);
  const {columnLayout, setColumnLayout: setColumnLayoutPreference} =
    useMonthlyDataEntryColumnLayout();

  const sortedWeekNumbers = useMemo(() => {
    return selectedWeekNumbers.length > 0
      ? [...selectedWeekNumbers].sort((a, b) => a - b)
      : [];
  }, [selectedWeekNumbers]);
  const currentWeekNumber = useMemo(() => {
    return sortedWeekNumbers[currentWeekIndex] ?? sortedWeekNumbers[0] ?? 0;
  }, [sortedWeekNumbers, currentWeekIndex]);

  useEffect(() => {
    setSelectedWeekNumbers(weekNumbers);
    setCurrentWeekIndex(0);
  }, [weekNumbers]);

  const removeSelectedWeek = useCallback(
    (weekNum: number) => {
      if (!churchId || !year) {
        return;
      }

      if (sortedWeekNumbers.length <= 1) {
        Alert.alert(
          t('error') || 'Error',
          t('pleaseSelectAtLeastOneWeek') || 'Please keep at least one week',
        );
        return;
      }

      const removedIndex = sortedWeekNumbers.indexOf(weekNum);
      const nextWeeks = selectedWeekNumbers.filter(w => w !== weekNum);
      const nextSorted = [...nextWeeks].sort((a, b) => a - b);

      setSelectedWeekNumbers(nextWeeks);

      // Drop unsaved in-memory data for that week
      setWeekData(prev => {
        if (!prev.has(weekNum)) {
          return prev;
        }
        const next = new Map(prev);
        next.delete(weekNum);
        return next;
      });

      setCompletedWeeks(prev => {
        if (!prev.has(weekNum)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(weekNum);
        return next;
      });

      setLoadingWeeks(prev => {
        if (!prev.has(weekNum)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(weekNum);
        return next;
      });

      loadedWeeksRef.current.delete(weekNum);
      loadingWeeksRef.current.delete(weekNum);
      loadingQueueRef.current = loadingQueueRef.current.filter(w => w !== weekNum);

      // Remove from context cache too (so it doesn't reappear on tab switch)
      removeWeekDataFromContext(churchId, year, weekNum);

      // Keep current week index valid + load the new active week if needed
      setCurrentWeekIndex(prevIdx => {
        const maxIndex = Math.max(0, nextSorted.length - 1);
        const nextIdx =
          removedIndex === -1
            ? Math.min(prevIdx, maxIndex)
            : removedIndex < prevIdx
              ? Math.max(0, prevIdx - 1)
              : removedIndex === prevIdx
                ? Math.min(prevIdx, maxIndex)
                : Math.min(prevIdx, maxIndex);

        const nextWeek = nextSorted[nextIdx];
        if (nextWeek && nextWeek !== currentWeekNumber) {
          loadWeekDataRef.current(nextWeek);
        }

        return nextIdx;
      });
    },
    [
      churchId,
      currentWeekNumber,
      removeWeekDataFromContext,
      selectedWeekNumbers,
      sortedWeekNumbers,
      t,
      year,
    ],
  );

  const renderRowLabel = (text: string, required = false) => (
    <Text
      style={[
        styles.rowLabel,
        columnLayout === 'single' && styles.rowLabelInline,
        {color: C.textSecondary},
      ]}
      category="label">
      {text}
      {required ? <Text style={styles.requiredMark}> *</Text> : null}
    </Text>
  );
  const currentData = useMemo(
    () => weekData.get(currentWeekNumber),
    [weekData, currentWeekNumber],
  );

  // Resolve church_id (prefer route param for correctness and speed)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (routeChurchId && mounted) {
          setChurchId(routeChurchId);
          await AsyncStorage.setItem('selectedChurchId', String(routeChurchId));
          return;
        }
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        if (savedChurchId) {
          const id = parseInt(savedChurchId, 10);
          if (!isNaN(id) && mounted) {
            setChurchId(id);
          }
        }
      } catch (error) {
        console.error('Error loading church ID from AsyncStorage:', error);
        // Fallback to route param on error
        if (routeChurchId) {
          setChurchId(routeChurchId);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [routeChurchId]);

  useEffect(() => {
    setChurchCurrencyName('');
  }, [churchId]);

  // Church currency label for monthly giving fields (`data.currency_name` on church detail)
  useEffect(() => {
    if (!churchId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getChurchDetail(churchId);
        if (cancelled) {
          return;
        }
        const name = String(data?.currency_name ?? '').trim();
        if (name) {
          setChurchCurrencyName(name);
        }
      } catch {
        // ignore — labels work without suffix
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [churchId]);

  // Resolve church name for display (route param -> AsyncStorage -> dashboard API)
  useEffect(() => {
    if (churchName) {
      setDisplayChurchName(churchName);
    }
    let mounted = true;
    (async () => {
      try {
        const savedChurchName = await AsyncStorage.getItem(
          'selectedChurchName',
        );
        if (mounted && savedChurchName) {
          setDisplayChurchName(savedChurchName);
          return;
        }

        if (mounted && churchId) {
          const response = await api.get('dashboard', {
            params: {church_id: churchId},
          });
          const dashboardInfo = response.data?.data?.dashboard_info;
          const dashboardChurchName = dashboardInfo?.church_name;
          if (dashboardInfo?.last_report_date) {
            setLastReportDate(String(dashboardInfo.last_report_date));
          }
          if (dashboardChurchName) {
            setDisplayChurchName(dashboardChurchName);
            await AsyncStorage.setItem(
              'selectedChurchName',
              String(dashboardChurchName),
            );
          }
        }
      } catch (error) {
        console.error('Error loading church name:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [churchName, churchId]);

  // Always attempt to load last report date when we have churchId
  useEffect(() => {
    if (!churchId) {return;}
    const key = String(churchId);
    if (dashboardInfoLoadKeyRef.current === key) {return;}
    dashboardInfoLoadKeyRef.current = key;
    (async () => {
      try {
        const response = await api.get('dashboard', {params: {church_id: churchId}});
        const dashboardInfo = response.data?.data?.dashboard_info;
        if (dashboardInfo?.last_report_date) {
          setLastReportDate(String(dashboardInfo.last_report_date));
        }
      } catch {
        // ignore
      }
    })();
  }, [churchId]);

  const localeMap: Record<string, string> = {
    en: 'en',
    pt: 'pt',
    es: 'es',
    fr: 'fr',
    zh: 'zh',
    ms: 'ms',
    ja: 'ja',
  };
  const formatLastRecord = useCallback(
    (dateString: string) => {
      if (!dateString) {return '-';}
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {return '-';}
      const locale = localeMap[selectedLanguage as string] || 'en';
      const month = new Intl.DateTimeFormat(locale, {month: 'short'}).format(date);
      const year = date.getFullYear();
      return `${month} ${year}`;
    },
    [selectedLanguage],
  );

  const tithesOfferingsLabel = useMemo(() => {
    const base = String(t('tithesOfferings') || 'Tithes + Offerings').trim();
    return churchCurrencyName ? `${base} (${churchCurrencyName})` : base;
  }, [t, churchCurrencyName]);

  const missionsGivingMfpLabel = useMemo(() => {
    const base = String(t('missionsGivingMfp') || 'Missions Giving [MFP]').trim();
    return churchCurrencyName ? `${base} (${churchCurrencyName})` : base;
  }, [t, churchCurrencyName]);

  // Load worship sessions structure and first week data
  useEffect(() => {
    if (churchId) {
      loadInitialData();
    }
  }, [churchId, sortedWeekNumbers]);

  const fetchWorshipServices = useCallback(
    /**
     * `strict`: throw instead of returning []. Forms built from server data need
     * the full service list; without it, sessions would silently go missing.
     */
    async (force = false, strict = false): Promise<WorshipSession[]> => {
      if (!churchId) {return [];}
      if (!force && worshipServicesRef.current) {
        return worshipServicesRef.current;
      }
      try {
        const listResponse = await listWorshipServicesByChurch(churchId);
        const services = Array.isArray(listResponse?.data)
          ? listResponse.data
          : Array.isArray((listResponse as any)?.data?.data)
          ? (listResponse as any).data.data
          : [];
        const mapped = services.map((service: any) => ({
          id: service.id,
          name: service.name || '',
          day_name: service.day_name || '',
          time: service.time || '',
          attendance: {
            adult_attendance: null,
            youth_attendance: null,
            child_attendance: null,
            number_of_service_for_children: null,
            total_attendance: null,
          },
        }));
        worshipServicesRef.current = mapped;
        return mapped;
      } catch (error) {
        console.error('Error loading worship services:', error);
        if (strict) {
          throw error;
        }
        return [];
      }
    },
    [churchId],
  );

  useEffect(() => {
    worshipServicesRef.current = null;
  }, [churchId]);

  const mergeWorshipSessions = useCallback(
    (base: WorshipSession[], reported?: WorshipSession[]) => {
      if (!base.length && reported && reported.length > 0) {return reported;}
      const reportMap = new Map(
        (reported || []).map(session => [session.id, session]),
      );
      const merged = base.map(service => {
        const report = reportMap.get(service.id);
        if (!report) {return service;}
        return {
          ...service,
          attendance: report.attendance ?? service.attendance,
        };
      });
      (reported || []).forEach(session => {
        if (!merged.some(existing => existing.id === session.id)) {
          merged.push(session);
        }
      });
      return merged;
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!churchId) {return;}
      const services = await fetchWorshipServices(true);
      if (!mounted || services.length === 0) {return;}
      setWorshipSessions(prev => mergeWorshipSessions(services, prev));
      if (currentWeekNumber) {
        setWeekData(prev => {
          const current = prev.get(currentWeekNumber);
          if (!current) {return prev;}
          const merged = mergeWorshipSessions(
            services,
            current.worship_sessions || [],
          );
          return new Map(prev).set(currentWeekNumber, {
            ...current,
            worship_sessions: merged,
          });
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [churchId, currentWeekNumber, fetchWorshipServices, mergeWorshipSessions]);

  const loadInitialData = async () => {
    if (!churchId) {return;}
    setLoading(true);
    setInitialLoadError(null);
    try {
      const firstWeekNumber = sortedWeekNumbers[0];

      if (firstWeekNumber) {
        // Use shared loader to reuse cached/context data
        await loadSingleWeek(firstWeekNumber, true);

        // Preload next week in background for smooth navigation
        if (sortedWeekNumbers.length > 1) {
          const nextWeekNumber = sortedWeekNumbers[1];
          loadSingleWeek(nextWeekNumber, false).catch(() => {});
        }
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      // Even if API fails, show form with empty state
      setLoading(false);
    }
  };

  // Load a single week and show immediately if it's the first week
  const loadSingleWeek = useCallback(
    async (weekNumber: number, isFirstWeek: boolean = false) => {
      if (!churchId) {return;}

      // Check if already loaded using ref for immediate synchronous check
      if (loadedWeeksRef.current.has(weekNumber)) {
        // Already loaded, just show it if it's the first week
        if (isFirstWeek) {
          const existingData = weekData.get(weekNumber);
          if (existingData) {
            const baseServices = await fetchWorshipServices();
            const mergedSessions = mergeWorshipSessions(
              baseServices,
              existingData.worship_sessions || [],
            );
            if (mergedSessions.length > 0) {
              setWorshipSessions(mergedSessions);
            }
            if (
              mergedSessions.length !==
              (existingData.worship_sessions || []).length
            ) {
              setWeekData(prev =>
                new Map(prev).set(weekNumber, {
                  ...existingData,
                  worship_sessions: mergedSessions,
                }),
              );
            }
          }
          setLoading(false);
        }
        return; // Already loaded, exit early
      }

      // Check if already loading using ref
      if (loadingWeeksRef.current.has(weekNumber)) {
        return; // Already loading, exit early
      }

      // Mark as loading
      loadingWeeksRef.current.add(weekNumber);
      setLoadingWeeks(prev => new Set(prev).add(weekNumber));

      // Only the first week has the error screen; a failed background
      // preload is simply not cached and is re-fetched on switch.
      const showWeekError = (cause: unknown) => {
        if (isFirstWeek) {
          setInitialLoadError(cause);
          setLoading(false);
        }
      };
      let reportLoaded = false;

      try {
        // Check context first
        const contextData = getWeekData(churchId, year, weekNumber);
        if (contextData) {
          // Restore from context
          const baseServices = await fetchWorshipServices();
          const mergedSessions = mergeWorshipSessions(
            baseServices,
            contextData.worshipSessions,
          );
          const restoredData: WeeklyReportData = {
            church_id: churchId,
            year,
            week_number: weekNumber,
            worship_sessions: mergedSessions,
            church_metrics: contextData.churchMetrics,
          };
          setWeekData(prev => {
            if (prev.has(weekNumber)) {return prev;} // Already loaded
            loadedWeeksRef.current.add(weekNumber);
            return new Map(prev).set(weekNumber, restoredData);
          });

          // If this is the first week, show it immediately
          if (isFirstWeek) {
            setWorshipSessions(mergedSessions);
            setLoading(false);
          }
        } else {
          // Load from API
          const data = await getWeeklyReport(churchId, year, weekNumber);
          reportLoaded = true;
          const baseServices = await fetchWorshipServices(false, true);
          const worshipSessionsForWeek = mergeWorshipSessions(
            baseServices,
            data.worship_sessions || [],
          );
          const mergedData = {
            ...data,
            worship_sessions: worshipSessionsForWeek,
          };
          setWeekData(prev => {
            if (prev.has(weekNumber)) {return prev;} // Already loaded
            loadedWeeksRef.current.add(weekNumber);
            return new Map(prev).set(weekNumber, mergedData);
          });

          // If this is the first week, show it immediately
          if (isFirstWeek) {
            if (worshipSessionsForWeek && worshipSessionsForWeek.length > 0) {
              setWorshipSessions(worshipSessionsForWeek);
            }
            setLoading(false);
          }
        }
      } catch (error: any) {
        // Offline / timed out, or the report loaded but its services didn't:
        // the report may well exist, so an empty form would risk overwriting it.
        const cause = error?.cause ?? error;
        const parsed = parseApiError(cause);
        if (reportLoaded || parsed.isNetworkError || parsed.isTimeout) {
          showWeekError(cause);
          return;
        }
        // If report doesn't exist, create empty structure from the church's services
        let worshipSessionsForWeek: WorshipSession[];
        try {
          worshipSessionsForWeek = await fetchWorshipServices(false, true);
        } catch (servicesError) {
          showWeekError(servicesError);
          return;
        }
        const emptyData: WeeklyReportData = {
          church_id: churchId,
          year,
          week_number: weekNumber,
          worship_sessions: worshipSessionsForWeek,
          church_metrics: {} as ChurchMetrics,
        };
        setWeekData(prev => {
          if (prev.has(weekNumber)) {return prev;} // Already loaded
          loadedWeeksRef.current.add(weekNumber);
          return new Map(prev).set(weekNumber, emptyData);
        });

        // If this is the first week, show it immediately
        if (isFirstWeek) {
          if (worshipSessionsForWeek.length > 0) {
            setWorshipSessions(worshipSessionsForWeek);
          }
          setLoading(false);
        }
      } finally {
        loadingWeeksRef.current.delete(weekNumber);
        setLoadingWeeks(prev => {
          const newSet = new Set(prev);
          newSet.delete(weekNumber);
          return newSet;
        });
      }
    },
    [
      churchId,
      year,
      getWeekData,
      fetchWorshipServices,
      mergeWorshipSessions,
      weekData,
    ],
  );

  // Preload next week when user is on current week (for smooth navigation)
  const preloadNextWeek = useCallback(() => {
    if (!churchId) {return;}
    const nextIndex = currentWeekIndex + 1;
    if (nextIndex < sortedWeekNumbers.length) {
      const nextWeekNumber = sortedWeekNumbers[nextIndex];
      // Only preload if not already loaded or loading
      if (
        !weekData.has(nextWeekNumber) &&
        !loadingWeeksRef.current.has(nextWeekNumber)
      ) {
        loadSingleWeek(nextWeekNumber, false).catch(() => {});
      }
    }
  }, [churchId, currentWeekIndex, sortedWeekNumbers, weekData, loadSingleWeek]);

  // Load data for a specific week when switching to it
  const loadWeekData = useCallback(
    async (weekNumber: number) => {
      if (!churchId) {return;}
      // Check if already loaded
      if (weekData.has(weekNumber)) {
        const data = weekData.get(weekNumber);
        if (data) {
          const baseServices = await fetchWorshipServices();
          const mergedSessions = mergeWorshipSessions(
            baseServices,
            data.worship_sessions || [],
          );
          if (mergedSessions.length > 0) {
            setWorshipSessions(mergedSessions);
          }
          if (mergedSessions.length !== (data.worship_sessions || []).length) {
            setWeekData(prev =>
              new Map(prev).set(weekNumber, {
                ...data,
                worship_sessions: mergedSessions,
              }),
            );
          }
        }
        return;
      }

      // Check if already loading to avoid duplicate requests
      if (loadingWeeks.has(weekNumber)) {
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
      setInitialLoadError(null);
      setLoadingWeeks(prev => new Set(prev).add(weekNumber));
      let reportLoaded = false;
      try {
        const data = await getWeeklyReport(churchId, year, weekNumber);
        reportLoaded = true;
        const baseServices = await fetchWorshipServices(false, true);
        const worshipSessionsForWeek = mergeWorshipSessions(
          baseServices,
          data.worship_sessions || [],
        );
        const mergedData = {
          ...data,
          worship_sessions: worshipSessionsForWeek,
        };
        setWeekData(prev => new Map(prev).set(weekNumber, mergedData));
        if (worshipSessionsForWeek && worshipSessionsForWeek.length > 0) {
          setWorshipSessions(worshipSessionsForWeek);
        }
      } catch (error: any) {
        // Offline / timed out, or the report loaded but its services didn't:
        // don't show an incomplete or empty form that could overwrite an
        // existing report; show the retryable error for this week instead.
        const cause = error?.cause ?? error;
        const parsed = parseApiError(cause);
        if (reportLoaded || parsed.isNetworkError || parsed.isTimeout) {
          setInitialLoadError(cause);
          return;
        }
        // If report doesn't exist, create empty structure from the church's services
        let worshipSessionsForWeek: WorshipSession[];
        try {
          worshipSessionsForWeek = await fetchWorshipServices(false, true);
        } catch (servicesError) {
          setInitialLoadError(servicesError);
          return;
        }
        const emptyData: WeeklyReportData = {
          church_id: churchId,
          year,
          week_number: weekNumber,
          worship_sessions: worshipSessionsForWeek,
          church_metrics: {} as ChurchMetrics,
        };
        setWeekData(prev => new Map(prev).set(weekNumber, emptyData));
        if (worshipSessionsForWeek.length > 0) {
          setWorshipSessions(worshipSessionsForWeek);
        }
      } finally {
        setLoadingWeeks(prev => {
          const newSet = new Set(prev);
          newSet.delete(weekNumber);
          return newSet;
        });
      }
    },
    [
      churchId,
      year,
      weekData,
      getWeekData,
      loadingWeeks,
      fetchWorshipServices,
      mergeWorshipSessions,
    ],
  );

  useEffect(() => {
    loadWeekDataRef.current = (weekNumber: number) => {
      loadWeekData(weekNumber).catch(() => {});
    };
  }, [loadWeekData]);

  const updateWorshipSession = useCallback(
    (sessionId: number, field: string, value: string) => {
      if (!churchId) {return;}
      const currentChurchId = churchId; // Store for use in callback
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
        const currentMetrics =
          currentData?.church_metrics || ({} as ChurchMetrics);
        saveWeekDataToContext(
          currentChurchId,
          year,
          currentWeekNumber,
          updated,
          currentMetrics,
        );

        // Clear error when Adults has a value
        setFieldErrors(prev => {
          const newSet = new Set(prev);
          const target = updated.find(session => session.id === sessionId);
          if (target?.attendance.adult_attendance !== null) {
            newSet.delete(getAdultAttendanceFieldKey(sessionId));
          }
          return newSet;
        });

        return updated;
      });
    },
    [churchId, year, currentWeekNumber, currentData, saveWeekDataToContext],
  );

  const calculateTotalAttendance = useCallback(
    (attendance: any): number | null => {
      const adult = attendance.adult_attendance || 0;
      const youth = attendance.youth_attendance || 0;
      const child = attendance.child_attendance || 0;
      const total = adult + youth + child;
      return total > 0 ? total : null;
    },
    [],
  );

  const updateChurchMetrics = useCallback(
    (field: keyof ChurchMetrics, value: string) => {
      if (!churchId) {return;}
      // Parse the input value (remove formatting, only keep digits)
      const numValue = parseNumber(value);
      setWeekData(prev => {
        const currentData = prev.get(currentWeekNumber);
        const currentMetrics =
          currentData?.church_metrics || ({} as ChurchMetrics);
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

        // Save to context
        saveWeekDataToContext(
          churchId,
          year,
          currentWeekNumber,
          worshipSessions,
          updatedMetrics,
        );

        return new Map(prev).set(currentWeekNumber, updatedData);
      });

      // Clear error only when value is set
      if (numValue !== null) {
        setFieldErrors(prev => {
          const newSet = new Set(prev);
          newSet.delete(`church_metrics.${field}`);
          return newSet;
        });
      }
    },
    [churchId, year, currentWeekNumber, worshipSessions, saveWeekDataToContext],
  );

  // Check if a week has all required fields filled
  const checkWeekCompleted = useCallback(
    (weekNum: number, data: WeeklyReportData | undefined): boolean => {
      if (!data) {return false;}
      return hasRequiredAdultAttendance(data.worship_sessions);
    },
    [],
  );

  // Validate current week data
  const validateCurrentWeek = (): {
    isValid: boolean;
    firstErrorField?: string;
  } => {
    const errors = new Set<string>();
    let firstErrorField: string | undefined;

    if (worshipSessions.length === 0) {
      const fieldKey = 'worship_sessions';
      errors.add(fieldKey);
      if (!firstErrorField) {firstErrorField = fieldKey;}
    } else {
      worshipSessions.forEach(session => {
        if (session.attendance.adult_attendance === null) {
          const fieldKey = getAdultAttendanceFieldKey(session.id);
          errors.add(fieldKey);
          if (!firstErrorField) {firstErrorField = fieldKey;}
        }
      });
    }

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
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 100),
                animated: true,
              });
            },
            () => {},
          );
        } catch (error) {
          console.error('Error scrolling to field:', error);
        }
      }
    }, 100);
  };

  const smoothScrollToTop = (duration = 350) => {
    if (!scrollViewRef.current) return;
    if (scrollAnimRef.current) {
      clearInterval(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
    const start = Date.now();
    const startY = scrollYRef.current;
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const y = Math.max(0, startY * (1 - eased));
      scrollViewRef.current?.scrollTo({y, animated: false});
      if (progress < 1) {
        scrollAnimRef.current = setTimeout(step, 16);
      } else {
        scrollAnimRef.current = null;
      }
    };
    scrollAnimRef.current = setTimeout(step, 16);
  };

  const persistCurrentWeekData = useCallback((): WeeklyReportData | null => {
    if (!churchId || !currentWeekNumber) {
      return null;
    }

    const currentMetrics =
      currentData?.church_metrics || ({} as ChurchMetrics);
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
    saveWeekDataToContext(
      churchId,
      year,
      currentWeekNumber,
      worshipSessions,
      currentMetrics,
    );

    return updatedData;
  }, [
    churchId,
    year,
    currentWeekNumber,
    currentData,
    worshipSessions,
    saveWeekDataToContext,
  ]);

  const handleSave = async () => {
    if (!currentWeekNumber || !churchId) {return;}

    setSaving(true);
    try {
      const data = persistCurrentWeekData();
      const metrics = data?.church_metrics || ({} as ChurchMetrics);

      const payload = {
        year,
        week_number: currentWeekNumber,
        worship_sessions: buildWorshipSessionsPayload(worshipSessions),
        church_metrics: buildChurchMetricsPayload(metrics),
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

      setSaveSuccessMessage(
        t('dataSavedSuccessfully') || 'Data saved successfully',
      );
      saveSuccessActionRef.current = null;
      setSaveSuccessVisible(true);
    } catch (error: any) {
      console.error('Error saving data:', error);
      Alert.alert(
        t('error') || 'Error',
        error?.message || t('failedToSaveData') || 'Failed to save data',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!churchId) {return;}
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
      const persistedWeek = persistCurrentWeekData();
      const latestWeekData = new Map(weekData);
      if (persistedWeek) {
        latestWeekData.set(currentWeekNumber, persistedWeek);
      }

      const payloads = sortedWeekNumbers.map(weekNumber => {
        const data = latestWeekData.get(weekNumber);
        const metrics = data?.church_metrics || ({} as ChurchMetrics);
        const sessions =
          weekNumber === currentWeekNumber
            ? worshipSessions
            : data?.worship_sessions || worshipSessions;

        return {
          church_id: churchId,
          year,
          week_number: weekNumber,
          worship_sessions: sessions,
          church_metrics: metrics,
        };
      });

      await batchCreateOrUpdateWeeklyReports(payloads);
      const handleSuccess = () => {
        if (saveOption === 'goToChurch') {
          navigation.navigate('Dashboard');
        } else {
          navigation.navigate('MonthlyDataSelect', { resetKey: Date.now() });
        }
      };
      setSaveSuccessMessage(
        t('allDataSavedSuccessfully') || 'All data saved successfully',
      );
      saveSuccessActionRef.current = handleSuccess;
      setSaveSuccessVisible(true);
    } catch (error: any) {
      console.error('Error saving all data:', error);
      Alert.alert(
        t('error') || 'Error',
        error?.message || t('failedToSaveData') || 'Failed to save data',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNextWeek = () => {
    if (!churchId) {return;}
    if (currentWeekIndex < sortedWeekNumbers.length - 1) {
      // Validate before moving to next week
      const validation = validateCurrentWeek();
      if (!validation.isValid) {
        if (validation.firstErrorField) {
          scrollToField(validation.firstErrorField);
        }
        return;
      }

      // Save current week data before switching
      const updatedData = persistCurrentWeekData();
      if (!updatedData) {
        return;
      }

      // Mark week as completed
      if (checkWeekCompleted(currentWeekNumber, updatedData)) {
        setCompletedWeeks(prev => new Set(prev).add(currentWeekNumber));
      }

      // Switch to next week
      const nextIndex = currentWeekIndex + 1;
      setCurrentWeekIndex(nextIndex);
      const nextWeekNumber = sortedWeekNumbers[nextIndex];
      smoothScrollToTop(1500);

      // Load next week data (should be preloaded, but load if not)
      if (!weekData.has(nextWeekNumber)) {
        loadWeekData(nextWeekNumber);
      } else {
        // Data already loaded, just update UI
        const nextData = weekData.get(nextWeekNumber);
        if (nextData?.worship_sessions) {
          setWorshipSessions(nextData.worship_sessions);
        }
      }

      // Preload week after next for smooth navigation
      if (nextIndex + 1 < sortedWeekNumbers.length) {
        const weekAfterNext = sortedWeekNumbers[nextIndex + 1];
        if (
          !weekData.has(weekAfterNext) &&
          !loadingWeeksRef.current.has(weekAfterNext)
        ) {
          loadSingleWeek(weekAfterNext, false).catch(() => {});
        }
      }

      setFieldErrors(new Set()); // Clear errors when switching weeks
    }
  };

  const handleBackWeek = () => {
    if (!churchId) {return;}
    if (currentWeekIndex > 0) {
      // Save current week data before switching
      const updatedData = persistCurrentWeekData();
      if (!updatedData) {
        return;
      }

      // Switch to previous week
      const prevIndex = currentWeekIndex - 1;
      setCurrentWeekIndex(prevIndex);
      const prevWeekNumber = sortedWeekNumbers[prevIndex];
      loadWeekData(prevWeekNumber);
      smoothScrollToTop(1500);
    }
  };

  // Check if current week is completed based on current form state
  const isCurrentWeekCompleted = useCallback(() => {
    return hasRequiredAdultAttendance(worshipSessions);
  }, [worshipSessions]);

  // Update worship sessions when switching weeks
  useEffect(() => {
    if (!churchId) {return;}
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
    setFieldErrors(new Set()); // Clear errors when switching weeks

    // Preload next week for smooth navigation
    preloadNextWeek();
  }, [
    currentWeekNumber,
    currentData,
    checkWeekCompleted,
    churchId,
    year,
    getWeekData,
    preloadNextWeek,
  ]);

  // Skeleton loading component
  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonHeader, {backgroundColor: C.surface}]} />
      <View style={styles.skeletonWeekNav}>
        {[1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[styles.skeletonWeekButton, {backgroundColor: C.surface}]}
          />
        ))}
      </View>
      {worshipSessions.length > 0 ? (
        worshipSessions.map((session, idx) => (
          <View key={session.id || idx} style={styles.skeletonSection}>
            <View
              style={[styles.skeletonTitle, {backgroundColor: C.surface}]}
            />
            {[1, 2, 3, 4, 5].map(i => (
              <View key={i} style={styles.skeletonField}>
                <View
                  style={[styles.skeletonLabel, {backgroundColor: C.surface}]}
                />
                <View
                  style={[styles.skeletonInput, {backgroundColor: C.surface}]}
                />
              </View>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.skeletonSection}>
          <View style={[styles.skeletonTitle, {backgroundColor: C.surface}]} />
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={styles.skeletonField}>
              <View
                style={[styles.skeletonLabel, {backgroundColor: C.surface}]}
              />
              <View
                style={[styles.skeletonInput, {backgroundColor: C.surface}]}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (!churchId || !year || sortedWeekNumbers.length === 0) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, {color: C.textSecondary}]}>
            {t('noWeeksAvailable') || 'No weeks available for this month'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show skeleton while loading initial data, but show form structure if worship sessions are loaded
  const showSkeleton = loading && worshipSessions.length === 0;

  const currentMetrics = currentData?.church_metrics || ({} as ChurchMetrics);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={[styles.container, {backgroundColor: C.background}]}
        // No extra offset: the KAV already starts at the top safe area, so the
        // old 64pt left a gap above the keyboard. Android uses adjustResize.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerWrapper}>
          <Header
            title={t('addMonthlyData') || 'Add Monthly Data'}
            showMenu={false}
            onBackPress={() => navigation.navigate('MonthlyDataSelect')}
          />
        </View>

        {initialLoadError ? (
          <ApiErrorState
            error={initialLoadError}
            onRetry={() =>
              currentWeekNumber === sortedWeekNumbers[0]
                ? loadInitialData()
                : loadWeekData(currentWeekNumber)
            }
          />
        ) : showSkeleton ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}

            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={false}
            contentInsetAdjustmentBehavior="never">
            {renderSkeletonLoader()}
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}

            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={false}
            contentInsetAdjustmentBehavior="never"
            onScroll={event => {
              scrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}>
            {/* Church Name and Week Info */}
            <View style={styles.infoContainer}>
              <Text style={[styles.infoLabel, {color: C.textPrimary}]}>
                {t('enterDataFor') || 'Enter data for'}:
              </Text>
              <Text
                style={[styles.churchNameStrong, {color: C.textPrimary}]}
                numberOfLines={2}>
                {displayChurchName}
              </Text>
              <Text style={styles.lastRecordDate} numberOfLines={1}>
                {`${t('lastMonthlyRecord') || 'Last monthly record'}: `}
                <Text style={styles.lastRecordDateValue}>
                  {formatLastRecord(lastReportDate || '')}
                </Text>
              </Text>
              <Text style={[styles.weekInfo, {color: C.textPrimary}]}>
                {currentWeekNumber
                  ? ` (${getIsoWeekDateRangeLabel(year, currentWeekNumber)} ${getIsoWeekDisplayYear(
                      year,
                      currentWeekNumber,
                    )})`
                  : ''}
              </Text>
            </View>

            {/* Week Navigation */}
            {sortedWeekNumbers.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weekNavContainer}
                style={styles.weekNavScrollView}>
                {sortedWeekNumbers.map((weekNum, index) => {
                  const weekDataForCheck = weekData.get(weekNum);
                  const isLoading = loadingWeeks.has(weekNum);
                  const isCompleted =
                    completedWeeks.has(weekNum) ||
                    checkWeekCompleted(weekNum, weekDataForCheck);
                  const isCurrent = index === currentWeekIndex;
                  const canRemoveWeek = sortedWeekNumbers.length > 1;

                  // Can access if:
                  // 1. It's the first week (index 0)
                  // 2. It's the current week
                  // 3. Previous week is completed AND this week's data is loaded
                  const canAccess =
                    index === 0 ||
                    isCurrent ||
                    (index > 0 &&
                      (completedWeeks.has(sortedWeekNumbers[index - 1]) ||
                        checkWeekCompleted(
                          sortedWeekNumbers[index - 1],
                          weekData.get(sortedWeekNumbers[index - 1]),
                        )) &&
                      !isLoading &&
                      weekData.has(weekNum));

                  const containerStyle = [
                    styles.weekNavButton,
                    {
                      backgroundColor: isCurrent
                        ? COLORS.mainColor
                        : isCompleted
                        ? COLORS.successColor
                        : C.surface,
                      borderColor: isCurrent
                        ? COLORS.mainColor
                        : isCompleted
                        ? COLORS.successColor
                        : C.border,
                      opacity: canAccess ? 1 : 0.5,
                    },
                  ];

                  return (
                    <View key={weekNum} style={containerStyle}>
                      {canRemoveWeek ? (
                        <TouchableOpacity
                          style={[
                            styles.weekNavRemoveButton,
                            {
                              borderColor: COLORS.dangerColor,
                            },
                          ]}
                          hitSlop={{top: 6, right: 6, bottom: 6, left: 6}}
                          activeOpacity={0.7}
                          onPress={() => removeSelectedWeek(weekNum)}>
                          <Text
                            style={[
                              styles.weekNavRemoveText,
                              {color: COLORS.white},
                            ]}>
                            ×
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.weekNavPressArea}
                        disabled={!canAccess}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (!churchId) {
                            return;
                          }
                          if (!canAccess) {
                            if (isLoading) {
                              Alert.alert(
                                t('error') || 'Error',
                                t('loading') || 'Week data is still loading',
                              );
                            } else {
                              Alert.alert(
                                t('error') || 'Error',
                                t('pleaseCompletePreviousWeeks') ||
                                  'Please complete previous weeks first',
                              );
                            }
                            return;
                          }
                          // Save current week before switching
                          const currentMetrics =
                            currentData?.church_metrics || ({} as ChurchMetrics);
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
                          setWeekData(prev =>
                            new Map(prev).set(currentWeekNumber, updatedData),
                          );

                          // Save to context
                          saveWeekDataToContext(
                            churchId,
                            year,
                            currentWeekNumber,
                            worshipSessions,
                            currentMetrics,
                          );

                          // Switch week
                          setCurrentWeekIndex(index);
                          loadWeekData(weekNum);
                        }}>
                        <Text
                          style={[
                            styles.weekNavDateText,
                            {
                              color:
                                isCurrent || isCompleted ? '#fff' : C.textPrimary,
                            },
                          ]}>
                          {getIsoWeekDateRangeLabel(year, weekNum)}
                        </Text>
                        <View style={styles.weekNavYearRow}>
                          <Text
                            style={[
                              styles.weekNavYearText,
                              {
                                color:
                                  isCurrent || isCompleted
                                    ? '#fff'
                                    : C.textPrimary,
                              },
                            ]}>
                            {getIsoWeekDisplayYear(year, weekNum)}
                          </Text>
                          {isCompleted && !isCurrent && (
                            <Text style={styles.weekNavCheckmarkInline}>✓</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.layoutToggleRow}>
              <Text style={[styles.layoutToggleHint, {color: COLORS.mainColor}]}>
                {t('monthlyDataEntryLayout') || 'Layout'}
              </Text>
              <MonthlyDataEntryLayoutToggle
                value={columnLayout}
                onChange={setColumnLayoutPreference}
              />
            </View>

            {/* Main Worship Service Attendance */}
            <View style={styles.section}>
              {loading && worshipSessions.length === 0 ? (
                <View style={styles.skeletonSection}>
                  <View
                    style={[styles.skeletonTitle, {backgroundColor: C.surface}]}
                  />
                  {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={styles.skeletonField}>
                      <View
                        style={[
                          styles.skeletonLabel,
                          {backgroundColor: C.surface},
                        ]}
                      />
                      <View
                        style={[
                          styles.skeletonInput,
                          {backgroundColor: C.surface},
                        ]}
                      />
                    </View>
                  ))}
                </View>
              ) : worshipSessions.length > 0 ? (
                worshipSessions.map((session, index) => {
                  const attendanceError = fieldErrors.has(
                    getAdultAttendanceFieldKey(session.id),
                  );
                  return (
                    <View
                      key={session.id}
                      style={[
                        styles.sessionContainer,
                        index < worshipSessions.length - 1 &&
                          styles.sessionContainerDivider,
                      ]}
                      ref={ref => {
                        if (ref)
                          {fieldRefs.current.set(
                            `worship_session_${session.id}`,
                            ref,
                          );}
                      }}>
                      <Text
                        style={[styles.sessionName, {color: C.textPrimary}]}>
                        {index + 1}.{' '}
                        {t('mainWorshipServiceAttendance') ||
                          'Main Worship Service Attendance'}
                        : {session.name} ({session.day_name}{' '}
                        {session.time?.substring(0, 5)})
                      </Text>

                      <MonthlyDataFieldPair
                        layout={columnLayout}
                        fieldRefs={fieldRefs}
                        leftRefKey={`worship_session_${session.id}_attendance`}
                        left={{
                          label: renderRowLabel(t('adults') || 'Adults', true),
                          input: (
                            <MonthlyDataInput
                              value={formatNumber(
                                session.attendance.adult_attendance,
                              )}
                              onChangeText={value => {
                                updateWorshipSession(
                                  session.id,
                                  'adult_attendance',
                                  value,
                                );
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                              error={
                                attendanceError &&
                                session.attendance.adult_attendance === null
                              }
                            />
                          ),
                        }}
                        right={{
                          label: renderRowLabel(t('youth') || 'Youth [13-22]'),
                          input: (
                            <MonthlyDataInput
                              value={formatNumber(
                                session.attendance.youth_attendance,
                              )}
                              onChangeText={value =>
                                updateWorshipSession(
                                  session.id,
                                  'youth_attendance',
                                  value,
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          ),
                        }}
                      />

                      <MonthlyDataFieldPair
                        layout={columnLayout}
                        fieldRefs={fieldRefs}
                        left={{
                          label: renderRowLabel(
                            t('children') || 'Children [0-12]',
                          ),
                          input: (
                            <MonthlyDataInput
                              value={formatNumber(
                                session.attendance.child_attendance,
                              )}
                              onChangeText={value =>
                                updateWorshipSession(
                                  session.id,
                                  'child_attendance',
                                  value,
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          ),
                        }}
                        right={{
                          label: renderRowLabel(
                            t('numberOfServicesForChildren') ||
                              'Number of Services for Children',
                          ),
                          input: (
                            <MonthlyDataInput
                              value={formatNumber(
                                session.attendance
                                  .number_of_service_for_children,
                              )}
                              onChangeText={value =>
                                updateWorshipSession(
                                  session.id,
                                  'number_of_service_for_children',
                                  value,
                                )
                              }
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          ),
                        }}
                      />

                      {renderFormField(
                        columnLayout,
                        renderRowLabel(
                          t('totalAttendance') || 'Total Attendance',
                        ),
                        <MonthlyDataInput
                          value={formatNumber(
                            session.attendance.total_attendance,
                          )}
                          keyboardType="numeric"
                          editable={false}
                          containerStyle={{backgroundColor: C.bgSelectedOption}}
                        />,
                        fieldRefs,
                      )}
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

              <MonthlyDataFieldPair
                layout={columnLayout}
                fieldRefs={fieldRefs}
                leftRefKey="church_metrics.number_of_cell_groups"
                rightRefKey="church_metrics.cell_group_weekly_attendance"
                left={{
                  label: renderRowLabel(
                    t('numberOfCellGroups') || 'Number of Cell Groups',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(currentMetrics.number_of_cell_groups)}
                      onChangeText={value =>
                        updateChurchMetrics('number_of_cell_groups', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.number_of_cell_groups',
                      )}
                    />
                  ),
                }}
                right={{
                  label: renderRowLabel(
                    t('totalAttendanceInAll') || 'Total Attendance in All',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.cell_group_weekly_attendance,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics(
                          'cell_group_weekly_attendance',
                          value,
                        )
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.cell_group_weekly_attendance',
                      )}
                    />
                  ),
                }}
              />
            </View>

            {/* Prayer Meetings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {worshipSessions.length + 2}.{' '}
                {t('prayerMeetings') || 'Prayer Meetings'}
              </Text>

              <MonthlyDataFieldPair
                layout={columnLayout}
                fieldRefs={fieldRefs}
                leftRefKey="church_metrics.number_of_prayer_meetings"
                rightRefKey="church_metrics.prayer_meeting_weekly_attendance"
                left={{
                  label: renderRowLabel(
                    t('numberOfPrayerMeetings') || 'Number of Prayer Meetings',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.number_of_prayer_meetings,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics('number_of_prayer_meetings', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.number_of_prayer_meetings',
                      )}
                    />
                  ),
                }}
                right={{
                  label: renderRowLabel(
                    t('totalAttendanceInAll') || 'Total Attendance in All',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.prayer_meeting_weekly_attendance,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics(
                          'prayer_meeting_weekly_attendance',
                          value,
                        )
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.prayer_meeting_weekly_attendance',
                      )}
                    />
                  ),
                }}
              />
            </View>

            {/* Decisions, Discipling & Water Baptisms */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {worshipSessions.length + 3}.{' '}
                {t('decisionsDisciplingWaterBaptisms') ||
                  'Decisions, Discipling & Water Baptisms'}
              </Text>

              <MonthlyDataFieldPair
                layout={columnLayout}
                fieldRefs={fieldRefs}
                leftRefKey="church_metrics.weekly_decisions_made"
                rightRefKey="church_metrics.being_actively_discipled"
                left={{
                  label: (
                    <View
                      style={[
                        styles.labelWithHelpRow,
                        columnLayout === 'single' &&
                          styles.labelWithHelpRowInline,
                      ]}>
                      <View style={styles.labelWithHelpTextWrap}>
                        {renderRowLabel(
                          t('numberOfNewDecisions') ||
                            'Number of New Decisions',
                        )}
                      </View>
                      <HelpIcon
                        title={
                          t('numberOfNewDecisions') ||
                          'Number of New Decisions'
                        }
                        message={
                          t('helpNumberOfNewDecisions') ||
                          'Number of people who gave their lives to Christ in that week'
                        }
                        offsetY={0}
                        marginLeft={4}
                        size={16}
                        containerStyle={styles.helpIconInline}
                      />
                    </View>
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.weekly_decisions_made,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics('weekly_decisions_made', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.weekly_decisions_made',
                      )}
                    />
                  ),
                }}
                right={{
                  label: renderRowLabel(
                    t('numberBeingActivelyDiscipled') ||
                      'Number being Actively Discipled',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.being_actively_discipled,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics('being_actively_discipled', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.being_actively_discipled',
                      )}
                    />
                  ),
                }}
              />

              {renderFormField(
                columnLayout,
                renderRowLabel(
                  t('numberOfWaterBaptised') || 'Number of Water Baptised',
                ),
                <MonthlyDataInput
                  value={formatNumber(currentMetrics.weekly_water_baptism)}
                  onChangeText={value =>
                    updateChurchMetrics('weekly_water_baptism', value)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  error={fieldErrors.has('church_metrics.weekly_water_baptism')}
                />,
                fieldRefs,
                'church_metrics.weekly_water_baptism',
              )}

              {renderFormField(
                columnLayout,
                renderRowLabel(
                  t('numberInEncounterNextStepWeekend') ||
                    'Number in an Encounter / Next Step Weekend',
                ),
                <MonthlyDataInput
                  value={formatNumber(currentMetrics.number_in_an_encounter)}
                  onChangeText={value =>
                    updateChurchMetrics('number_in_an_encounter', value)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  error={fieldErrors.has(
                    'church_metrics.number_in_an_encounter',
                  )}
                />,
                fieldRefs,
                'church_metrics.number_in_an_encounter',
              )}
            </View>

            {/* Teaching & Training */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {worshipSessions.length + 4}.{' '}
                {t('teachingTraining') || 'Teaching & Training'}
              </Text>

              <MonthlyDataFieldPair
                layout={columnLayout}
                fieldRefs={fieldRefs}
                leftRefKey="church_metrics.number_of_liw_classes"
                rightRefKey="church_metrics.liw_total_students"
                left={{
                  label: renderRowLabel(
                    t('numberOfGtLiwClasses') || 'Number of GT/LIW Classes',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(currentMetrics.number_of_liw_classes)}
                      onChangeText={value =>
                        updateChurchMetrics('number_of_liw_classes', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.number_of_liw_classes',
                      )}
                    />
                  ),
                }}
                right={{
                  label: renderRowLabel(
                    t('totalAttendanceInAllGtLiwClasses') ||
                      'Total Attendance in all GT/LIW Classes',
                  ),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(currentMetrics.liw_total_students)}
                      onChangeText={value =>
                        updateChurchMetrics('liw_total_students', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.liw_total_students',
                      )}
                    />
                  ),
                }}
              />

              {renderFormField(
                columnLayout,
                renderRowLabel(
                  t('noOfLeadersInTrainingForPastoralOrChurchPlantingDuties') ||
                    'No of Leaders in training for Pastoral or Church Planting duties',
                ),
                <MonthlyDataInput
                  value={formatNumber(
                    currentMetrics.number_of_leaders_in_training_for_cpm,
                  )}
                  onChangeText={value =>
                    updateChurchMetrics(
                      'number_of_leaders_in_training_for_cpm',
                      value,
                    )
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  error={fieldErrors.has(
                    'church_metrics.number_of_leaders_in_training_for_cpm',
                  )}
                />,
                fieldRefs,
                'church_metrics.number_of_leaders_in_training_for_cpm',
              )}
            </View>

            {/* Giving */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                {worshipSessions.length + 5}. {t('giving') || 'Giving'}
              </Text>

              <MonthlyDataFieldPair
                layout={columnLayout}
                fieldRefs={fieldRefs}
                leftRefKey="church_metrics.giving_in_local_currency"
                rightRefKey="church_metrics.mfp_in_local_currency"
                left={{
                  label: renderRowLabel(tithesOfferingsLabel),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.giving_in_local_currency,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics('giving_in_local_currency', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.giving_in_local_currency',
                      )}
                    />
                  ),
                }}
                right={{
                  label: renderRowLabel(missionsGivingMfpLabel),
                  input: (
                    <MonthlyDataInput
                      value={formatNumber(
                        currentMetrics.mfp_in_local_currency,
                      )}
                      onChangeText={value =>
                        updateChurchMetrics('mfp_in_local_currency', value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      error={fieldErrors.has(
                        'church_metrics.mfp_in_local_currency',
                      )}
                    />
                  ),
                }}
              />
            </View>

            {currentWeekIndex === sortedWeekNumbers.length - 1 && (
              <View style={styles.saveOptionsContainer}>
                <TouchableOpacity
                  style={styles.saveOptionRow}
                  onPress={() => setSaveOption('continue')}
                  activeOpacity={0.7}>
                  <View style={styles.radioOuter}>
                    {saveOption === 'continue' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={[styles.saveOptionText, {color: C.textPrimary}]}>
                    {t('saveAndContinueEntering') ||
                      'Save and continue entering'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveOptionRow}
                  onPress={() => setSaveOption('goToChurch')}
                  activeOpacity={0.7}>
                  <View style={styles.radioOuter}>
                    {saveOption === 'goToChurch' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={[styles.saveOptionText, {color: C.textPrimary}]}>
                    {t('saveAndGoToChurch') || 'Save and go to church'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              <SaveButton
                label={t('back') || 'Back'}
                onPress={handleBackWeek}
                disabled={currentWeekIndex === 0 || saving}
                style={styles.navButton}
              />
              <SaveButton
                label={
                  currentWeekIndex < sortedWeekNumbers.length - 1
                    ? t('next') || 'Next'
                    : t('save') || 'Save'
                }
                onPress={
                  currentWeekIndex < sortedWeekNumbers.length - 1
                    ? handleNextWeek
                    : handleSaveAll
                }
                disabled={saving}
                style={[
                  styles.navButton,
                  currentWeekIndex === sortedWeekNumbers.length - 1
                    ? {backgroundColor: '#5CB85C', borderColor: '#5CB85C'}
                    : null,
                ]}
              />
            </View>
          </ScrollView>
        )}
        <Modal
          visible={saveSuccessVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSaveSuccessVisible(false)}
        >
          <View style={styles.successBackdrop}>
            <View style={[styles.successCard, {backgroundColor: C.surface}]}>
              <Text style={[styles.successTitle, {color: C.textPrimary}]}>
                {t('success') || 'Success'}
              </Text>
              <Text style={[styles.successMessage, {color: C.textSecondary}]}>
                {saveSuccessMessage}
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  setSaveSuccessVisible(false);
                  const action = saveSuccessActionRef.current;
                  saveSuccessActionRef.current = null;
                  if (action) action();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successButtonText}>
                  {t('ok') || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    paddingTop: ms(10),
    paddingBottom: ms(28),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ms(16),
    fontSize: fs(15),
  },
  headerWrapper: {
    paddingHorizontal: ms(16),
  },
  infoContainer: {
    borderRadius: rs(8),
    marginBottom: ms(10),
  },
  infoLabel: {
    fontSize: fs(13),
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: ms(2),
  },
  layoutToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ms(8),
  },
  layoutToggleHint: {
    fontSize: fs(13),
    fontWeight: '500',
  },
  churchNameStrong: {
    fontSize: fs(13),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: ms(6),
  },
  lastRecordDate: {
    fontSize: fs(13),
    color: COLORS.mainColor,
    textAlign: 'center',
    fontWeight: '600',
    flexShrink: 1,
  },
  lastRecordDateValue: {
    fontSize: fs(13),
    color: COLORS.mainColor,
    fontWeight: '700',
  },
  weekInfo: {
    fontSize: fs(13),
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: ms(6),
  },
  weekNavScrollView: {
    marginBottom: ms(6),
  },
  weekNavContainer: {
    flexDirection: 'row',
    gap: ms(8),
    paddingHorizontal: ms(4),
    // Give room for the floating close badge (so it isn't clipped by the scroll view)
    paddingTop: ms(8),
  },
  weekNavButton: {
    borderRadius: rs(3),
    borderWidth: 1,
    minWidth: ws(88),
    marginBottom: ms(10),
    position: 'relative',
    overflow: 'visible',
  },
  weekNavPressArea: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavRemoveButton: {
    position: 'absolute',
    // Float half outside the tab (badge style)
    top: -ms(4),
    right: -ms(7),
    width: ms(16),
    height: ms(16),
    borderRadius: rs(8),
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
    backgroundColor: COLORS.dangerColor,
  },
  weekNavRemoveText: {
    fontSize: fs(12),
    lineHeight: fs(14),
    fontWeight: '600',
    includeFontPadding: false,
  },
  weekNavDateText: {
    fontSize: fs(12),
    fontWeight: '400',
    textAlign: 'center',
  },
  weekNavYearText: {
    fontSize: fs(12),
    fontWeight: '400',
    textAlign: 'center',
  },
  weekNavYearRow: {
    marginTop: ms(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
  },
  weekNavCheckmarkInline: {
    fontSize: fs(14),
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: rs(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: ms(12),
    paddingBottom: ms(12),
  },
  sectionTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    marginBottom: ms(12),
  },
  sessionContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  sessionContainerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: ms(12),
  },
  sessionName: {
    fontSize: fs(15),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  fieldRow: {
    flexDirection: 'row',
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: ms(12),
    alignItems: 'flex-end',
  },
  fieldHalf: {
    width: MONTHLY_DATA_ENTRY_DOUBLE_FIELD_WIDTH,
    maxWidth: MONTHLY_DATA_ENTRY_DOUBLE_FIELD_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
  },
  fieldHalfLeft: {
    paddingRight: ms(6),
  },
  fieldHalfRight: {
    paddingLeft: ms(6),
  },
  fieldContainerDouble: {
    width: '100%',
    maxWidth: '100%',
  },
  fieldDoubleInputInner: {
    width: '100%',
    alignSelf: 'stretch',
  },
  rowLabelWrapper: {
    minHeight: fs(13) * 2,
    justifyContent: 'flex-end',
    minWidth: 0,
    width: '100%',
  },
  rowLabelWrapperDouble: {
    width: '100%',
  },

  rowLabel: {
    fontSize: fs(12),
    lineHeight: fs(16),
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingBlock: ms(5),
    flexShrink: 1,
  },
  rowLabelInline: {
    width: '100%',
  },
  fieldContainer: {
    marginBottom: ms(12),
    width: '100%',
    alignSelf: 'stretch',
  },
  fieldContainerRow: {
    marginBottom: 0,
  },
  fieldInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
  },
  fieldInlineLabel: {
    width: MONTHLY_DATA_ENTRY_SINGLE_LABEL_WIDTH,
    maxWidth: MONTHLY_DATA_ENTRY_SINGLE_LABEL_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    paddingRight: ms(8),
    overflow: 'hidden',
  },
  fieldInlineInput: {
    width: MONTHLY_DATA_ENTRY_SINGLE_INPUT_WIDTH,
    maxWidth: MONTHLY_DATA_ENTRY_SINGLE_INPUT_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
  },
  fieldInlineInputInner: {
    width: '100%',
    alignSelf: 'stretch',
  },
  rowLabelWrapperInline: {
    width: '100%',
    minHeight: undefined,
    flex: 0,
    flexGrow: 0,
    flexShrink: 1,
    justifyContent: 'center',
    paddingBlock: 0,
  },
  labelWithHelpTextWrap: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  labelWithHelpRowInline: {
    marginBottom: 0,
    alignItems: 'center',
    flexWrap: 'nowrap',
    width: '100%',
    columnGap: ms(2),
  },
  labelWithHelp: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: ms(4),
  },
  labelWithHelpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ms(4),
    columnGap: ms(6),
    width: '100%',
    overflow: 'hidden',
    flexWrap: 'wrap',
  },
  helpIconInline: {
    marginLeft: 0,
    marginTop: 0,
    flexShrink: 0,
    alignSelf: 'center',
  },
  helpIcon: {
    fontSize: fs(17),
    marginLeft: ms(4),
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: ms(20),
    fontSize: fs(15),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: ms(8),
    marginBottom: ms(16),
    gap: ms(12),
  },
  saveOptionsContainer: {
    marginBottom: ms(12),
    marginTop: ms(4),
  },
  saveOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(6),
  },
  radioOuter: {
    width: ws(20),
    height: ws(20),
    borderRadius: ws(10),
    borderWidth: 2,
    borderColor: COLORS.mainColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10),
  },
  radioInner: {
    width: ws(10),
    height: ws(10),
    borderRadius: ws(5),
    backgroundColor: COLORS.mainColor,
  },
  saveOptionText: {
    fontSize: fs(15),
    fontWeight: '500',
  },
  navButton: {
    flex: 1,
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(24),
  },
  successCard: {
    width: '100%',
    borderRadius: rs(8),
    padding: ms(16),
  },
  successTitle: {
    fontSize: fs(17),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: ms(8),
  },
  successMessage: {
    fontSize: fs(15),
    textAlign: 'center',
    marginBottom: ms(16),
  },
  successButton: {
    height: ms(36),
    minWidth: ws(96),
    alignSelf: 'center',
    paddingHorizontal: ms(16),
    borderRadius: rs(6),
    backgroundColor: '#5CB85C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    fontSize: fs(13),
    fontWeight: '600',
    color: '#fff',
  },
  requiredMark: {
    color: '#db2d2d',
    fontSize: fs(14),
  },
  skeletonContainer: {
    padding: ms(16),
  },
  skeletonHeader: {
    height: ms(40),
    borderRadius: rs(8),
    marginBottom: ms(16),
  },
  skeletonWeekNav: {
    flexDirection: 'row',
    gap: ms(8),
    marginBottom: ms(16),
  },
  skeletonWeekButton: {
    width: ws(100),
    height: ms(60),
    borderRadius: rs(3),
  },
  skeletonSection: {
    marginBottom: ms(24),
  },
  skeletonTitle: {
    height: ms(20),
    width: '60%',
    borderRadius: rs(4),
    marginBottom: ms(16),
  },
  skeletonField: {
    marginBottom: ms(16),
  },
  skeletonLabel: {
    height: ms(14),
    width: '40%',
    borderRadius: rs(4),
    marginBottom: ms(8),
  },
  skeletonInput: {
    height: ms(48),
    borderRadius: rs(8),
  },
});
