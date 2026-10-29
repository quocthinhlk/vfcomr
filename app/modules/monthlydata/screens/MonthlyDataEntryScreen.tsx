import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
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
  batchCreateOrUpdateWeeklyReports,
} from '../services/monthlydata.service';
import {
  applyMetricEdit,
  applySessionEdit,
  AttendanceField,
  buildBatchPayloads,
  emptyWeek,
  formatNumber,
  hasRequiredAdultAttendance,
  mergeWorshipSessions,
  parseNumber,
} from '../utils/monthlyData.utils';
import {parseYmd} from '../../church/utils/churchForm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SaveButton} from '../../../shared/components/ActionButtons';
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

/**
 * Long amounts ("1,234,567,890" VND) don't fit the narrow input at the normal
 * size and lost their first digits on screen, so the text shrinks with length.
 */
const inputFontSize = (value: unknown) => {
  const length = typeof value === 'string' ? value.length : 0;
  if (length > 13) {
    return fs(11);
  }
  if (length > 11) {
    return fs(12);
  }
  if (length > 9) {
    return fs(13);
  }
  return MONTHLY_DATA_INPUT_FONT_SIZE;
};

const MonthlyDataInput = ({style, ...props}: AppInputProps) => (
  <AppInput
    {...props}
    style={[{fontSize: inputFontSize(props.value)}, style]}
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

const getAdultAttendanceFieldKey = (sessionId: number) =>
  `worship_session_${sessionId}_attendance`;

const EMPTY_WEEKS: number[] = [];

/** `GET worship services` → empty sessions in service order. */
function toEmptySessions(listResponse: any): WorshipSession[] {
  const services = Array.isArray(listResponse?.data)
    ? listResponse.data
    : Array.isArray(listResponse?.data?.data)
      ? listResponse.data.data
      : [];
  return services.map((service: any) => ({
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
}

export default function MonthlyDataEntryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const {selectedLanguage} = useLanguage();
  const C = useThemedColors();
  // Unsaved edits of a week survive leaving this screen (restored next time
  // the same church / year / week is opened) until they are saved.
  const {
    getWeekData: getDraft,
    setWeekData: saveDraft,
    removeWeekData: removeDraft,
  } = useMonthlyData();

  const params = (route.params ?? {}) as Partial<RouteParams>;
  const routeChurchId = params.churchId ?? null;
  const churchName = params.churchName ?? '';
  const year = typeof params.year === 'number' ? params.year : 0;
  const routeWeekNumbers = params.weekNumbers;
  const weekNumbers = useMemo(
    () => (Array.isArray(routeWeekNumbers) ? routeWeekNumbers : EMPTY_WEEKS),
    [routeWeekNumbers],
  );

  const [selectedWeekNumbers, setSelectedWeekNumbers] = useState<number[]>(weekNumbers);
  const [churchId, setChurchId] = useState<number | null>(routeChurchId || null);
  const [displayChurchName, setDisplayChurchName] = useState<string>(churchName || '');
  const [lastReportDate, setLastReportDate] = useState<string>('');
  /** From `GET /churches/:id` → `data.currency_name` (for giving field labels). */
  const [churchCurrencyName, setChurchCurrencyName] = useState<string>('');
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  /**
   * The single source of every week's form: the server report, a restored
   * draft, or an empty form for a week without a report, plus the user's
   * edits. The form on screen is always `weekData.get(currentWeekNumber)`.
   */
  const [weekData, setWeekData] = useState<Map<number, WeeklyReportData>>(new Map());
  const [loadingWeeks, setLoadingWeeks] = useState<Set<number>>(new Set());
  /** Weeks that could not be loaded (offline, server error): never shown as an empty, saveable form. */
  const [weekErrors, setWeekErrors] = useState<Map<number, unknown>>(new Map());
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveOption, setSaveOption] = useState<'continue' | 'goToChurch'>('continue');
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const saveSuccessActionRef = useRef<(() => void) | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToFieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollYRef = useRef(0);
  const fieldRefs = useRef<Map<string, any>>(new Map());
  const {columnLayout, setColumnLayout: setColumnLayoutPreference} =
    useMonthlyDataEntryColumnLayout();

  const sortedWeekNumbers = useMemo(
    () => [...selectedWeekNumbers].sort((a, b) => a - b),
    [selectedWeekNumbers],
  );
  const currentWeekNumber =
    sortedWeekNumbers[currentWeekIndex] ?? sortedWeekNumbers[0] ?? 0;
  const currentData = weekData.get(currentWeekNumber);
  const worshipSessions = useMemo(
    () => currentData?.worship_sessions ?? [],
    [currentData],
  );
  const currentWeekError = currentData ? null : weekErrors.get(currentWeekNumber) ?? null;
  /** The current week is still being fetched (its form is not shown yet). */
  const loading = !currentData && !currentWeekError;

  // Latest values for async loaders and the unmount cleanup.
  const aliveRef = useRef(true);
  const weekDataRef = useRef(weekData);
  weekDataRef.current = weekData;
  const currentWeekRef = useRef(currentWeekNumber);
  currentWeekRef.current = currentWeekNumber;
  const churchIdRef = useRef(churchId);
  churchIdRef.current = churchId;
  const getDraftRef = useRef(getDraft);
  getDraftRef.current = getDraft;
  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;
  /** Weeks edited since they were loaded / saved. */
  const dirtyWeeksRef = useRef<Set<number>>(new Set());
  const loadingRef = useRef<Set<number>>(new Set());
  const servicesRef = useRef<{churchId: number; promise: Promise<WorshipSession[]>} | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    // Same Set for the screen's lifetime (only its contents change).
    const dirtyWeeks = dirtyWeeksRef.current;
    return () => {
      aliveRef.current = false;
      if (scrollAnimRef.current) {
        clearTimeout(scrollAnimRef.current);
      }
      if (scrollToFieldTimerRef.current) {
        clearTimeout(scrollToFieldTimerRef.current);
      }
      // Keep unsaved edits for the next visit.
      const cid = churchIdRef.current;
      if (cid) {
        dirtyWeeks.forEach(weekNumber => {
          const week = weekDataRef.current.get(weekNumber);
          if (week) {
            saveDraftRef.current(cid, year, weekNumber, week.worship_sessions, week.church_metrics);
          }
        });
      }
    };
  }, [year]);

  useEffect(() => {
    setSelectedWeekNumbers(weekNumbers);
    setCurrentWeekIndex(0);
  }, [weekNumbers]);

  // Resolve church_id (prefer route param for correctness and speed)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (routeChurchId) {
          setChurchId(routeChurchId);
          await AsyncStorage.setItem('selectedChurchId', String(routeChurchId));
          return;
        }
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        const id = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
        if (mounted && !isNaN(id)) {
          setChurchId(id);
        }
      } catch {
        if (routeChurchId && mounted) {
          setChurchId(routeChurchId);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [routeChurchId]);

  // A different church: everything loaded belongs to the previous one.
  useEffect(() => {
    servicesRef.current = null;
    setChurchCurrencyName('');
    setWeekData(new Map());
    setWeekErrors(new Map());
    dirtyWeeksRef.current.clear();
  }, [churchId]);

  // Church currency label for monthly giving fields (`data.currency_name` on
  // church detail), and the church name when none was passed or saved.
  useEffect(() => {
    if (!churchId) {
      return;
    }
    let cancelled = false;
    getChurchDetail(churchId)
      .then(data => {
        if (cancelled) {
          return;
        }
        const currency = String(data?.currency_name ?? '').trim();
        if (currency) {
          setChurchCurrencyName(currency);
        }
        const name = String(data?.name ?? '').trim();
        if (name) {
          setDisplayChurchName(prev => prev || name);
        }
      })
      .catch(() => {
        // Labels work without the currency suffix.
      });
    return () => {
      cancelled = true;
    };
  }, [churchId]);

  // Church name (route param, else the saved one) and the last report date,
  // from one dashboard request.
  useEffect(() => {
    if (churchName) {
      setDisplayChurchName(churchName);
    }
    if (!churchId) {
      return;
    }
    let mounted = true;
    (async () => {
      try {
        if (!churchName) {
          const savedChurchName = await AsyncStorage.getItem('selectedChurchName');
          if (mounted && savedChurchName) {
            setDisplayChurchName(savedChurchName);
          }
        }
        const response = await api.get('dashboard', {params: {church_id: churchId}});
        const dashboardInfo = response.data?.data?.dashboard_info;
        if (!mounted) {
          return;
        }
        if (dashboardInfo?.last_report_date) {
          setLastReportDate(String(dashboardInfo.last_report_date));
        }
        if (!churchName && dashboardInfo?.church_name) {
          setDisplayChurchName(String(dashboardInfo.church_name));
        }
      } catch {
        // The name / date line is informative only.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [churchName, churchId]);

  const formatLastRecord = useCallback(
    (dateString: string) => {
      // parseYmd: `new Date('2026-05-01')` is UTC midnight, still April west of UTC.
      const date = parseYmd(dateString);
      if (!date) {
        return '-';
      }
      let month: string;
      try {
        month = new Intl.DateTimeFormat(selectedLanguage || 'en', {month: 'short'}).format(date);
      } catch {
        month = new Intl.DateTimeFormat('en', {month: 'short'}).format(date);
      }
      return `${month} ${date.getFullYear()}`;
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

  /** The church's worship services, fetched once per church (retried after a failure). */
  const getServices = useCallback((): Promise<WorshipSession[]> => {
    if (!churchId) {
      return Promise.resolve([]);
    }
    if (servicesRef.current?.churchId === churchId) {
      return servicesRef.current.promise;
    }
    const entry = {
      churchId,
      promise: listWorshipServicesByChurch(churchId).then(toEmptySessions),
    };
    servicesRef.current = entry;
    entry.promise.catch(() => {
      if (servicesRef.current === entry) {
        servicesRef.current = null;
      }
    });
    return entry.promise;
  }, [churchId]);

  /**
   * Loads one week into `weekData` (once): an unsaved draft first, else the
   * server report merged with the church's services, else (404) an empty form.
   * Any other failure is kept as that week's error. It only ever writes its
   * own week, so a slow answer can't change the form of another week.
   */
  const loadWeek = useCallback(
    async (weekNumber: number) => {
      if (!churchId || !year || !weekNumber) {
        return;
      }
      if (weekDataRef.current.has(weekNumber) || loadingRef.current.has(weekNumber)) {
        return;
      }
      const requestChurchId = churchId;
      loadingRef.current.add(weekNumber);
      setLoadingWeeks(prev => new Set(prev).add(weekNumber));
      setWeekErrors(prev => {
        if (!prev.has(weekNumber)) {
          return prev;
        }
        const next = new Map(prev);
        next.delete(weekNumber);
        return next;
      });
      try {
        let week: WeeklyReportData;
        const draft = getDraftRef.current(churchId, year, weekNumber);
        if (draft) {
          const services = await getServices().catch(() => [] as WorshipSession[]);
          week = {
            church_id: churchId,
            year,
            week_number: weekNumber,
            worship_sessions: mergeWorshipSessions(services, draft.worshipSessions),
            church_metrics: draft.churchMetrics ?? ({} as ChurchMetrics),
          };
        } else {
          let report: WeeklyReportData | null = null;
          try {
            report = await getWeeklyReport(churchId, year, weekNumber);
          } catch (error: any) {
            const cause = error?.cause ?? error;
            // 404 "No weekly report found": a new week. Anything else (offline,
            // server error) must not become an empty form that would be saved
            // over the real report.
            if (cause?.response?.status !== 404) {
              throw cause;
            }
          }
          // Needed either way: a form without the services would drop sessions.
          const services = await getServices();
          week = report
            ? {...report, worship_sessions: mergeWorshipSessions(services, report.worship_sessions || [])}
            : emptyWeek(churchId, year, weekNumber, services);
        }
        if (!aliveRef.current || churchIdRef.current !== requestChurchId) {
          return;
        }
        if (draft) {
          dirtyWeeksRef.current.add(weekNumber);
        }
        setWeekData(prev => (prev.has(weekNumber) ? prev : new Map(prev).set(weekNumber, week)));
      } catch (error) {
        if (aliveRef.current && churchIdRef.current === requestChurchId) {
          setWeekErrors(prev => new Map(prev).set(weekNumber, error));
        }
      } finally {
        loadingRef.current.delete(weekNumber);
        if (aliveRef.current) {
          setLoadingWeeks(prev => {
            const next = new Set(prev);
            next.delete(weekNumber);
            return next;
          });
        }
      }
    },
    [churchId, year, getServices],
  );

  // Load the week on screen and the next one (for a smooth Next).
  useEffect(() => {
    if (!churchId || !currentWeekNumber) {
      return;
    }
    loadWeek(currentWeekNumber);
    const nextWeek = sortedWeekNumbers[currentWeekIndex + 1];
    if (nextWeek) {
      loadWeek(nextWeek);
    }
  }, [churchId, currentWeekNumber, currentWeekIndex, sortedWeekNumbers, loadWeek]);

  const checkWeekCompleted = useCallback(
    (_weekNum: number, data: WeeklyReportData | undefined): boolean =>
      !!data && hasRequiredAdultAttendance(data.worship_sessions),
    [],
  );
  const completedWeeks = useMemo(
    () =>
      new Set(
        sortedWeekNumbers.filter(weekNum => checkWeekCompleted(weekNum, weekData.get(weekNum))),
      ),
    [sortedWeekNumbers, weekData, checkWeekCompleted],
  );

  const smoothScrollToTop = (duration = 350) => {
    if (!scrollViewRef.current) {
      return;
    }
    if (scrollAnimRef.current) {
      clearTimeout(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
    const start = Date.now();
    const startY = scrollYRef.current;
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      scrollViewRef.current?.scrollTo({y: Math.max(0, startY * (1 - eased)), animated: false});
      scrollAnimRef.current = progress < 1 ? setTimeout(step, 16) : null;
    };
    scrollAnimRef.current = setTimeout(step, 16);
  };

  // Scroll to field with error
  const scrollToField = (fieldKey: string) => {
    if (scrollToFieldTimerRef.current) {
      clearTimeout(scrollToFieldTimerRef.current);
    }
    scrollToFieldTimerRef.current = setTimeout(() => {
      const fieldRef = fieldRefs.current.get(fieldKey);
      if (!fieldRef || !scrollViewRef.current) {
        return;
      }
      try {
        fieldRef.measureLayout(
          scrollViewRef.current as any,
          (_x: number, y: number) => {
            scrollViewRef.current?.scrollTo({y: Math.max(0, y - 100), animated: true});
          },
          () => {},
        );
      } catch {
        // Field not laid out yet.
      }
    }, 100);
  };

  /** Missing Adults of `sessions` as field errors (and the first one, to scroll to). */
  const attendanceErrors = (sessions: WorshipSession[]) => {
    const errors = new Set<string>();
    if (sessions.length === 0) {
      errors.add('worship_sessions');
    }
    sessions.forEach(session => {
      if (session.attendance.adult_attendance === null || session.attendance.adult_attendance === undefined) {
        errors.add(getAdultAttendanceFieldKey(session.id));
      }
    });
    return {errors, firstErrorField: errors.values().next().value as string | undefined};
  };

  // Validate current week data
  const validateCurrentWeek = (): {isValid: boolean; firstErrorField?: string} => {
    const {errors, firstErrorField} = attendanceErrors(worshipSessions);
    setFieldErrors(errors);
    return {isValid: errors.size === 0, firstErrorField};
  };

  const goToWeek = (index: number, scrollToTop = false) => {
    if (index < 0 || index >= sortedWeekNumbers.length || index === currentWeekIndex) {
      return;
    }
    setCurrentWeekIndex(index);
    setFieldErrors(new Set());
    if (scrollToTop) {
      smoothScrollToTop(1500);
    }
  };

  /** Applies an edit to the week on screen (never to a week that is still loading). */
  const editCurrentWeek = useCallback((change: (week: WeeklyReportData) => WeeklyReportData) => {
    const weekNumber = currentWeekRef.current;
    if (!weekDataRef.current.has(weekNumber)) {
      return;
    }
    dirtyWeeksRef.current.add(weekNumber);
    setWeekData(prev => {
      const week = prev.get(weekNumber);
      return week ? new Map(prev).set(weekNumber, change(week)) : prev;
    });
  }, []);

  const updateWorshipSession = useCallback(
    (sessionId: number, field: string, value: string) => {
      const numValue = parseNumber(value);
      editCurrentWeek(week => applySessionEdit(week, sessionId, field as AttendanceField, numValue));
      if (field === 'adult_attendance' && numValue !== null) {
        setFieldErrors(prev => {
          const key = getAdultAttendanceFieldKey(sessionId);
          if (!prev.has(key)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [editCurrentWeek],
  );

  const updateChurchMetrics = useCallback(
    (field: keyof ChurchMetrics, value: string) => {
      const numValue = parseNumber(value);
      editCurrentWeek(week => applyMetricEdit(week, field, numValue));
      if (numValue !== null) {
        setFieldErrors(prev => {
          const key = `church_metrics.${field}`;
          if (!prev.has(key)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [editCurrentWeek],
  );

  const removeSelectedWeek = (weekNum: number) => {
    if (!churchId || !year) {
      return;
    }
    if (sortedWeekNumbers.length <= 1) {
      Alert.alert(t('error'), t('pleaseSelectAtLeastOneWeek'));
      return;
    }
    const removedIndex = sortedWeekNumbers.indexOf(weekNum);
    const remaining = sortedWeekNumbers.filter(w => w !== weekNum);
    setSelectedWeekNumbers(prev => prev.filter(w => w !== weekNum));
    setWeekData(prev => {
      if (!prev.has(weekNum)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(weekNum);
      return next;
    });
    setWeekErrors(prev => {
      if (!prev.has(weekNum)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(weekNum);
      return next;
    });
    dirtyWeeksRef.current.delete(weekNum);
    // Its unsaved edits are dropped too, so they don't come back later.
    removeDraft(churchId, year, weekNum);
    // Stay on the same week (its index shifts when an earlier one goes).
    const stayOn = removedIndex === currentWeekIndex ? null : currentWeekNumber;
    const nextIndex =
      stayOn !== null
        ? remaining.indexOf(stayOn)
        : Math.min(currentWeekIndex, remaining.length - 1);
    setCurrentWeekIndex(Math.max(0, nextIndex));
    setFieldErrors(new Set());
  };

  const handleSaveAll = async () => {
    if (!churchId || savingRef.current) {
      return;
    }
    const validation = validateCurrentWeek();
    if (!validation.isValid) {
      Alert.alert(t('error'), t('pleaseFillAllRequiredFields'));
      if (validation.firstErrorField) {
        scrollToField(validation.firstErrorField);
      }
      return;
    }

    // Every week is checked, not only the one on screen (a week edited after
    // going Back could have lost its Adults value).
    const built = buildBatchPayloads(churchId, year, sortedWeekNumbers, weekDataRef.current);
    if (!built.ok) {
      const index = sortedWeekNumbers.indexOf(built.weekNumber);
      if (built.reason === 'notLoaded') {
        loadWeek(built.weekNumber);
        Alert.alert(t('error'), t('weekDataNotLoaded'));
      } else {
        Alert.alert(t('error'), t('pleaseFillAllRequiredFields'));
      }
      goToWeek(index, true);
      if (built.reason === 'missingAttendance') {
        const week = weekDataRef.current.get(built.weekNumber);
        setFieldErrors(attendanceErrors(week?.worship_sessions ?? []).errors);
      }
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await batchCreateOrUpdateWeeklyReports(built.payloads);
      // Saved: the drafts are no longer needed (and must not hide later
      // changes made elsewhere, e.g. on the web).
      sortedWeekNumbers.forEach(weekNumber => removeDraft(churchId, year, weekNumber));
      dirtyWeeksRef.current.clear();
      saveSuccessActionRef.current = () => {
        // Back to the screen underneath instead of pushing another copy on top.
        if (saveOption === 'goToChurch') {
          navigation.popTo('Dashboard');
        } else {
          navigation.popTo('MonthlyDataSelect', {resetKey: Date.now()});
        }
      };
      setSaveSuccessMessage(t('allDataSavedSuccessfully'));
      setSaveSuccessVisible(true);
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('failedToSaveData'));
    } finally {
      savingRef.current = false;
      if (aliveRef.current) {
        setSaving(false);
      }
    }
  };

  const handleNextWeek = () => {
    if (!churchId || currentWeekIndex >= sortedWeekNumbers.length - 1) {
      return;
    }
    const validation = validateCurrentWeek();
    if (!validation.isValid) {
      if (validation.firstErrorField) {
        scrollToField(validation.firstErrorField);
      }
      return;
    }
    goToWeek(currentWeekIndex + 1, true);
  };

  const handleBackWeek = () => {
    if (churchId && currentWeekIndex > 0) {
      goToWeek(currentWeekIndex - 1, true);
    }
  };

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
            onBackPress={() => navigation.popTo('MonthlyDataSelect')}
          />
        </View>

        {currentWeekError ? (
          <ApiErrorState
            error={currentWeekError}
            onRetry={() => loadWeek(currentWeekNumber)}
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
                  ? ` (${getIsoWeekDateRangeLabel(year, currentWeekNumber, selectedLanguage)} ${getIsoWeekDisplayYear(
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
                                t('weekDataNotLoaded'),
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
                          goToWeek(index);
                        }}>
                        <Text
                          style={[
                            styles.weekNavDateText,
                            {
                              color:
                                isCurrent || isCompleted ? '#fff' : C.textPrimary,
                            },
                          ]}>
                          {getIsoWeekDateRangeLabel(year, weekNum, selectedLanguage)}
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
                              keyboardType="number-pad"
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
                              keyboardType="number-pad"
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
                              keyboardType="number-pad"
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
                              keyboardType="number-pad"
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
                          keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                  keyboardType="number-pad"
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
                  keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                  keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
                      keyboardType="number-pad"
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
