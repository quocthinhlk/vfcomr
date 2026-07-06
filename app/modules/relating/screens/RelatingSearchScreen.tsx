import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {SaveButton} from '../../../shared/components/ActionButtons';
import AppButton from '../../../shared/components/AppButton';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import AppInput from '../../../shared/components/AppInput';
import api from '../../../config/api';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
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

const getErrorMessage = (
  error: any,
  fallbackMessage: string,
  statusFailedMessage: string,
): string => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.message;
  if (status && apiMessage) return `(${status}) ${apiMessage}`;
  if (status) return `${statusFailedMessage} ${status}`;
  if (apiMessage) return String(apiMessage);
  return error?.message || fallbackMessage;
};

const getValidationErrors = (
  error: any,
): Record<string, string> | null => {
  const errors = error?.response?.data?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return null;
  }
  const normalized: Record<string, string> = {};
  Object.keys(errors).forEach(key => {
    const value = errors[key];
    if (typeof value === 'string' && value.trim()) {
      normalized[key] = value.trim();
    }
  });
  return Object.keys(normalized).length ? normalized : null;
};

export default function RelatingSearchScreen() {
  const navigation = useNavigation<any>();
  const C = useThemedColors();
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

  const loadCountries = useCallback(async (keyword?: string) => {
    try {
      setLoadingCountries(true);
      const data = await searchRelatingCountries({
        page: 1,
        limit: 10,
        name: keyword ?? '',
      });
      setCountries(data);
    } catch {
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  const loadCities = useCallback(async (countryId: number) => {
    try {
      setLoadingCities(true);
      const data = await listCitiesByCountry(countryId);
      setCities(data);
    } catch {
      setCities([]);
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
        const userId = res?.data?.data?.id;
        if (mounted && typeof userId === 'number') {
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
    } catch (error) {
      Alert.alert(t('error'), getErrorMessage(error, t('unknownError'), t('requestFailedWithStatus')));
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
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        const hasEmailError = !!validationErrors.email;
        setShowEditProfileForEmailError(hasEmailError);
        setFieldErrors(prev => ({
          ...prev,
          name: validationErrors.name || prev.name,
          email: validationErrors.email || prev.email,
          subject: validationErrors.subject || prev.subject,
          message: validationErrors.message || prev.message,
        }));
        setSubmitError('');
        return;
      }
      Alert.alert(t('error'), getErrorMessage(error, t('unknownError'), t('requestFailedWithStatus')));
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
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
>
          <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
            <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
              {t('search')}
            </Text>
            <Text style={[styles.subtitle, {color: C.textSecondary}]}>
              {t('relatingSearchSubtitle')}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, {color: C.textSecondary}]}>
                {t('country')}
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
              ) : null}
            </View>

            {selectedCountryId ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('city')}
                </Text>
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
            <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
              <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
                {t('searchResult')}
              </Text>
              <Text style={[styles.resultText, {color: C.textPrimary}]}>
                {result.message || '-'}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('name')}
                </Text>
                <AppInput
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
                  error={!!fieldErrors.name}
                  containerStyle={styles.input}
                />
                {fieldErrors.name ? (
                  <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.name}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('email')}
                </Text>
                <AppInput
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
                  error={!!fieldErrors.email}
                  containerStyle={styles.input}
                />
                {fieldErrors.email ? (
                  <>
                    <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>
                      {fieldErrors.email}
                    </Text>
                    {showEditProfileForEmailError && currentUserId ? (
                      <AppButton
                        variant="gray"
                        style={styles.editProfileButton}
                        onPress={() =>
                          navigation.navigate('EditProfile', {id: currentUserId})
                        }>
                        {t('editProfile')}
                      </AppButton>
                    ) : null}
                  </>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('omrSupportSubjectLabel')}
                </Text>
                <AppInput
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
                  error={!!fieldErrors.subject}
                  containerStyle={styles.input}
                />
                {fieldErrors.subject ? (
                  <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{fieldErrors.subject}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, {color: C.textSecondary}]}>
                  {t('omrSupportMessageLabel')}
                </Text>
                <AppInput
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

              <SaveButton
                label={sendingRequest ? t('sendingRequest') : t('sendRequest')}
                onPress={onSubmitRequest}
                disabled={sendingRequest}
                style={styles.searchButton}
              />
              {submitError ? (
                <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{submitError}</Text>
              ) : null}
            </View>
          ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  scroll: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(20),
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    marginBottom: ms(12),
  },
  cardTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(6),
  },
  subtitle: {
    fontSize: fs(12),
    lineHeight: fs(16),
    marginBottom: ms(12),
  },
  fieldGroup: {
    marginBottom: ms(12),
  },
  label: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  helperText: {
    marginTop: ms(6),
    fontSize: fs(12),
  },
  errorText: {
    marginTop: ms(6),
    fontSize: fs(12),
  },
  editProfileButton: {
    marginTop: ms(10),
  },
  searchButtonWrap: {
    marginTop: ms(2),
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
    fontSize: fs(13),
    lineHeight: fs(18),
    marginBottom: ms(10),
  },
  requiredMessage: {
    fontSize: fs(12),
    lineHeight: fs(18),
    marginBottom: ms(12),
  },
  reasonInput: {
    height: hs(100),
    textAlignVertical: 'top',
    paddingTop: ms(10),
  },
  input: {
    width: '100%',
    minHeight: hs(40),
  },
});
