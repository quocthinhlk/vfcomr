import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  createEventsBulk,
  createVisitsBulk,
  CreateEventBulkPayload,
  CreateVisitPayload,
  listVisits,
} from '../services/visit.service';
import {SaveButton, CancelButton} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import ElementDropdown, {ElementDropdownItem} from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import api from '../../../config/api';
import {listEventTypes, EventTypeItem, resolveEventMeetingType} from '../../eventTypes/services/eventType.service';
import {useLanguage} from '../../../shared/context/LanguageContext';
import {
  addWeeks,
  endOfISOWeek,
  endOfMonth,
  format,
  getISOWeek,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns';

type CountryOption = {label: string; value: number};
type CityOption = {label: string; value: number};
type WeekColumn = {
  weekNumber: number;
  rangeLabel: string;
};
type ChurchOption = ElementDropdownItem & {
  cityName: string;
};

interface VisitEntry {
  country_id: number | null;
  city_id: number | null;
  church_id: number | null;
  cityOptions: CityOption[];
  churchOptions: ChurchOption[];
  allChurches: ChurchOption[];
  daysByWeek: Record<number, string>;
}

interface EventEntry {
  country_id: number | null;
  event_type_id: number | null;
  name: string;
  attendance: string;
  meeting_with: number | null;
  daysByWeek: Record<number, string>;
}

const MONTHS = [
  {value: 1},
  {value: 2},
  {value: 3},
  {value: 4},
  {value: 5},
  {value: 6},
  {value: 7},
  {value: 8},
  {value: 9},
  {value: 10},
  {value: 11},
  {value: 12},
];

const localeMap: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ms: 'ms-MY',
  ja: 'ja-JP',
};

const normalizePositiveIntegerInput = (text: string) => text.replace(/[^0-9]/g, '');

const createWeekColumns = (year: number, month: number): WeekColumn[] => {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const columns: WeekColumn[] = [];
  let cursor = startOfISOWeek(monthStart);
  const lastWeekEnd = endOfISOWeek(monthEnd);

  while (cursor <= lastWeekEnd) {
    const weekStart = cursor;
    const weekEnd = endOfISOWeek(weekStart);
    columns.push({
      weekNumber: getISOWeek(weekStart),
      rangeLabel: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`,
    });
    cursor = addWeeks(cursor, 1);
  }

  return columns;
};

const createEmptyWeekState = (columns: WeekColumn[]) =>
  columns.reduce<Record<number, string>>((acc, column) => {
    acc[column.weekNumber] = '';
    return acc;
  }, {});

export const EditVisitDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const {selectedLanguage} = useLanguage();
  const C = useThemedColors();

  const visitId: number | undefined = route?.params?.visitId;
  const userId: number | null = route?.params?.userId ?? null;
  const visitorName: string = route?.params?.visitorName ?? '';
  const visitorRole: string = route?.params?.visitorRole ?? '';
  const selectedMonth: number | null = route?.params?.selectedMonth ?? null;
  const selectedYear: number | null = route?.params?.selectedYear ?? null;
  const churchVisitCount: number = route?.params?.churchVisitCount ?? 0;
  const eventCount: number = route?.params?.eventCount ?? 0;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [userOptions, setUserOptions] = useState<ElementDropdownItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([]);
  const [weekColumns, setWeekColumns] = useState<WeekColumn[]>([]);
  const [visitEntries, setVisitEntries] = useState<VisitEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) {
      return '-';
    }

    const locale = localeMap[selectedLanguage as string] || 'en-US';
    const date = new Date(2000, selectedMonth - 1, 1);
    const label = date.toLocaleDateString(locale, {month: 'long'});
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedLanguage, selectedMonth]);

  const eventTypeOptions = useMemo<ElementDropdownItem[]>(
    () =>
      eventTypes.map(item => ({
        label: item.name,
        value: item.id,
      })),
    [eventTypes],
  );

  const updateVisitEntry = (index: number, updater: (entry: VisitEntry) => VisitEntry) => {
    setVisitEntries(prev => prev.map((entry, idx) => (idx === index ? updater(entry) : entry)));
  };

  const updateEventEntry = (index: number, updater: (entry: EventEntry) => EventEntry) => {
    setEventEntries(prev => prev.map((entry, idx) => (idx === index ? updater(entry) : entry)));
  };

  const clearInvalid = (key: string) => setInvalid(prev => ({...prev, [key]: false}));
  const clearFieldError = (key: string) =>
    setFieldErrors(prev => {
      if (!(key in prev)) return prev;
      const next = {...prev};
      delete next[key];
      return next;
    });
  const setFieldError = (key: string, message: string) => {
    setInvalid(prev => ({...prev, [key]: true}));
    setFieldErrors(prev => ({...prev, [key]: message}));
  };
  const renderFieldError = (key: string) => {
    const msg = fieldErrors[key];
    if (!msg) return null;
    return <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{msg}</Text>;
  };

  const scrollRef = useRef<ScrollView | null>(null);
  const fieldPosRef = useRef<Record<string, number>>({});

  const setFieldPos = (key: string, y: number) => {
    fieldPosRef.current[key] = y;
  };

  const scrollToField = (key: string) => {
    const y = fieldPosRef.current[key];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({y: Math.max(0, y - ms(12)), animated: true});
      return;
    }
    const fallback = fieldPosRef.current.form;
    if (typeof fallback === 'number') {
      scrollRef.current?.scrollTo({y: Math.max(0, fallback - ms(12)), animated: true});
    }
  };

  const applyApiValidationErrors = (err: any) => {
    const errors = err?.response?.data?.errors;
    if (!errors || typeof errors !== 'object') {
      return false;
    }
    const keys = Object.keys(errors);
    Object.entries(errors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        setFieldError(String(key), value);
      }
    });
    if (keys.length > 0) {
      requestAnimationFrame(() => scrollToField(keys[0]));
    }
    return true;
  };

  const loadVisitCities = async (index: number, countryId: number) => {
    try {
      const res = await api.get(`cities/country/${countryId}`, {params: {sort_by: 'name', sort_desc: false}});
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const cityOptions = list.map((item: any) => ({
        label: item.name,
        value: item.id,
      }));
      updateVisitEntry(index, entry => ({
        ...entry,
        cityOptions,
      }));
    } catch (error) {
      console.error('Failed to load cities:', error);
      updateVisitEntry(index, entry => ({
        ...entry,
        cityOptions: [],
      }));
    }
  };

  const loadVisitChurches = async (index: number, countryId: number) => {
    try {
      const res = await api.get('churches', {
        params: {
          page: 1,
          limit: 1000,
          country_id: countryId,
          sort_by: 'name',
          sort_desc: false,
        },
      });
      const items = ((res?.data?.data?.items ?? []) as any[]).map(item => ({
        label: item.name,
        value: item.id,
        cityName: (item.city || '').trim(),
      }));

      updateVisitEntry(index, entry => ({
        ...entry,
        allChurches: items,
        churchOptions: items,
      }));
    } catch (error) {
      console.error('Failed to load churches:', error);
      updateVisitEntry(index, entry => ({
        ...entry,
        allChurches: [],
        churchOptions: [],
      }));
    }
  };

  const handleSelectVisitCountry = async (index: number, countryId: number | null) => {
    updateVisitEntry(index, entry => ({
      ...entry,
      country_id: countryId,
      city_id: null,
      church_id: null,
      cityOptions: [],
      churchOptions: [],
      allChurches: [],
    }));

    if (!countryId) {
      return;
    }

    await Promise.all([loadVisitCities(index, countryId), loadVisitChurches(index, countryId)]);
  };

  const handleSelectVisitCity = (index: number, cityId: number | null) => {
    updateVisitEntry(index, entry => {
      const selectedCity = entry.cityOptions.find(option => option.value === cityId);
      const normalizedCityName = (selectedCity?.label || '').trim().toLowerCase();
      const churchOptions = !normalizedCityName
        ? entry.allChurches
        : entry.allChurches.filter(option => option.cityName.trim().toLowerCase() === normalizedCityName);

      return {
        ...entry,
        city_id: cityId,
        church_id: null,
        churchOptions,
      };
    });
  };

  const getSelectedEventType = (eventTypeId: number | null) =>
    eventTypes.find(item => item.id === eventTypeId) || null;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!selectedMonth || !selectedYear) {
          return;
        }

        const [countriesRes, eventTypesRes, usersRes] = await Promise.all([
          api.get('countries', {params: {page: 1, limit: 1000, sort_by: 'name', sort_desc: false}}),
          listEventTypes(),
          api.get('users', {params: {page: 1, limit: 1000, sort_by: 'name', sort_desc: false}}),
        ]);

        if (!mounted) {
          return;
        }

        const countries = ((countriesRes?.data?.data?.items ?? []) as any[]).map(item => ({
          label: item.name,
          value: item.id,
        }));
        const users = ((usersRes?.data?.data?.items ?? []) as any[]).map(item => ({
          label: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || String(item.id),
          value: item.id,
        }));
        setCountryOptions(countries);
        setUserOptions(users);
        setEventTypes(eventTypesRes?.data ?? []);

        const columns = createWeekColumns(selectedYear, selectedMonth);
        const emptyWeekState = createEmptyWeekState(columns);
        setWeekColumns(columns);

        setVisitEntries(
          Array.from({length: churchVisitCount}, () => ({
            country_id: null,
            city_id: null,
            church_id: null,
            cityOptions: [],
            churchOptions: [],
            allChurches: [],
            daysByWeek: {...emptyWeekState},
          })),
        );
        setEventEntries(
          Array.from({length: eventCount}, () => ({
            country_id: null,
            event_type_id: null,
            name: '',
            attendance: '',
            meeting_with: null,
            daysByWeek: {...emptyWeekState},
          })),
        );

        // Prefill visits when entering edit from list: group by church_id across all weekColumns.
        if (visitId && userId) {
          const perWeek = await Promise.all(
            columns.map(col =>
              listVisits({
                user_id: userId,
                year: selectedYear,
                week_number: col.weekNumber,
                page: 1,
                limit: 1000,
              }),
            ),
          );

          const churchMap = new Map<number, Record<number, string>>();
          perWeek.forEach((res, idx) => {
            const wk = columns[idx].weekNumber;
            (res?.data?.items ?? []).forEach(item => {
              if (!item?.church_id) return;
              const existing = churchMap.get(item.church_id) || {...emptyWeekState};
              existing[wk] = String(item.number_of_days ?? '');
              churchMap.set(item.church_id, existing);
            });
          });

          const churchIds = Array.from(churchMap.keys()).slice(0, churchVisitCount);

          // For each church, try to load church detail to preselect country/city.
          await Promise.all(
            churchIds.map(async (churchId, index) => {
              try {
                const detailRes = await api.get(`churches/${churchId}`);
                const detail = detailRes?.data?.data;
                const countryId = detail?.country_id ? Number(detail.country_id) : null;
                const cityId = detail?.city_id ? Number(detail.city_id) : null;

                if (countryId) {
                  await handleSelectVisitCountry(index, countryId);
                }
                if (cityId) {
                  handleSelectVisitCity(index, cityId);
                }

                updateVisitEntry(index, entry => ({
                  ...entry,
                  country_id: countryId,
                  city_id: cityId,
                  church_id: churchId,
                  daysByWeek: churchMap.get(churchId) || entry.daysByWeek,
                }));
              } catch (e) {
                updateVisitEntry(index, entry => ({
                  ...entry,
                  church_id: churchId,
                  daysByWeek: churchMap.get(churchId) || entry.daysByWeek,
                }));
              }
            }),
          );
        }
      } catch (error) {
        console.error('Failed to load edit visit details:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchVisitCount, eventCount, selectedMonth, selectedYear, visitId, userId]);

  const onSave = async () => {
    setInvalid({});
    setFieldErrors({});

    if (!userId || !selectedYear) {
      setFieldError('user_id', t('userInformationIsMissing') || 'User information is missing.');
      requestAnimationFrame(() => scrollToField('user_id'));
      return;
    }

    const visitPayloads: CreateVisitPayload[] = [];
    const eventPayloads: CreateEventBulkPayload[] = [];

    for (const [index, entry] of visitEntries.entries()) {
      if (!entry.country_id || !entry.city_id || !entry.church_id) {
        if (!entry.country_id)
          setFieldError(`visit.${index}.country_id`, t('nationIsRequired') || 'Nation is required');
        if (!entry.city_id)
          setFieldError(`visit.${index}.city_id`, t('cityIsRequired') || 'City is required');
        if (!entry.church_id)
          setFieldError(`visit.${index}.church_id`, t('churchIsRequired') || 'Church is required');
        const firstKey =
          (!entry.country_id && `visit.${index}.country_id`) ||
          (!entry.city_id && `visit.${index}.city_id`) ||
          `visit.${index}.church_id`;
        requestAnimationFrame(() => scrollToField(firstKey as string));
        return;
      }

      const selectedWeeks = weekColumns
        .map(column => ({
          weekNumber: column.weekNumber,
          numberOfDays: Number(entry.daysByWeek[column.weekNumber] || '0'),
        }))
        .filter(item => item.numberOfDays > 0);

      if (selectedWeeks.length === 0) {
        setFieldError(
          `visit.${index}.weeks`,
          t('pleaseEnterAtLeastOneWeekValue') || 'Please enter at least one week value.',
        );
        requestAnimationFrame(() => scrollToField(`visit.${index}.weeks`));
        return;
      }

      selectedWeeks.forEach(item => {
        visitPayloads.push({
          user_id: userId,
          church_id: entry.church_id!,
          year: selectedYear,
          week_number: item.weekNumber,
          number_of_days: item.numberOfDays,
        });
      });
    }

    for (const [index, entry] of eventEntries.entries()) {
      if (!entry.country_id || !entry.event_type_id || !entry.name.trim()) {
        if (!entry.country_id)
          setFieldError(`event.${index}.country_id`, t('nationIsRequired') || 'Nation is required');
        if (!entry.event_type_id)
          setFieldError(
            `event.${index}.event_type_id`,
            t('pleaseFillAllRequiredFields') || 'Please fill all required fields',
          );
        if (!entry.name.trim())
          setFieldError(`event.${index}.name`, t('eventNameIsRequired') || 'Event Name is required');
        const firstKey =
          (!entry.country_id && `event.${index}.country_id`) ||
          (!entry.event_type_id && `event.${index}.event_type_id`) ||
          `event.${index}.name`;
        requestAnimationFrame(() => scrollToField(firstKey as string));
        return;
      }

      const eventType = getSelectedEventType(entry.event_type_id);
      const meetingType = resolveEventMeetingType(eventType?.meeting_type);
      const attendanceNumber = Number(entry.attendance || '0');

      if (
        meetingType === 'attendance' &&
        (!entry.attendance.trim() || !Number.isFinite(attendanceNumber) || attendanceNumber <= 0)
      ) {
        setFieldError(
          `event.${index}.attendance`,
          t('pleaseEnterAttendance') || 'Please enter attendance.',
        );
        requestAnimationFrame(() => scrollToField(`event.${index}.attendance`));
        return;
      }

      if (meetingType === 'meeting_with' && !entry.meeting_with) {
        setFieldError(
          `event.${index}.meeting_with`,
          t('pleaseSelectMeetingWith') || 'Please select who you met with.',
        );
        requestAnimationFrame(() => scrollToField(`event.${index}.meeting_with`));
        return;
      }

      const selectedWeeks = weekColumns
        .map(column => ({
          weekNumber: column.weekNumber,
          numberOfDays: Number(entry.daysByWeek[column.weekNumber] || '0'),
        }))
        .filter(item => item.numberOfDays > 0);

      if (selectedWeeks.length === 0) {
        setFieldError(
          `event.${index}.weeks`,
          t('pleaseEnterAtLeastOneWeekValue') || 'Please enter at least one week value.',
        );
        requestAnimationFrame(() => scrollToField(`event.${index}.weeks`));
        return;
      }

      selectedWeeks.forEach(item => {
        eventPayloads.push({
          name: entry.name.trim(),
          event_type_id: entry.event_type_id!,
          user_id: userId,
          country_id: entry.country_id!,
          year: selectedYear,
          week_number: item.weekNumber,
          number_of_days: item.numberOfDays,
          ...(meetingType === 'attendance' ? {attendance: attendanceNumber} : {}),
          ...(meetingType === 'meeting_with' && entry.meeting_with
            ? {meeting_with: entry.meeting_with}
            : {}),
        });
      });
    }

    if (visitPayloads.length === 0 && eventPayloads.length === 0) {
      setFieldError('form', t('noVisitOrEventDataToSave') || 'No visit or event data to save.');
      requestAnimationFrame(() => scrollToField('form'));
      return;
    }

    try {
      setSubmitting(true);

      if (visitPayloads.length > 0) {
        await createVisitsBulk(visitPayloads);
      }

      if (eventPayloads.length > 0) {
        await createEventsBulk(eventPayloads);
      }

      navigation.navigate('Visits', {reload: true});
    } catch (e: any) {
      const handled = applyApiValidationErrors(e);
      if (!handled) {
        setFieldError(
          'form',
          e?.message || (t('failedToSaveVisitsAndEvents') || 'Failed to save visits and events.'),
        );
        requestAnimationFrame(() => scrollToField('form'));
      }
    } finally {
      setSubmitting(false);
    }
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
            <Header title={`${t('edit') || 'Edit'} ${t('addVisits') || 'Add Visits'}`} showMenu={false} />

            <ScrollView
              ref={ref => {
                scrollRef.current = ref;
              }}

              contentContainerStyle={styles.scrollContent}>
              <View style={styles.form}>
                <View
                  style={[styles.summaryCard, {backgroundColor: C.surface, borderColor: C.border}]}
                  onLayout={e => setFieldPos('form', e.nativeEvent.layout.y)}>
                  <Text style={[styles.summaryTitle, {color: C.textPrimary}]}>
                    {`${t('visitsAndEventsInformationFor') || 'Visits and Events Information For'} : ${
                      visitorName || '-'
                    }${visitorRole ? `, ${visitorRole}` : ''}`}
                  </Text>
                  <Text style={[styles.summaryText, {color: C.textPrimary}]}>
                    {`${t('month') || 'Month'}: ${monthLabel}    ${t('year') || 'Year'}: ${
                      selectedYear || '-'
                    }`}
                  </Text>
                  {renderFieldError('form')}
                  {renderFieldError('user_id')}
                </View>

                {visitEntries.map((entry, index) => (
                  <View
                    key={`visit-${index}`}
                    style={[styles.card, {backgroundColor: C.surface, borderColor: C.border}]}>
                    <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                      {`${t('myVisitToChurch') || 'My Visit to Church'} ${index + 1}`}
                    </Text>

                    <View
                      style={styles.field}
                      onLayout={e => setFieldPos(`visit.${index}.country_id`, e.nativeEvent.layout.y)}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('nation') || 'Nation'}
                      </Text>
                      <ElementDropdown
                        data={countryOptions}
                        value={entry.country_id}
                        onChange={value => {
                          handleSelectVisitCountry(index, value as number);
                          clearInvalid(`visit.${index}.country_id`);
                          clearFieldError(`visit.${index}.country_id`);
                        }}
                        placeholder={t('selectNation') || 'Select nation'}
                        containerStyle={{
                          backgroundColor: C.inputBg,
                          borderColor: invalid[`visit.${index}.country_id`]
                            ? C.error || '#ff4444'
                            : C.inputBorder,
                        }}
                      />
                      {renderFieldError(`visit.${index}.country_id`)}
                    </View>

                    <View
                      style={styles.field}
                      onLayout={e => setFieldPos(`visit.${index}.city_id`, e.nativeEvent.layout.y)}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('city') || 'City'}
                      </Text>
                      <ElementDropdown
                        data={entry.cityOptions}
                        value={entry.city_id}
                        onChange={value => {
                          handleSelectVisitCity(index, value as number);
                          clearInvalid(`visit.${index}.city_id`);
                          clearFieldError(`visit.${index}.city_id`);
                        }}
                        placeholder={t('city') || 'City'}
                        containerStyle={{
                          backgroundColor: C.inputBg,
                          borderColor: invalid[`visit.${index}.city_id`]
                            ? C.error || '#ff4444'
                            : C.inputBorder,
                        }}
                      />
                      {renderFieldError(`visit.${index}.city_id`)}
                    </View>

                    <View
                      style={styles.field}
                      onLayout={e => setFieldPos(`visit.${index}.church_id`, e.nativeEvent.layout.y)}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('church') || 'Church'}
                      </Text>
                      <ElementDropdown
                        data={entry.churchOptions}
                        value={entry.church_id}
                        onChange={value =>
                          updateVisitEntry(index, current => ({
                            ...current,
                            church_id: value as number,
                          }))
                        }
                        placeholder={t('selectChurch') || 'Select church'}
                        containerStyle={{
                          backgroundColor: C.inputBg,
                          borderColor: invalid[`visit.${index}.church_id`]
                            ? C.error || '#ff4444'
                            : C.inputBorder,
                        }}
                      />
                      {renderFieldError(`visit.${index}.church_id`)}
                    </View>
                    <View onLayout={e => setFieldPos(`visit.${index}.weeks`, e.nativeEvent.layout.y)}>
                      {renderFieldError(`visit.${index}.weeks`)}
                    </View>

                    {weekColumns.map(column => (
                      <View key={`visit-${index}-week-${column.weekNumber}`} style={styles.field}>
                        <Text style={[styles.weekLabel, {color: C.textSecondary}]}>
                          {`wk${column.weekNumber}, ${selectedYear} (${column.rangeLabel})`}
                        </Text>
                        <AppInput
                          value={entry.daysByWeek[column.weekNumber]}
                          onChangeText={text =>
                            updateVisitEntry(index, current => ({
                              ...current,
                              daysByWeek: {
                                ...current.daysByWeek,
                                [column.weekNumber]: normalizePositiveIntegerInput(text),
                              },
                            }))
                          }
                          keyboardType="numeric"
                          placeholder={t('numberOfDays') || 'Number of Days'}
                        />
                      </View>
                    ))}
                  </View>
                ))}

                {eventEntries.map((entry, index) => (
                  <View
                    key={`event-${index}`}
                    style={[styles.card, {backgroundColor: C.surface, borderColor: C.border}]}>
                    <Text style={[styles.sectionTitle, {color: C.textPrimary}]}>
                      {`${t('myVisitToMyOrganisedEvent') || 'My Visit to My Organised Event'} ${
                        index + 1
                      }`}
                    </Text>

                    <View
                      style={styles.field}
                      onLayout={e => setFieldPos(`event.${index}.country_id`, e.nativeEvent.layout.y)}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('nation') || 'Nation'}
                      </Text>
                      <ElementDropdown
                        data={countryOptions}
                        value={entry.country_id}
                        onChange={value =>
                          updateEventEntry(index, current => ({
                            ...current,
                            country_id: value as number,
                          }))
                        }
                        placeholder={t('selectNation') || 'Select nation'}
                        containerStyle={{
                          backgroundColor: C.inputBg,
                          borderColor: invalid[`event.${index}.country_id`]
                            ? C.error || '#ff4444'
                            : C.inputBorder,
                        }}
                      />
                      {renderFieldError(`event.${index}.country_id`)}
                    </View>

                    <View
                      style={styles.field}
                      onLayout={e => setFieldPos(`event.${index}.event_type_id`, e.nativeEvent.layout.y)}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('eventType') || 'Event Type'}
                      </Text>
                      <ElementDropdown
                        data={eventTypeOptions}
                        value={entry.event_type_id}
                        onChange={value => {
                          clearInvalid(`event.${index}.attendance`);
                          clearInvalid(`event.${index}.meeting_with`);
                          clearFieldError(`event.${index}.attendance`);
                          clearFieldError(`event.${index}.meeting_with`);
                          updateEventEntry(index, current => ({
                            ...current,
                            event_type_id: value as number,
                            attendance: '',
                            meeting_with: null,
                          }));
                        }}
                        placeholder={t('eventType') || 'Event Type'}
                        containerStyle={{
                          backgroundColor: C.inputBg,
                          borderColor: invalid[`event.${index}.event_type_id`]
                            ? C.error || '#ff4444'
                            : C.inputBorder,
                        }}
                      />
                      {renderFieldError(`event.${index}.event_type_id`)}
                    </View>

                    {resolveEventMeetingType(
                      getSelectedEventType(entry.event_type_id)?.meeting_type,
                    ) === 'attendance' && (
                      <View
                        style={styles.field}
                        onLayout={e =>
                          setFieldPos(`event.${index}.attendance`, e.nativeEvent.layout.y)
                        }>
                        <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                          {t('eventAttendance') || 'Attendance'}
                        </Text>
                        <AppInput
                          value={entry.attendance}
                          error={!!invalid[`event.${index}.attendance`]}
                          onChangeText={text =>
                            updateEventEntry(index, current => ({
                              ...current,
                              attendance: normalizePositiveIntegerInput(text),
                            }))
                          }
                          keyboardType="numeric"
                          placeholder="0"
                        />
                        {renderFieldError(`event.${index}.attendance`)}
                      </View>
                    )}

                    {resolveEventMeetingType(
                      getSelectedEventType(entry.event_type_id)?.meeting_type,
                    ) === 'meeting_with' && (
                      <View
                        style={styles.field}
                        onLayout={e =>
                          setFieldPos(`event.${index}.meeting_with`, e.nativeEvent.layout.y)
                        }>
                        <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                          {t('eventMeetingWith') || 'Meeting With'}
                        </Text>
                        <ElementDropdown
                          data={userOptions}
                          value={entry.meeting_with}
                          onChange={value =>
                            updateEventEntry(index, current => ({
                              ...current,
                              meeting_with: value as number,
                            }))
                          }
                          placeholder={t('selectMeetingWith') || 'Select person'}
                          containerStyle={{
                            backgroundColor: C.inputBg,
                            borderColor: invalid[`event.${index}.meeting_with`]
                              ? C.error || '#ff4444'
                              : C.inputBorder,
                          }}
                        />
                        {renderFieldError(`event.${index}.meeting_with`)}
                      </View>
                    )}

                    <View
                      style={styles.field}
                      onLayout={e => setFieldPos(`event.${index}.name`, e.nativeEvent.layout.y)}>
                      <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                        {t('nameTheEvent') || 'Name the Event'}
                      </Text>
                      <AppInput
                        value={entry.name}
                        error={!!invalid[`event.${index}.name`]}
                        onChangeText={text =>
                          updateEventEntry(index, current => ({
                            ...current,
                            name: text,
                          }))
                        }
                        placeholder={t('name') || 'Name'}
                      />
                      {renderFieldError(`event.${index}.name`)}
                    </View>
                    <View onLayout={e => setFieldPos(`event.${index}.weeks`, e.nativeEvent.layout.y)}>
                      {renderFieldError(`event.${index}.weeks`)}
                    </View>

                    {weekColumns.map(column => (
                      <View key={`event-${index}-week-${column.weekNumber}`} style={styles.field}>
                        <Text style={[styles.weekLabel, {color: C.textSecondary}]}>
                          {`wk${column.weekNumber}, ${selectedYear} (${column.rangeLabel})`}
                        </Text>
                        <AppInput
                          value={entry.daysByWeek[column.weekNumber]}
                          onChangeText={text =>
                            updateEventEntry(index, current => ({
                              ...current,
                              daysByWeek: {
                                ...current.daysByWeek,
                                [column.weekNumber]: normalizePositiveIntegerInput(text),
                              },
                            }))
                          }
                          keyboardType="numeric"
                          placeholder={t('numberOfDays') || 'Number of Days'}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.actions, {borderTopColor: C.border}]}>
              <CancelButton label={t('back') || 'Back'} onPress={() => navigation.goBack()} disabled={submitting} />
              <SaveButton
                label={submitting ? t('saving') || 'Saving...' : t('save') || 'Save'}
                onPress={onSave}
                disabled={submitting}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  form: {
    marginTop: ms(8),
    gap: ms(16),
  },
  card: {
    marginTop: ms(8),
  },
  summaryCard: {
    marginTop: ms(8),
  },
  summaryTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    lineHeight: fs(22),
    marginBottom: ms(8),
  },
  summaryText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(12),
  },
  field: {
    marginBottom: ms(12),
  },
  fieldLabel: {
    fontSize: fs(14),
    fontWeight: '500',
    marginBottom: ms(6),
  },
  weekLabel: {
    fontSize: fs(12),
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

export default EditVisitDetailsScreen;

