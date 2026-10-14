import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {SaveButton} from '../../../shared/components/ActionButtons';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import api from '../../../config/api';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  checkRelatingChurchExists,
  createRelatingSupportRequest,
  listCitiesByCountry,
  RelatingChurchExistsResponseData,
  RelatingCityItem,
  RelatingCountryItem,
  searchRelatingCountries,
} from '../services/relating.service';
import {
  getApiErrorMessage,
  getApiValidationErrors,
} from '../../../shared/utils/apiErrorHandler';

/** True only when the API explicitly asks the client to show Edit Profile. */
const shouldShowEditEmailButton = (error: any): boolean => {
  const errors = getApiValidationErrors(error);
  const flag =
    errors?.showEditEmailButton ?? error?.response?.data?.errors?.showEditEmailButton;
  return flag === true || flag === 'true' || flag === 1 || flag === '1';
};

export default function RelatingSearchScreen() {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
  const T = useUiTokens();
  const scrollRef = useRef<ScrollView>(null);
  // Contact form: scroll to it after a search, and chain the keyboard "next" key.
  const resultYRef = useRef(0);
  const emailRef = useRef<any>(null);
  const subjectRef = useRef<any>(null);
  const messageRef = useRef<any>(null);
  // y of each contact field inside the result card, to lift it above the keyboard.
  const fieldYRef = useRef<Record<string, number>>({});
  const trackField = (key: string) => (e: any) => {
    fieldYRef.current[key] = e.nativeEvent.layout.y;
  };
  const scrollFieldIntoView = (key: string) => {
    // Wait for the keyboard to finish opening (and the scroll inset to apply).
    setTimeout(() => {
      const y = resultYRef.current + (fieldYRef.current[key] ?? 0);
      scrollRef.current?.scrollTo({y: Math.max(0, y - ms(8)), animated: true});
    }, Platform.OS === 'ios' ? 300 : 150);
  };
  const {t} = useTranslation();
  const [countries, setCountries] = useState<RelatingCountryItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<RelatingCountryItem | null>(null);
  const [cities, setCities] = useState<RelatingCityItem[]>([]);
  const [selectedCity, setSelectedCity] = useState<RelatingCityItem | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [result, setResult] = useState<RelatingChurchExistsResponseData | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    country?: string;
    city?: string;
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  }>({});
  const [submitError, setSubmitError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showEditProfileForEmailError, setShowEditProfileForEmailError] =
    useState(false);
  const countryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Failure of the unfiltered country list that the whole form depends on.
  const [countriesLoadError, setCountriesLoadError] = useState<unknown>(null);
  // A failed keyword search keeps the current list and says why, instead of
  // looking like "no country matches".
  const [countrySearchError, setCountrySearchError] = useState<unknown>(null);
  // Without cities the form can't be completed: show a retryable error.
  const [citiesLoadError, setCitiesLoadError] = useState<unknown>(null);

  const loadCountries = useCallback(async (keyword?: string) => {
    try {
      setLoadingCountries(true);
      const data = await searchRelatingCountries({
        page: 1,
        limit: 10,
        name: keyword ?? '',
      });
      setCountries(data);
      setCountriesLoadError(null);
      setCountrySearchError(null);
    } catch (error) {
      if (keyword) {
        setCountrySearchError(error);
      } else {
        setCountries([]);
        setCountriesLoadError(error);
      }
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  const retryLoadCountries = useCallback(() => loadCountries(''), [loadCountries]);

  const loadCities = useCallback(async (countryId: number) => {
    try {
      setLoadingCities(true);
      setCitiesLoadError(null);
      const data = await listCitiesByCountry(countryId);
      setCities(data);
    } catch (error) {
      setCities([]);
      setCitiesLoadError(error);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    loadCountries('');
  }, [loadCountries]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('users/me');
        const rawId = res?.data?.data?.id;
        const userId = typeof rawId === 'number' ? rawId : Number(rawId);
        if (mounted && Number.isFinite(userId) && userId > 0) {
          setCurrentUserId(userId);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (countryDebounceRef.current) {
        clearTimeout(countryDebounceRef.current);
      }
    };
  }, []);

  const resetPage = useCallback(async () => {
    setSelectedCountry(null);
    setSelectedCountryId(null);
    setSelectedCity(null);
    setSelectedCityId(null);
    setCities([]);
    setCitiesLoadError(null);
    setResult(null);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setFieldErrors({});
    setSubmitError('');
    setShowEditProfileForEmailError(false);
    await loadCountries('');
  }, [loadCountries]);

  const countryOptions = useMemo(
    () => {
      const normalized = [...countries];
      // Keep selected option in list so dropdown can always render selected label.
      if (
        selectedCountry &&
        !normalized.some(item => item.id === selectedCountry.id)
      ) {
        normalized.unshift(selectedCountry);
      }
      return normalized.map(item => ({
        label: item.name,
        value: item.id,
      }));
    },
    [countries, selectedCountry],
  );

  const cityOptions = useMemo(
    () => {
      const normalized = [...cities];
      if (selectedCity && !normalized.some(item => item.id === selectedCity.id)) {
        normalized.unshift(selectedCity);
      }
      return normalized.map(item => ({
        label: item.name,
        value: item.id,
      }));
    },
    [cities, selectedCity],
  );

  const onSearchCountry = (keyword: string) => {
    if (countryDebounceRef.current) {
      clearTimeout(countryDebounceRef.current);
    }
    countryDebounceRef.current = setTimeout(() => {
      loadCountries(keyword.trim());
    }, 300);
  };

  const onChangeCountry = async (countryId: number | null) => {
    const sourceCountries =
      selectedCountry && !countries.some(item => item.id === selectedCountry.id)
        ? [selectedCountry, ...countries]
        : countries;
    const pickedCountry =
      sourceCountries.find(item => item.id === countryId) ?? null;
    setSelectedCountry(pickedCountry);
    setSelectedCountryId(countryId);
    setSelectedCity(null);
    setSelectedCityId(null);
    setCities([]);
    setResult(null);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setFieldErrors(prev => ({...prev, country: undefined, city: undefined}));
    setSubmitError('');
    setShowEditProfileForEmailError(false);
    if (countryId) {
      await loadCities(countryId);
    }
  };

  const onSearch = async () => {
    const nextErrors: {[key: string]: string} = {};
    if (selectedCountryId == null) {
      nextErrors.country = t('pleaseSelectCountry');
    }
    if (selectedCityId == null) {
      nextErrors.city = t('pleaseSelectCity');
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(prev => ({...prev, ...nextErrors}));
      return;
    }
    setSubmitError('');
    const countryId = selectedCountryId;
    const cityId = selectedCityId;
    if (countryId == null || cityId == null) {
      return;
    }

    try {
      setSearching(true);
      setFieldErrors(prev => ({...prev, country: undefined, city: undefined}));
      const data = await checkRelatingChurchExists({
        country_id: countryId,
        city_id: cityId,
      });
      setResult(data);
      // Bring the result + contact form into view once it has laid out.
      setTimeout(() => {
        scrollRef.current?.scrollTo({y: Math.max(0, resultYRef.current - ms(8)), animated: true});
      }, 250);
    } catch (error) {
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setSearching(false);
    }
  };

  const onSubmitRequest = async () => {
    const nextErrors: {[key: string]: string} = {};
    if (!selectedCountry || !selectedCity) {
      if (!selectedCountry) {
        nextErrors.country = t('pleaseSelectCountry');
      }
      if (!selectedCity) {
        nextErrors.city = t('pleaseSelectCity');
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(prev => ({...prev, ...nextErrors}));
      return;
    }
    setSubmitError('');
    const country = selectedCountry;
    const city = selectedCity;
    if (!country || !city) {
      return;
    }

    try {
      setSendingRequest(true);
      setShowEditProfileForEmailError(false);
      setFieldErrors(prev => ({
        ...prev,
        name: undefined,
        email: undefined,
        subject: undefined,
        message: undefined,
      }));
      await createRelatingSupportRequest({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      Alert.alert(t('success'), t('requestSentSuccess'), [
        {
          text: t('ok'),
          onPress: () => {
            resetPage();
          },
        },
      ]);
    } catch (error) {
      const validationErrors = getApiValidationErrors(error);
      if (validationErrors) {
        const showEdit = shouldShowEditEmailButton(error);
        setShowEditProfileForEmailError(showEdit);
        setFieldErrors(prev => ({
          ...prev,
          name: validationErrors.name || prev.name,
          email: validationErrors.email || prev.email,
          subject: validationErrors.subject || prev.subject,
          message: validationErrors.message || prev.message,
        }));
        setSubmitError('');
        // Ensure we have a user id ready for Edit Profile navigation.
        if (showEdit && currentUserId == null) {
          void (async () => {
            try {
              const res = await api.get('users/me');
              const rawId = res?.data?.data?.id;
              const userId = typeof rawId === 'number' ? rawId : Number(rawId);
              if (Number.isFinite(userId) && userId > 0) {
                setCurrentUserId(userId);
              }
            } catch {
              // ignore
            }
          })();
        }
        return;
      }
      Alert.alert(t('error'), getApiErrorMessage(error, t));
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('relating')} />
        {countriesLoadError && countries.length === 0 && !selectedCountry ? (
          <ApiErrorState error={countriesLoadError} onRetry={retryLoadCountries} />
        ) : (
        <View style={styles.keyboardWrap}>
          {/* iOS: the scroll view insets itself by the keyboard height so every
              field can scroll above it; Android resizes the window (adjustResize). */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets>
          <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
            <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
              {t('search')}
            </Text>
            <Text style={[styles.subtitle, {color: C.textSecondary}]}>
              {t('relatingSearchSubtitle')}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, {color: C.textSecondary}]}>
                {t('country')} <Text style={styles.required}>*</Text>
              </Text>
              <ElementDropdown
                data={countryOptions}
                value={selectedCountryId}
                onChange={value => onChangeCountry((value as number) ?? null)}
                placeholder={t('pleaseSelectCountry')}
                search
                onSearchText={onSearchCountry}
                containerStyle={
                  {
                    width: '100%',
                    backgroundColor: C.inputBg,
                    borderColor: C.inputBorder,
                  } as any
                }
                error={!!fieldErrors.country}
              />
              {fieldErrors.country ? (
                <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.country}</Text>
              ) : null}
              {loadingCountries ? (
                <Text style={[styles.helperText, {color: C.textSecondary}]}>
                  {t('loadingCountries')}
                </Text>
              ) : countrySearchError ? (
                <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>
                  {getApiErrorMessage(countrySearchError, t)}
                </Text>
              ) : null}
            </View>

            {selectedCountryId ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('city')} <Text style={styles.required}>*</Text>
                </Text>
                {citiesLoadError && !loadingCities ? (
                  <ApiErrorState
                    compact
                    error={citiesLoadError}
                    onRetry={() => loadCities(selectedCountryId)}
                  />
                ) : (
                <ElementDropdown
                  data={cityOptions}
                  value={selectedCityId}
                  onChange={value => {
                    const cityId = (value as number) ?? null;
                    const pickedCity = cities.find(item => item.id === cityId) ?? null;
                    setSelectedCity(pickedCity);
                    setSelectedCityId(cityId);
                    setFieldErrors(prev => ({...prev, city: undefined}));
                  }}
                  placeholder={t('pleaseSelectCity')}
                  search
                  containerStyle={
                  {
                    width: '100%',
                    backgroundColor: C.inputBg,
                    borderColor: C.inputBorder,
                  } as any
                }
                  error={!!fieldErrors.city}
                />
                )}
                {fieldErrors.city ? (
                  <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.city}</Text>
                ) : null}
                {loadingCities ? (
                  <Text style={[styles.helperText, {color: C.textSecondary}]}>
                    {t('loadingCities')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.searchButtonWrap}>
              <SaveButton
                label={searching ? t('searching') : t('search')}
                onPress={onSearch}
                disabled={searching}
                style={styles.searchButton}
              />
            </View>
          </View>

          {searching ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={COLORS.mainColor} />
            </View>
          ) : null}

          {result ? (
            <View
              onLayout={e => {
                resultYRef.current = e.nativeEvent.layout.y;
              }}
              style={[styles.card, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
              <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                {t('searchResult')}
              </Text>
              {/* Server message (e.g. "we will respond to your email…") as an info box. */}
              <View style={[styles.resultBox, {backgroundColor: T.brandTint, borderLeftColor: T.brandText}]}>
                <Text style={[styles.resultText, {color: C.textPrimary}]}>
                  {result.message || '-'}
                </Text>
              </View>
              <View style={[styles.divider, {backgroundColor: C.border}]} />

              <View style={styles.fieldGroup} onLayout={trackField('name')}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('name')} <Text style={styles.required}>*</Text>
                </Text>
                <AppInput
                  onFocus={() => scrollFieldIntoView('name')}
                  value={name}
                  onChangeText={value => {
                    setName(value);
                    if (value.trim()) {
                      setFieldErrors(prev => ({...prev, name: undefined}));
                    }
                    if (submitError) {
                      setSubmitError('');
                    }
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  error={!!fieldErrors.name}
                  containerStyle={styles.input}
                />
                {fieldErrors.name ? (
                  <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.name}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup} onLayout={trackField('email')}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('email')} <Text style={styles.required}>*</Text>
                </Text>
                <AppInput
                  ref={emailRef}
                  onFocus={() => scrollFieldIntoView('email')}
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    if (value.trim()) {
                      setFieldErrors(prev => ({...prev, email: undefined}));
                      setShowEditProfileForEmailError(false);
                    }
                    if (submitError) {
                      setSubmitError('');
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => subjectRef.current?.focus()}
                  error={!!fieldErrors.email}
                  containerStyle={styles.input}
                />
                {fieldErrors.email ? (
                  <View style={styles.emailErrorBlock}>
                    <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>
                      {fieldErrors.email}
                    </Text>
                    {showEditProfileForEmailError ? (
                      <TouchableOpacity
                        onPress={async () => {
                          let userId = currentUserId;
                          if (userId == null) {
                            try {
                              const res = await api.get('users/me');
                              const rawId = res?.data?.data?.id;
                              const parsed =
                                typeof rawId === 'number' ? rawId : Number(rawId);
                              if (Number.isFinite(parsed) && parsed > 0) {
                                userId = parsed;
                                setCurrentUserId(parsed);
                              }
                            } catch {
                              // ignore
                            }
                          }
                          if (userId == null) {
                            Alert.alert(t('error'), t('unknownError'));
                            return;
                          }
                          navigation.navigate('EditProfile', {id: userId});
                        }}
                        activeOpacity={0.7}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                        style={styles.editProfileLinkWrap}>
                        <Text style={styles.editProfileLink}>{t('editProfile')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View style={styles.fieldGroup} onLayout={trackField('subject')}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('omrSupportSubjectLabel')} <Text style={styles.required}>*</Text>
                </Text>
                <AppInput
                  ref={subjectRef}
                  onFocus={() => scrollFieldIntoView('subject')}
                  value={subject}
                  onChangeText={value => {
                    setSubject(value);
                    if (value.trim()) {
                      setFieldErrors(prev => ({...prev, subject: undefined}));
                    }
                    if (submitError) {
                      setSubmitError('');
                    }
                  }}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => messageRef.current?.focus()}
                  error={!!fieldErrors.subject}
                  containerStyle={styles.input}
                />
                {fieldErrors.subject ? (
                  <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.subject}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup} onLayout={trackField('message')}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('omrSupportMessageLabel')} <Text style={styles.required}>*</Text>
                </Text>
                <AppInput
                  ref={messageRef}
                  onFocus={() => scrollFieldIntoView('message')}
                  value={message}
                  onChangeText={value => {
                    setMessage(value);
                    if (value.trim()) {
                      setFieldErrors(prev => ({...prev, message: undefined}));
                    }
                    if (submitError) {
                      setSubmitError('');
                    }
                  }}
                  autoCapitalize="sentences"
                  autoCorrect
                  multiline
                  style={styles.reasonInput}
                  error={!!fieldErrors.message}
                  containerStyle={styles.input}
                />
                {fieldErrors.message ? (
                  <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.message}</Text>
                ) : null}
              </View>

              {submitError ? (
                <Text style={[styles.errorText, styles.submitError, {color: C.error || '#ff4444'}]}>
                  {submitError}
                </Text>
              ) : null}
              <SaveButton
                label={sendingRequest ? t('sendingRequest') : t('sendRequest')}
                onPress={onSubmitRequest}
                disabled={sendingRequest}
                style={styles.searchButton}
              />
            </View>
          ) : null}
          </ScrollView>
        </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  scroll: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(32),
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: rs(12),
    padding: ms(16),
    marginBottom: ms(16),
  },
  cardTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: ms(4),
  },
  subtitle: {
    fontSize: fs(13),
    lineHeight: fs(19),
    marginBottom: ms(16),
  },
  fieldGroup: {
    marginBottom: ms(14),
  },
  label: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(6),
  },
  required: {
    color: '#c00000',
  },
  resultBox: {
    marginTop: ms(8),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: rs(8),
    borderLeftWidth: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: ms(16),
  },
  submitError: {
    marginTop: 0,
    marginBottom: ms(10),
  },
  helperText: {
    marginTop: ms(6),
    fontSize: fs(12),
  },
  errorText: {
    marginTop: ms(6),
    fontSize: fs(12),
  },
  emailErrorBlock: {
    marginTop: ms(6),
  },
  editProfileLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: ms(4),
  },
  editProfileLink: {
    fontSize: fs(12),
    fontWeight: '600',
    color: COLORS.mainColor,
    textAlign: 'right',
  },
  searchButtonWrap: {
    marginTop: ms(4),
  },
  searchButton: {
    width: '100%',
    minHeight: hs(40),
  },
  loadingWrap: {
    alignItems: 'center',
    marginBottom: ms(12),
  },
  resultText: {
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  requiredMessage: {
    fontSize: fs(12),
    lineHeight: fs(18),
    marginBottom: ms(12),
  },
  reasonInput: {
    height: hs(120),
    textAlignVertical: 'top',
    paddingTop: ms(10),
  },
  input: {
    width: '100%',
    minHeight: hs(40),
  },
});
