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
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {SaveButton, CancelButton} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import api from '../../../config/api';
import {useLanguage} from '../../../shared/context/LanguageContext';

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

type YearOption = {label: string; value: number};
type CountOption = {label: string; value: number};
type VisitorOption = {
  label: string;
  value: number;
  name: string;
  role: string;
  title: string;
};

const buildVisitorLabel = (user: {
  name?: string;
  title?: string;
  city_name?: string;
}) => {
  // Dropdown should show only visitor name (no role/title/city).
  return user.name || '-';
};

const resolveRoleName = (user: any) =>
  user?.role_name || user?.role?.name || user?.role?.role_name || '';

export const AddVisitsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const {selectedLanguage} = useLanguage();
  const C = useThemedColors();

  const scrollRef = useRef<ScrollView | null>(null);
  const fieldPosRef = useRef<Record<string, number>>({});

  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [visitorOptions, setVisitorOptions] = useState<VisitorOption[]>([]);
  const [visitorName, setVisitorName] = useState('');
  const [visitorRole, setVisitorRole] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [churchVisitCount, setChurchVisitCount] = useState<number | null>(0);
  const [eventCount, setEventCount] = useState<number | null>(0);

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
  }, [selectedLanguage]);

  const yearOptions = useMemo<YearOption[]>(() => {
    const maxYear = new Date().getFullYear() + 1;
    return Array.from({length: maxYear - 1900 + 1}, (_, i) => {
      const year = maxYear - i;
      return {label: String(year), value: year};
    });
  }, []);

  const countOptions = useMemo<CountOption[]>(
    () =>
      Array.from({length: 10000}, (_, index) => ({
        label: String(index),
        value: index,
      })),
    [],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [meRes, visitorsRes] = await Promise.all([
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
        ]);

        if (!mounted) {
          return;
        }

        const me = meRes?.data?.data;
        const meId = typeof me?.id === 'number' ? me.id : null;
        const meName =
          (me?.name && String(me.name).trim()) ||
          `${me?.first_name || ''} ${me?.last_name || ''}`.trim() ||
          '';
        const meTitle = (me?.title && String(me.title).trim()) || '';
        const meCityName = (me?.city_name && String(me.city_name).trim()) || '';
        const visitorItems = (visitorsRes?.data?.data?.items ?? []) as any[];

        const mappedVisitors: VisitorOption[] = visitorItems.map(item => ({
          label: buildVisitorLabel(item),
          value: item.id,
          name: item.name || '',
          role: resolveRoleName(item),
          title: item.title || '',
        }));

        if (meId && !mappedVisitors.some(option => option.value === meId)) {
          mappedVisitors.unshift({
            label: buildVisitorLabel({name: meName, title: meTitle, city_name: meCityName}),
            value: meId,
            name: meName,
            role: resolveRoleName(me),
            title: meTitle,
          });
        }

        const selectedVisitor =
          mappedVisitors.find(option => option.value === meId) || mappedVisitors[0] || null;

        setVisitorOptions(mappedVisitors);
        setUserId(selectedVisitor?.value ?? meId);
        setVisitorName(selectedVisitor?.name || '');
        setVisitorRole(selectedVisitor?.role || '');
      } catch (error) {
        console.error('Failed to load visit/event setup:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const clearInvalid = (key: string) => {
    setInvalid(prev => ({...prev, [key]: false}));
  };

  const setFieldError = (key: string, message: string) => {
    setFieldErrors(prev => ({...prev, [key]: message}));
    setInvalid(prev => ({...prev, [key]: true}));
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

    if (!selectedMonth || !selectedYear) {
      if (!selectedMonth) {
        nextInvalid.selectedMonth = true;
        nextErrors.selectedMonth = t('pleaseSelectYearAndMonth') || 'Please select year and month';
      }
      if (!selectedYear) {
        nextInvalid.selectedYear = true;
        nextErrors.selectedYear = t('pleaseSelectYearAndMonth') || 'Please select year and month';
      }
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

    navigation.navigate('AddVisitsDetails', {
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{flex: 1}}>
        <View style={{flex: 1, backgroundColor: C.background}}>
          <View style={styles.container}>
            <Header title={t('addVisits') || 'Add Visits'} showMenu={false} />

            <ScrollView
              ref={ref => {
                scrollRef.current = ref;
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.border}]}>
                <Text style={[styles.headingTitle, {color: C.textPrimary}]}>
                  {`${t('visitsAndEventsInformationFor') || 'Visits and Events Information For'} : ${
                    visitorName || '-'
                  }`}
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
                  <ElementDropdown
                    data={countOptions}
                    value={churchVisitCount}
                    onChange={value => {
                      setChurchVisitCount(value as number);
                      clearInvalid('churchVisitCount');
                      clearFieldError('churchVisitCount');
                    }}
                    placeholder="0"
                    containerStyle={{
                      backgroundColor: C.inputBg,
                      borderColor: invalid.churchVisitCount ? C.error || '#ff4444' : C.inputBorder,
                    }}
                  />
                  {renderFieldError('churchVisitCount')}
                </View>

                <View
                  style={styles.field}
                  onLayout={e => setFieldPos('eventCount', e.nativeEvent.layout.y)}>
                  <Text style={[styles.fieldLabel, {color: C.textSecondary}]}>
                    {t('numberOfEventsYouOrganised') || 'Number of Events You Organised'}
                  </Text>
                  <ElementDropdown
                    data={countOptions}
                    value={eventCount}
                    onChange={value => {
                      setEventCount(value as number);
                      clearInvalid('eventCount');
                      clearFieldError('eventCount');
                    }}
                    placeholder="0"
                    containerStyle={{
                      backgroundColor: C.inputBg,
                      borderColor: invalid.eventCount ? C.error || '#ff4444' : C.inputBorder,
                    }}
                  />
                  {renderFieldError('eventCount')}
                </View>
              </View>

              <View style={[styles.actions, {borderTopColor: C.border}]}>
                <CancelButton
                  label={t('cancel') || 'Cancel'}
                  onPress={() => navigation.goBack()}
                />
                <SaveButton
                  label={t('next') || 'Next'}
                  onPress={goToDetailStep}
                />
              </View>
            </ScrollView>

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
    paddingBottom: ms(8),
  },
  card: {
    marginTop: ms(8),
    borderRadius: rs(12),
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
    paddingTop: ms(8),
    paddingBottom: ms(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
  },
});

export default AddVisitsScreen;

