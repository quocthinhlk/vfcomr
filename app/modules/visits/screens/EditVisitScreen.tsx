import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {CancelButton, SaveButton} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import api from '../../../config/api';
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
  const [visitorOptions, setVisitorOptions] = useState<
    Array<{label: string; value: number; name: string; role: string}>
  >([]);
  const [visitorName, setVisitorName] = useState('');
  const [visitorRole, setVisitorRole] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [churchVisitCount, setChurchVisitCount] = useState('0');
  const [eventCount, setEventCount] = useState('0');
  const [prefillVisit, setPrefillVisit] = useState<VisitItem | null>(null);

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
      try {
        const [meRes, visitorsRes, visitRes] = await Promise.all([
          api.get('users/me'),
          api.get('users', {
            params: {
              page: 1,
              limit: 10,
              sort_desc: true,
              search: 'vietnam',
              sort_by: 'city',
            },
          }),
          visitId ? getVisitById(visitId) : Promise.resolve(null as any),
        ]);

        if (!mounted) return;

        const me = meRes?.data?.data;
        const meId = typeof me?.id === 'number' ? me.id : null;
        const visitorItems = (visitorsRes?.data?.data?.items ?? []) as any[];

        const mappedVisitors = visitorItems.map(item => ({
          label: buildVisitorLabel(item),
          value: item.id,
          name: item.name || '',
          role: resolveRoleName(item),
        }));

        if (meId && !mappedVisitors.some(option => option.value === meId)) {
          mappedVisitors.unshift({
            label: buildVisitorLabel(me),
            value: meId,
            name: me?.name || '',
            role: resolveRoleName(me),
          });
        }

        setVisitorOptions(mappedVisitors);

        const visitData: VisitItem | null = visitRes?.data ?? null;
        setPrefillVisit(visitData);

        // Default selection: visit.user_id if editing from list, else logged-in user.
        const defaultUserId = visitData?.user_id ?? meId ?? (mappedVisitors[0]?.value ?? null);
        const defaultVisitor = mappedVisitors.find(v => v.value === defaultUserId) || mappedVisitors[0] || null;

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
      } catch (e) {
        console.error('Failed to load edit visit setup:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

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
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.loadingWrap, {backgroundColor: C.background}]}>
          <ActivityIndicator size="small" color={C.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{flex: 1}}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={styles.container}>
            <Header title={`${t('edit') || 'Edit'} ${t('visits') || 'Visits'}`} showMenu={false} />

            <ScrollView
              ref={ref => {
                scrollRef.current = ref;
              }}

              contentContainerStyle={styles.scrollContent}>
              <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.border}]}>
                <Text style={[styles.headingTitle, {color: C.textPrimary}]}>
                  {`${t('visitsAndEventsInformationFor') || 'Visits and Events Information For'} : ${
                    visitorName || '-'
                  }${visitorRole ? `, ${visitorRole}` : ''}`}
                </Text>
                <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                  {t('pleaseSelectTheInformation') || 'Please Select the Information'}
                </Text>

                <View
                  style={styles.field}
                  onLayout={e => setFieldPos('user_id', e.nativeEvent.layout.y)}>
                  <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                    {t('visitor') || 'Visitor'}
                  </Text>
                  <ElementDropdown
                    data={visitorOptions}
                    value={userId}
                    onChange={value => {
                      const selectedVisitor = visitorOptions.find(
                        option => option.value === (value as number),
                      );
                      setUserId((value as number) || null);
                      setVisitorName(selectedVisitor?.name || '');
                      setVisitorRole(selectedVisitor?.role || '');
                      clearInvalid('user_id');
                      clearFieldError('user_id');
                    }}
                    placeholder={t('visitor') || 'Visitor'}
                    containerStyle={{
                      backgroundColor: C.inputBg,
                      borderColor: invalid.user_id ? C.error || '#ff4444' : C.inputBorder,
                    }}
                  />
                  {renderFieldError('user_id')}
                </View>

                <View style={styles.row}>
                  <View
                    style={[styles.field, styles.halfField]}
                    onLayout={e => setFieldPos('selectedMonth', e.nativeEvent.layout.y)}>
                    <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                      {t('month') || 'Month'}
                    </Text>
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
                  </View>
                  <View
                    style={[styles.field, styles.halfField]}
                    onLayout={e => setFieldPos('selectedYear', e.nativeEvent.layout.y)}>
                    <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                      {t('year') || 'Year'}
                    </Text>
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
                  </View>
                </View>

                <View
                  style={styles.field}
                  onLayout={e => setFieldPos('churchVisitCount', e.nativeEvent.layout.y)}>
                  <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                    {t('numberOfChurchesVisited') || 'Number of Churches Visited'}
                  </Text>
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
                </View>

                <View
                  style={styles.field}
                  onLayout={e => setFieldPos('eventCount', e.nativeEvent.layout.y)}>
                  <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                    {t('numberOfEventsYouOrganised') || 'Number of Events You Organised'}
                  </Text>
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
                </View>
              </View>
            </ScrollView>

            <View style={[styles.actions, {borderTopColor: C.border}]}>
              <CancelButton label={t('cancel') || 'Cancel'} onPress={() => navigation.goBack()} />
              <SaveButton label={t('next') || 'Next'} onPress={goToDetailStep} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditVisitScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  field: {
    marginBottom: ms(12),
  },
  fieldLabel: {
    fontSize: fs(14),
    fontWeight: '500',
    marginBottom: ms(6),
  },
  errorText: {
    marginTop: ms(6),
    fontSize: fs(12),
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    paddingVertical: ms(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
  },
});

