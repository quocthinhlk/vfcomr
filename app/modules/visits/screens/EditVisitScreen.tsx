import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  FormActions,
  FormField,
  ScreenContainer,
} from '../../../shared/components/crud';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import api from '../../../config/api';
import {useVisitorOptions} from '../hooks/useVisitorOptions';
import {addWeeks, startOfISOWeek} from 'date-fns';
import {getVisitById, listVisits, VisitItem} from '../services/visit.service';
import {useLanguage} from '../../../shared/context/LanguageContext';

export const EditVisitScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const visitId: number | undefined = route?.params?.visitId;
  const {t} = useTranslation();
  const {selectedLanguage} = useLanguage();
  const C = useThemedColors();

  const scrollRef = useRef<ScrollView | null>(null);
  const fieldPosRef = useRef<Record<string, number>>({});

  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  type VisitorOption = {label: string; value: number; name: string; role: string};
  const visitors = useVisitorOptions<VisitorOption>(item => ({
    label: buildVisitorLabel(item),
    value: item.id,
    name: item.name || '',
    role: resolveRoleName(item),
  }));
  const visitorOptions = visitors.options;
  const [visitorName, setVisitorName] = useState('');
  const [visitorRole, setVisitorRole] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [churchVisitCount, setChurchVisitCount] = useState('0');
  const [eventCount, setEventCount] = useState('0');
  const [prefillVisit, setPrefillVisit] = useState<VisitItem | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retryLoad = () => setReloadKey(k => k + 1);

  const MONTHS = useMemo(() => Array.from({length: 12}, (_, i) => ({value: i + 1})), []);
  const localeMap: Record<string, string> = useMemo(
    () => ({
      en: 'en-US',
      pt: 'pt-PT',
      es: 'es-ES',
      fr: 'fr-FR',
      zh: 'zh-CN',
      ms: 'ms-MY',
      ja: 'ja-JP',
    }),
    [],
  );

  const buildVisitorLabel = (user: {name?: string; title?: string; city_name?: string}) => {
    const titlePart = user.title?.trim() ? ` [${user.title.trim()}]` : '';
    const cityPart = user.city_name?.trim() ? ` - ${user.city_name.trim()}` : '';
    return `${user.name || '-'}${titlePart}${cityPart}`;
  };

  const resolveRoleName = (user: any) =>
    user?.role_name || user?.role?.name || user?.role?.role_name || '';

  const monthOptions = useMemo(() => {
    const locale = localeMap[selectedLanguage as string] || 'en-US';
    return MONTHS.map(month => {
      const date = new Date(2000, month.value - 1, 1);
      const label = date.toLocaleDateString(locale, {month: 'long'});
      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: month.value,
      };
    });
  }, [MONTHS, localeMap, selectedLanguage]);

  const yearOptions = useMemo(() => {
    const maxYear = new Date().getFullYear() + 1;
    return Array.from({length: maxYear - 1900 + 1}, (_, i) => {
      const year = maxYear - i;
      return {label: String(year), value: year};
    });
  }, []);

  const normalizeCountInput = (text: string) => text.replace(/[^0-9]/g, '');

  const inferMonthFromIsoWeek = (year: number, weekNumber: number) => {
    const jan4 = new Date(year, 0, 4);
    const isoWeek1Start = startOfISOWeek(jan4);
    const weekStart = addWeeks(isoWeek1Start, weekNumber - 1);
    return weekStart.getMonth() + 1;
  };

  const loadExistingVisitChurchCount = async (uid: number, year: number, month: number) => {
    // Build the same week columns logic as AddVisitsDetailsScreen (weeks overlapping the month).
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    let cursor = startOfISOWeek(monthStart);
    const lastWeekEnd = startOfISOWeek(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 1));
    const weekNumbers: number[] = [];
    while (cursor <= lastWeekEnd) {
      const d = cursor;
      // ISO week number without date-fns getISOWeek to keep deps minimal here:
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1) / 7);
      weekNumbers.push(weekNo);
      cursor = addWeeks(cursor, 1);
    }

    const churchIds = new Set<number>();
    await Promise.all(
      weekNumbers.map(async wk => {
        const res = await listVisits({user_id: uid, year, week_number: wk, page: 1, limit: 1000});
        (res?.data?.items ?? []).forEach(item => {
          if (typeof item.church_id === 'number') {
            churchIds.add(item.church_id);
          }
        });
      }),
    );
    setChurchVisitCount(String(churchIds.size));
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        // Visitors: first page by name; typing in the picker searches the server.
        const [meRes, , visitRes] = await Promise.all([
          api.get('users/me'),
          visitors.loadInitial(),
          visitId ? getVisitById(visitId) : Promise.resolve(null as any),
        ]);

        if (!mounted) return;

        const me = meRes?.data?.data;
        const meId = typeof me?.id === 'number' ? me.id : null;
        const meOption: VisitorOption | null = meId
          ? {label: buildVisitorLabel(me), value: meId, name: me?.name || '', role: resolveRoleName(me)}
          : null;
        visitors.pin(meOption);

        const visitData: VisitItem | null = visitRes?.data ?? null;
        setPrefillVisit(visitData);

        // The visit's own visitor may not be on the first page: keep it selectable.
        const visitOption: VisitorOption | null =
          visitData?.user_id && visitData.user_id !== meId
            ? {
                label: visitData.user_name || `#${visitData.user_id}`,
                value: visitData.user_id,
                name: visitData.user_name || '',
                role: '',
              }
            : null;
        visitors.pin(visitOption);

        // Default selection: visit.user_id if editing from list, else logged-in user.
        const defaultUserId = visitData?.user_id ?? meId ?? null;
        const defaultVisitor = visitOption ?? (defaultUserId === meId ? meOption : null);

        setUserId(defaultUserId);
        setVisitorName(defaultVisitor?.name || '');
        setVisitorRole(defaultVisitor?.role || '');

        if (visitData?.year && visitData?.week_number) {
          setSelectedYear(visitData.year);
          const inferredMonth = inferMonthFromIsoWeek(visitData.year, visitData.week_number);
          setSelectedMonth(inferredMonth);
          await loadExistingVisitChurchCount(defaultUserId!, visitData.year, inferredMonth);
          setEventCount('0');
        }
        if (mounted) {
          setLoadError(null);
        }
      } catch (e) {
        console.error('Failed to load edit visit setup:', e);
        // Never show (and let the user submit) a blank form that failed to load.
        if (mounted) {
          setLoadError(e);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId, reloadKey]);

  const clearInvalid = (key: string) => {
    setInvalid(prev => ({...prev, [key]: false}));
  };

  const clearFieldError = (key: string) => {
    setFieldErrors(prev => {
      if (!(key in prev)) return prev;
      const next = {...prev};
      delete next[key];
      return next;
    });
  };

  const renderFieldError = (key: string) => {
    const msg = fieldErrors[key];
    if (!msg) return null;
    return <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{msg}</Text>;
  };

  const setFieldPos = (key: string, y: number) => {
    fieldPosRef.current[key] = y;
  };

  const scrollToField = (key: string) => {
    const y = fieldPosRef.current[key];
    if (typeof y !== 'number') {
      return;
    }
    scrollRef.current?.scrollTo({y: Math.max(0, y - ms(12)), animated: true});
  };

  const goToDetailStep = () => {
    setInvalid({});
    setFieldErrors({});
    const nextInvalid: Record<string, boolean> = {};
    const nextErrors: Record<string, string> = {};

    if (!selectedMonth) {
      nextInvalid.selectedMonth = true;
      nextErrors.selectedMonth = t('pleaseSelectYearAndMonth') || 'Please select year and month';
    }
    if (!selectedYear) {
      nextInvalid.selectedYear = true;
      nextErrors.selectedYear = t('pleaseSelectYearAndMonth') || 'Please select year and month';
    }

    const churchCountValue = Number(churchVisitCount ?? 0);
    const eventCountValue = Number(eventCount ?? 0);

    if (
      !Number.isFinite(churchCountValue) ||
      !Number.isFinite(eventCountValue) ||
      churchCountValue < 0 ||
      eventCountValue < 0
    ) {
      nextInvalid.churchVisitCount = true;
      nextInvalid.eventCount = true;
      nextErrors.churchVisitCount = t('pleaseEnterValidCounts') || 'Please enter valid counts.';
      nextErrors.eventCount = t('pleaseEnterValidCounts') || 'Please enter valid counts.';
    }

    if (churchCountValue === 0 && eventCountValue === 0) {
      nextInvalid.churchVisitCount = true;
      nextInvalid.eventCount = true;
      nextErrors.churchVisitCount =
        t('pleaseAddAtLeastOneChurchVisitOrEvent') ||
        'Please add at least one church visit or event.';
      nextErrors.eventCount =
        t('pleaseAddAtLeastOneChurchVisitOrEvent') ||
        'Please add at least one church visit or event.';
    }

    if (!userId) {
      nextInvalid.user_id = true;
      nextErrors.user_id = t('userInformationIsMissing') || 'User information is missing.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setInvalid(nextInvalid);
      setFieldErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      requestAnimationFrame(() => scrollToField(firstKey));
      return;
    }

    navigation.navigate('EditVisitDetails', {
      visitId: prefillVisit?.id,
      userId,
      visitorName,
      visitorRole,
      selectedMonth,
      selectedYear,
      churchVisitCount: churchCountValue,
      eventCount: eventCountValue,
    });
  };

  if (loading) {
    return <ScreenContainer title={`${t('edit') || 'Edit'} ${t('visits') || 'Visits'}`} loading />;
  }

  if (loadError) {
    return (
      <ScreenContainer
        title={`${t('edit') || 'Edit'} ${t('visits') || 'Visits'}`}
        error={loadError}
        onRetry={retryLoad}
      />
    );
  }

  return (
    <ScreenContainer title={`${t('edit') || 'Edit'} ${t('visits') || 'Visits'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.flex}>
        <ScrollView
          ref={ref => {
            scrollRef.current = ref;
          }}

          contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={[styles.headingTitle, {color: C.textPrimary}]}>
              {`${t('visitsAndEventsInformationFor') || 'Visits and Events Information For'} : ${
                visitorName || '-'
              }${visitorRole ? `, ${visitorRole}` : ''}`}
            </Text>
            <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
              {t('pleaseSelectTheInformation') || 'Please Select the Information'}
            </Text>

            <View
              onLayout={e => setFieldPos('user_id', e.nativeEvent.layout.y)}>
              <FormField label={t('visitor') || 'Visitor'}>
                <ElementDropdown
                  data={visitorOptions}
                  value={userId}
                  onChange={value => {
                    const selectedVisitor = visitorOptions.find(
                      option => option.value === (value as number),
                    );
                    // Keep the choice visible even after the search text changes.
                    visitors.pin(selectedVisitor);
                    setUserId((value as number) || null);
                    setVisitorName(selectedVisitor?.name || '');
                    setVisitorRole(selectedVisitor?.role || '');
                    clearInvalid('user_id');
                    clearFieldError('user_id');
                  }}
                  placeholder={t('visitor') || 'Visitor'}
                  onSearchText={visitors.onSearchText}
                  onEndReached={visitors.onEndReached}
                  containerStyle={{
                    backgroundColor: C.inputBg,
                    borderColor: invalid.user_id ? C.error || '#ff4444' : C.inputBorder,
                  }}
                />
                {renderFieldError('user_id')}
              </FormField>
            </View>

            <View style={styles.row}>
              <View
                style={styles.halfField}
                onLayout={e => setFieldPos('selectedMonth', e.nativeEvent.layout.y)}>
                <FormField label={t('month') || 'Month'}>
                  <ElementDropdown
                    data={monthOptions}
                    value={selectedMonth}
                    onChange={value => {
                      setSelectedMonth(value as number);
                      clearInvalid('selectedMonth');
                      clearFieldError('selectedMonth');
                    }}
                    placeholder={t('month') || 'Month'}
                    containerStyle={{
                      backgroundColor: C.inputBg,
                      borderColor: invalid.selectedMonth ? C.error || '#ff4444' : C.inputBorder,
                    }}
                  />
                  {renderFieldError('selectedMonth')}
                </FormField>
              </View>
              <View
                style={styles.halfField}
                onLayout={e => setFieldPos('selectedYear', e.nativeEvent.layout.y)}>
                <FormField label={t('year') || 'Year'}>
                  <ElementDropdown
                    data={yearOptions}
                    value={selectedYear}
                    onChange={value => {
                      setSelectedYear(value as number);
                      clearInvalid('selectedYear');
                      clearFieldError('selectedYear');
                    }}
                    placeholder={t('year') || 'Year'}
                    containerStyle={{
                      backgroundColor: C.inputBg,
                      borderColor: invalid.selectedYear ? C.error || '#ff4444' : C.inputBorder,
                    }}
                  />
                  {renderFieldError('selectedYear')}
                </FormField>
              </View>
            </View>

            <View
              onLayout={e => setFieldPos('churchVisitCount', e.nativeEvent.layout.y)}>
              <FormField label={t('numberOfChurchesVisited') || 'Number of Churches Visited'}>
                <AppInput
                  value={churchVisitCount}
                  onChangeText={text => {
                    setChurchVisitCount(normalizeCountInput(text));
                    clearInvalid('churchVisitCount');
                    clearFieldError('churchVisitCount');
                  }}
                  placeholder="0"
                  keyboardType="number-pad"
                  error={!!invalid.churchVisitCount}
                />
                {renderFieldError('churchVisitCount')}
              </FormField>
            </View>

            <View
              onLayout={e => setFieldPos('eventCount', e.nativeEvent.layout.y)}>
              <FormField label={t('numberOfEventsYouOrganised') || 'Number of Events You Organised'}>
                <AppInput
                  value={eventCount}
                  onChangeText={text => {
                    setEventCount(normalizeCountInput(text));
                    clearInvalid('eventCount');
                    clearFieldError('eventCount');
                  }}
                  placeholder="0"
                  keyboardType="number-pad"
                  error={!!invalid.eventCount}
                />
                {renderFieldError('eventCount')}
              </FormField>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actions, {borderTopColor: C.border}]}>
          <FormActions
            onCancel={() => navigation.goBack()}
            onSave={goToDetailStep}
            saveLabel={t('next') || 'Next'}
          />
        </View>

      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

export default EditVisitScreen;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ms(24),
  },
  card: {
    marginTop: ms(8),
  },
  headingTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    lineHeight: fs(22),
    marginBottom: ms(10),
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    marginBottom: ms(12),
  },
  row: {
    flexDirection: 'row',
    gap: ms(12),
  },
  halfField: {
    flex: 1,
  },
  errorText: {
    marginTop: ms(6),
    fontSize: fs(12),
    fontWeight: '500',
  },
  actions: {
    paddingBottom: ms(12),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

