import React, {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  ScrollView,
  View,
  Image,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {Formik, type FormikProps} from 'formik';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles, FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import {addUser, uploadUserPhoto} from '../services/user.service';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {useNavigation} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {CountryPicker} from 'react-native-country-codes-picker';
import api from '../../../config/api';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {authImages} from '../../auth/config/auth.constants';
import {getChurchesList} from '../../church/services/church.service';
import HelpIcon from '../../../shared/components/HelpIcon';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';
import {ROLES} from '../../../shared/utils/permissions';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {useLatestRequest} from '../../church/hooks/useLatestRequest';
import {
  fillTemplate,
  formatYmd,
  splitApiFieldErrors,
} from '../../church/utils/churchForm';

/** Sentinel value for credentials dropdown when user has no credential type. */
const CREDENTIALS_NONE_VALUE = 'No';

const hasCredentialsSelection = (credentials: string) =>
  !!credentials && credentials !== CREDENTIALS_NONE_VALUE;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields that show their API error under the input; other API errors go to an alert. */
const FIELDS_WITH_ERROR_TEXT = new Set([
  'username',
  'password',
  'title',
  'first_name',
  'last_name',
  'role_id',
  'sensitive_nation',
  'language_id',
  'church_id',
  'country_id',
  'email_address',
  'mobile_phone',
]);

/** Scroll order of the form, for jumping to the first invalid field. */
const FIELD_ORDER = [
  'first_name', 'last_name', 'username', 'password', 'title', 'role_id',
  'sensitive_nation', 'language_id', 'church_id', 'country_id',
  'email_address', 'mobile_phone',
];

const countryCodeToFlag = (code: string) => {
  if (!code) {
    return '🏳️';
  }
  const chars = code.toUpperCase().split('');
  if (chars.length !== 2) {
    return '🏳️';
  }
  const base = 127397;
  return String.fromCodePoint(
    base + chars[0].charCodeAt(0),
    base + chars[1].charCodeAt(0),
  );
};

interface FormDataApi {
  success: boolean;
  data: {
    roles: {id: number; name: string}[];
    languages: {id: number; name: string}[];
    countries: {id: number; name: string}[];
    prefixes: string[];
    credentials: string[];
  };
}

export default function AddUserScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();

  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  const [prefixOptions, setPrefixOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<{id: number; name: string}[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{id: number; name: string}[]>([]);
  const [credentialOptions, setCredentialOptions] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState<string>('SG');
  const [callingCode, setCallingCode] = useState<string>('65');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [churchItems, setChurchItems] = useState<{id: number; name: string}[]>([]);
  const [churchTotal, setChurchTotal] = useState<number>(0);
  const [churchPage, setChurchPage] = useState<number>(1);
  const [churchQuery, setChurchQuery] = useState<string>('');
  const [countryItems, setCountryItems] = useState<{id: number; name: string}[]>([]);
  const [countryTotal, setCountryTotal] = useState<number>(0);
  const [countryPage, setCountryPage] = useState<number>(1);
  const [countryQuery, setCountryQuery] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const credentialDropdownData = useMemo(
    () => [
      {label: t('no'), value: CREDENTIALS_NONE_VALUE},
      ...credentialOptions.map(c => ({label: c, value: c})),
    ],
    [credentialOptions, t],
  );

  const prefixDropdownData = useMemo(
    () => prefixOptions.map(p => ({label: p, value: p})),
    [prefixOptions],
  );
  const roleDropdownData = useMemo(
    () => roleOptions.map(r => ({label: r.name, value: r.id})),
    [roleOptions],
  );
  const languageDropdownData = useMemo(
    () => languageOptions.map(o => ({label: o.name, value: o.id})),
    [languageOptions],
  );
  const churchDropdownData = useMemo(
    () => churchItems.map(c => ({label: c.name, value: c.id})),
    [churchItems],
  );
  const countryDropdownData = useMemo(
    () => countryItems.map(c => ({label: c.name, value: c.id})),
    [countryItems],
  );

  // A retried save reuses the photo already uploaded for the same file.
  const uploadedPhotoRef = useRef<{source: string; path: string} | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const formikRef = useRef<FormikProps<any> | null>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrorText, setFieldErrorText] = useState<Record<string, string>>({});

  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({y: Math.max(0, y - ms(20)), animated: true});
  };
  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));
  const clearFieldError = (key: string) =>
    setFieldErrorText(prev => {
      if (!prev[key]) {
        return prev;
      }
      const next = {...prev};
      delete next[key];
      return next;
    });

  const requiredFieldMessageForKey = (key: string) => {
    const labelByKey: Record<string, string> = {
      username: t('username') || 'Username',
      password: t('password') || 'Password',
      title: t('ministryTitle') || 'Ministry Title',
      first_name: t('firstName') || 'First Name',
      last_name: t('lastName') || 'Last Name',
      role_id: t('omrStatus') || 'OMR Status',
      sensitive_nation: t('inSensitiveNation') || 'Sensitive Nation',
      language_id: t('language') || 'Language',
      church_id: t('church') || 'Church',
      country_id: t('nation') || 'Nation',
      email_address: t('emailAddress') || 'Email Address',
      mobile_phone: t('mobilePhone') || 'Mobile Phone',
    };
    const label = labelByKey[key] || key;
    return fillTemplate(t('fieldIsRequired'), {field: label});
  };

  const renderFieldError = (key: string) => {
    const msg = fieldErrorText[key];
    if (!msg) {
      return null;
    }
    return (
      <Text style={{marginTop: ms(6), color: '#db2d2d', fontSize: ms(12)}}>
        {msg}
      </Text>
    );
  };

  const formatPhoneReadable = (digits: string) => {
    if (!digits) {
      return '';
    }
    const only = digits.replace(/\D/g, '').slice(0, 15);
    return only.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  // Church and nation are required: if their first page fails (e.g. offline)
  // the form can't be completed, so it joins the retryable error below.
  // A failed search / next page just keeps the current list.
  const [churchesError, setChurchesError] = useState<unknown>(null);
  const [countriesError, setCountriesError] = useState<unknown>(null);

  // Searches are debounced, and only the latest request per list may update
  // it: a slow answer for an older query can't replace the newer results.
  const {begin, debounce} = useLatestRequest();
  const churchBusyRef = useRef(false);
  const countryBusyRef = useRef(false);

  const loadChurches = useCallback(async (page: number, query = '') => {
    const q = query.trim();
    const isInitial = page === 1 && !q;
    const isLatest = begin('churches');
    churchBusyRef.current = true;
    try {
      const data = await getChurchesList({
        page,
        limit: DEFAULT_PAGE_LIMIT,
        search: q || undefined,
        sort_by: 'name',
        sort_desc: false,
      });
      if (!isLatest()) {
        return;
      }
      const items = (data?.items ?? []).map((c: any) => ({id: c.id, name: c.name}));
      setChurchItems(prev => {
        if (page === 1) {
          return items;
        }
        const seen = new Set(prev.map(c => c.id));
        return [...prev, ...items.filter(c => !seen.has(c.id))];
      });
      setChurchTotal(data?.total ?? items.length);
      setChurchPage(data?.page ?? page);
      if (isInitial) {
        setChurchesError(null);
      }
    } catch (e) {
      if (isLatest() && isInitial) {
        setChurchesError(e);
      }
    } finally {
      if (isLatest()) {
        churchBusyRef.current = false;
      }
    }
  }, [begin]);

  const loadCountries = useCallback(async (page: number, query = '') => {
    const q = query.trim();
    const isInitial = page === 1 && !q;
    const isLatest = begin('countries');
    countryBusyRef.current = true;
    try {
      const res = await api.get('/countries', {
        params: {
          page,
          limit: DEFAULT_PAGE_LIMIT,
          name: q || undefined,
          sort_by: 'name',
          sort_desc: false,
        },
      });
      if (!isLatest()) {
        return;
      }
      const data = res?.data?.data;
      const items = Array.isArray(data?.items) ? data.items : [];
      const mapped: {id: number; name: string}[] = items.map((c: any) => ({id: c.id, name: c.name}));
      setCountryItems(prev => {
        if (page === 1) {
          return mapped;
        }
        const seen = new Set(prev.map(c => c.id));
        return [...prev, ...mapped.filter(c => !seen.has(c.id))];
      });
      setCountryTotal(data?.total ?? mapped.length);
      setCountryPage(data?.page ?? page);
      if (isInitial) {
        setCountriesError(null);
      }
    } catch (e) {
      if (isLatest() && isInitial) {
        setCountriesError(e);
      }
    } finally {
      if (isLatest()) {
        countryBusyRef.current = false;
      }
    }
  }, [begin]);

  const searchChurches = (text: string) => {
    setChurchQuery(text);
    if (!text.trim()) {
      loadChurches(1);
      return;
    }
    debounce('churchSearch', () => loadChurches(1, text));
  };
  const searchCountries = (text: string) => {
    setCountryQuery(text);
    if (!text.trim()) {
      loadCountries(1);
      return;
    }
    debounce('countrySearch', () => loadCountries(1, text));
  };

  // users/form-data (roles) and language-regions feed required fields; if
  // either fails the form can't be submitted, so show a retryable error.
  const [formDataError, setFormDataError] = useState<unknown>(null);
  const [languagesError, setLanguagesError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const loadFormData = () =>
    api
      .get<FormDataApi>('/users/form-data')
      .then(res => {
        if (!mountedRef.current) {
          return;
        }
        const d = res.data?.data;
        setPrefixOptions(d?.prefixes || []);
        setRoleOptions(d?.roles || []);
        setCredentialOptions(d?.credentials || []);
        setFormDataError(null);
      })
      .catch(e => {
        if (mountedRef.current) {
          setFormDataError(e);
        }
      });

  const loadLanguages = () =>
    api
      .get('/language-regions', {params: {sort_by: 'name', sort_desc: false}})
      .then(res => {
        if (!mountedRef.current) {
          return;
        }
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const roots = arr.filter((x: any) => x.parent_id == null && !x.disabled);
        setLanguageOptions(roots.map((x: any) => ({id: x.id, name: x.name})));
        setLanguagesError(null);
      })
      .catch(e => {
        if (mountedRef.current) {
          setLanguagesError(e);
        }
      });

  const optionsError =
    formDataError || languagesError || churchesError || countriesError;
  const retryOptions = () =>
    Promise.all([
      formDataError ? loadFormData() : null,
      languagesError ? loadLanguages() : null,
      churchesError ? loadChurches(1) : null,
      countriesError ? loadCountries(1) : null,
    ]);

  useEffect(() => {
    mountedRef.current = true;
    loadFormData();
    loadLanguages();
    loadChurches(1);
    loadCountries(1);
    return () => {
      mountedRef.current = false;
    };
    // Mount only: the loaders are re-run individually by Retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pastorLeader = roleOptions.find(r => r?.id === ROLES.PASTOR_LEADER);
    if (!pastorLeader) {
      return;
    }
    const currentRoleId = formikRef.current?.values?.role_id;
    if (currentRoleId == null) {
      formikRef.current?.setFieldValue('role_id', pastorLeader.id);
      clearInvalid('role_id');
      clearFieldError('role_id');
    }
  }, [roleOptions]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('addNewPastor')} showMenu={false} />
        {optionsError ? (
          <ApiErrorState error={optionsError} onRetry={retryOptions} />
        ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={
            Platform.OS === 'ios' ? hs(64) : (StatusBar.currentHeight || 0) + hs(50)
          }
          style={{flex: 1}}>
          <ScrollView
            ref={scrollRef}

            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="always"
            contentContainerStyle={{paddingBottom: ms(24)}}>
            <Formik
              innerRef={ref => {
                formikRef.current = (ref as any) || null;
              }}
              initialValues={{
                username: '',
                password: '',
                title: '',
                prefix: '',
                first_name: '',
                last_name: '',
                role_id: null as number | null,
                user_photo: '',
                sensitive_nation: false,
                language_id: null as number | null,
                email_address: '',
                mobile_phone: '',
                credentials: CREDENTIALS_NONE_VALUE,
                credentials_number: '',
                credentials_from: '',
                credentials_expiry_date: null as Date | null,
                church_id: null as number | null,
                country_id: null as number | null,
              }}
              onSubmit={async values => {
                setFieldErrorText({});
                const sens = !!values.sensitive_nation;
                const email = values.email_address.trim();
                const newInvalid: Record<string, boolean> = {};
                newInvalid.username = !values.username.trim();
                newInvalid.password = !values.password;
                newInvalid.title = !values.title.trim();
                newInvalid.first_name = !values.first_name.trim();
                newInvalid.last_name = !values.last_name.trim();
                newInvalid.role_id = values.role_id == null;
                newInvalid.language_id = values.language_id == null;
                newInvalid.church_id = values.church_id == null;
                newInvalid.country_id = values.country_id == null;
                if (!sens) {
                  newInvalid.email_address = !email;
                  newInvalid.mobile_phone = !values.mobile_phone;
                }

                const newFieldErrors: Record<string, string> = {};
                Object.keys(newInvalid).forEach(k => {
                  if (newInvalid[k]) {
                    newFieldErrors[k] = requiredFieldMessageForKey(k);
                  }
                });
                if (email && !EMAIL_PATTERN.test(email)) {
                  newInvalid.email_address = true;
                  newFieldErrors.email_address = t('invalidEmailFormat');
                }
                setInvalid(newInvalid);
                setFieldErrorText(newFieldErrors);

                const firstInvalidKey = FIELD_ORDER.find(k => newInvalid[k]);
                if (firstInvalidKey) {
                  scrollToField(firstInvalidKey);
                  return;
                }

                const formattedPhone = (() => {
                  const digits = (values.mobile_phone || '').replace(/\D/g, '');
                  return digits ? `+${callingCode}${digits}` : '';
                })();

                const withCredentials = hasCredentialsSelection(values.credentials);
                const payload = {
                  username: values.username.trim(),
                  password: values.password,
                  prefix: values.prefix,
                  title: values.title.trim(),
                  first_name: values.first_name.trim(),
                  last_name: values.last_name.trim(),
                  role_id: values.role_id,
                  user_photo: '',
                  sensitive_nation: sens,
                  language_id: values.language_id,
                  church_id: values.church_id,
                  country_id: values.country_id,
                  email_address: email,
                  mobile_phone: formattedPhone,
                  credentials: withCredentials ? values.credentials : '',
                  credentials_number: withCredentials ? values.credentials_number.trim() : '',
                  credentials_from: withCredentials ? values.credentials_from.trim() : '',
                  credentials_expiry_date: withCredentials
                    ? formatYmd(values.credentials_expiry_date)
                    : null,
                };

                try {
                  // A photo that fails to upload stops the save (it used to be
                  // dropped silently, creating the user without it).
                  if (imagePath && uploadedPhotoRef.current?.source === imagePath) {
                    payload.user_photo = uploadedPhotoRef.current.path;
                  } else if (imagePath) {
                    try {
                      payload.user_photo = await uploadUserPhoto(
                        imagePath,
                        `${payload.first_name} ${payload.last_name}`,
                      );
                    } catch (uploadError: any) {
                      Alert.alert(
                        t('error'),
                        uploadError?.response?.data?.message || t('photoUploadFailed'),
                      );
                      return;
                    }
                    uploadedPhotoRef.current = {source: imagePath, path: payload.user_photo};
                  }

                  const saveResponse = await addUser(payload);
                  markDataChanged('users');
                  const warning =
                    typeof saveResponse?.warning === 'string'
                      ? saveResponse.warning.trim()
                      : '';
                  // Back to the list (replacing this form) instead of pushing a
                  // second list on top of the filled-in form.
                  const navigateAfterSave = () => navigation.popTo('UserList');
                  Alert.alert(t('success'), warning || t('userCreatedSuccess'), [
                    {text: t('ok'), onPress: navigateAfterSave},
                  ], {cancelable: false});
                } catch (error: any) {
                  const apiMessage = error?.response?.data?.message;
                  const {fieldErrors, otherMessages} = splitApiFieldErrors(
                    error?.response?.data?.errors,
                    FIELDS_WITH_ERROR_TEXT,
                  );
                  const fieldKeys = Object.keys(fieldErrors);
                  if (fieldKeys.length) {
                    setInvalid(prev => ({
                      ...prev,
                      ...Object.fromEntries(fieldKeys.map(k => [k, true])),
                    }));
                    setFieldErrorText(fieldErrors);
                    scrollToField(FIELD_ORDER.find(k => fieldErrors[k]) ?? fieldKeys[0]);
                  }
                  if (otherMessages.length || !fieldKeys.length) {
                    Alert.alert(
                      t('error'),
                      otherMessages.join('\n') || apiMessage || t('couldNotCreateUser'),
                    );
                  }
                }
              }}>
              {({handleChange, handleBlur, handleSubmit, values, setFieldValue, isSubmitting}) => (
                <View style={{gap: ms(12)}}>

                  {/* Prefix */}
                  <View onLayout={e => setFieldPos('prefix', e.nativeEvent.layout.y)}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('prefix')}
                    </Text>
                    <ElementDropdown
                      data={prefixDropdownData}
                      value={values.prefix as any}
                      onChange={v => setFieldValue('prefix', (v as string) || '')}
                      placeholder={t('selectOption')}
                      containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                    />
                  </View>

                  {/* First Name */}
                  <View onLayout={e => setFieldPos('first_name', e.nativeEvent.layout.y)}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('firstName')} <Text style={{color: '#c00000'}}>*</Text>
                    </Text>
                    <AppInput
                      value={values.first_name}
                      autoCapitalize="words"
                      onChangeText={(v: string) => {
                        setFieldValue('first_name', v);
                        clearInvalid('first_name');
                        clearFieldError('first_name');
                      }}
                      onBlur={handleBlur('first_name')}
                      error={!!invalid.first_name}
                    />
                    {renderFieldError('first_name')}
                  </View>

                  {/* Last Name */}
                  <View onLayout={e => setFieldPos('last_name', e.nativeEvent.layout.y)}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('lastName')} <Text style={{color: '#c00000'}}>*</Text>
                    </Text>
                    <AppInput
                      value={values.last_name}
                      autoCapitalize="words"
                      onChangeText={(v: string) => {
                        setFieldValue('last_name', v);
                        clearInvalid('last_name');
                        clearFieldError('last_name');
                      }}
                      onBlur={handleBlur('last_name')}
                      error={!!invalid.last_name}
                    />
                    {renderFieldError('last_name')}
                  </View>

                  {/* Username */}
                  <View onLayout={e => setFieldPos('username', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('username')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('username')} message={t('usernameHelp')} />
                    </View>
                    <AppInput
                      value={values.username}
                      autoCapitalize="none"
                      onChangeText={(v: string) => {
                        setFieldValue('username', v);
                        clearInvalid('username');
                        clearFieldError('username');
                      }}
                      onBlur={handleBlur('username')}
                      error={!!invalid.username}
                    />
                    {renderFieldError('username')}
                  </View>

                  {/* Password */}
                  <View onLayout={e => setFieldPos('password', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('password')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('password')} message={t('passwordHelp')} />
                    </View>
                    <View style={{position: 'relative'}}>
                      <AppInput
                        secureTextEntry={!showPassword}
                        value={values.password}
                        autoCapitalize="none"
                        autoComplete="off"
                        textContentType="none"
                        importantForAutofill="no"
                        autoCorrect={false}
                        onChangeText={(v: string) => {
                          setFieldValue('password', v);
                          clearInvalid('password');
                          clearFieldError('password');
                        }}
                        onBlur={handleBlur('password')}
                        error={!!invalid.password}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: ms(12),
                          top: ms(10),
                          height: hs(24),
                          width: ws(24),
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                        }}>
                        <Image
                          source={showPassword ? authImages.eye : authImages.blind}
                          style={{width: ws(20), height: hs(20), resizeMode: 'contain'}}
                        />
                      </TouchableOpacity>
                    </View>
                    {renderFieldError('password')}
                  </View>

                  {/* Ministry Title */}
                  <View onLayout={e => setFieldPos('title', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('titleOfChurchRole')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('ministryTitle')} message={t('helpMinistryTitle')} />
                    </View>
                    <AppInput
                      value={values.title}
                      autoCapitalize="words"
                      onChangeText={(v: string) => {
                        setFieldValue('title', v);
                        clearInvalid('title');
                        clearFieldError('title');
                      }}
                      onBlur={handleBlur('title')}
                      error={!!invalid.title}
                    />
                    {renderFieldError('title')}
                  </View>

                  {/* OMR Status */}
                  <View onLayout={e => setFieldPos('role_id', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('omrStatus')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('omrStatus')} message={t('helpOmrStatus')} />
                    </View>
                    <ElementDropdown
                      data={roleDropdownData}
                      value={values.role_id as any}
                      onChange={v => {
                        setFieldValue('role_id', (typeof v === 'number' ? v : Number(v)) || null);
                        clearInvalid('role_id');
                        clearFieldError('role_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={{
                        borderColor: invalid.role_id ? '#db2d2d' : C.inputBorder,
                        backgroundColor: C.inputBg,
                      } as any}
                      error={!!invalid.role_id}
                    />
                    {renderFieldError('role_id')}
                  </View>

                  {/* User Photo */}
                  <View onLayout={e => setFieldPos('user_photo', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('userPhoto')}
                        <Text style={formStyles.subLabel}> [{t('max5mb')}]</Text>
                      </Text>
                      <HelpIcon title={t('userPhoto')} message={t('helpUserPhoto')} />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleImagePick()}
                      style={[formStyles.avatarSquare as any, {backgroundColor: C.inputBg, borderColor: C.inputBorder}] as any}>
                      {imagePath ? (
                        <>
                          <Image
                            source={{uri: imagePath}}
                            style={formStyles.avatarImage as any}
                            resizeMode="cover"
                          />
                          <TouchableOpacity onPress={clearImage} style={formStyles.avatarClose as any}>
                            <Text style={{color: '#fff'}}>✗</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={[formStyles.avatarPlus as any, {color: C.textSecondary}] as any}>+</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Sensitive Nation */}
                  <View onLayout={e => setFieldPos('sensitive_nation', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('inSensitiveNation')}
                      </Text>
                      <HelpIcon title={t('sensitiveNation')} message={t('helpSensitiveNation')} />
                    </View>
                    <ElementDropdown
                      data={[{label: t('yes'), value: 'Yes'}, {label: t('no'), value: 'No'}]}
                      value={values.sensitive_nation ? 'Yes' : 'No'}
                      onChange={v => {
                        setFieldValue('sensitive_nation', v === 'Yes');
                      clearInvalid('sensitive_nation');
                      clearFieldError('sensitive_nation');
                        if (v === 'Yes') {
                          clearInvalid('email_address');
                          clearInvalid('mobile_phone');
                          clearFieldError('email_address');
                          clearFieldError('mobile_phone');
                        }
                      }}
                      placeholder={t('selectOption')}
                    containerStyle={{
                      backgroundColor: C.inputBg,
                      borderColor: invalid.sensitive_nation ? '#db2d2d' : C.inputBorder,
                    } as any}
                    error={!!invalid.sensitive_nation}
                    />
                  {renderFieldError('sensitive_nation')}
                  </View>

                  {/* Language */}
                  <View onLayout={e => setFieldPos('language_id', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('theLanguageOmrWillUseForYou')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('language')} message={t('helpUserLanguage')} />
                    </View>
                    <ElementDropdown
                      data={languageDropdownData}
                      value={values.language_id as any}
                      onChange={v => {
                        setFieldValue('language_id', (typeof v === 'number' ? v : Number(v)) || null);
                        clearInvalid('language_id');
                        clearFieldError('language_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={{
                        borderColor: invalid.language_id ? '#db2d2d' : C.inputBorder,
                        backgroundColor: C.inputBg,
                      } as any}
                      error={!!invalid.language_id}
                    />
                    {renderFieldError('language_id')}
                  </View>

                  {/* Church */}
                  <View onLayout={e => setFieldPos('church_id', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('churchBelongsTo')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('church')} message={t('helpUserChurch')} />
                    </View>
                    <ElementDropdown
                      data={churchDropdownData}
                      value={values.church_id as any}
                      onChange={v => {
                        setFieldValue('church_id', (typeof v === 'number' ? v : Number(v)) || null);
                        clearInvalid('church_id');
                        clearFieldError('church_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={{
                        borderColor: invalid.church_id ? '#db2d2d' : C.inputBorder,
                        backgroundColor: C.inputBg,
                      } as any}
                      error={!!invalid.church_id}
                      onSearchText={searchChurches}
                      onEndReached={() => {
                        const next = churchPage + 1;
                        const maxPages = Math.max(1, Math.ceil(churchTotal / DEFAULT_PAGE_LIMIT));
                        if (!churchBusyRef.current && next <= maxPages) {
                          loadChurches(next, churchQuery);
                        }
                      }}
                    />
                    {renderFieldError('church_id')}
                  </View>

                  {/* Nation */}
                  <View onLayout={e => setFieldPos('country_id', e.nativeEvent.layout.y)}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('nation') || 'Nation'} <Text style={{color: '#c00000'}}>*</Text>
                    </Text>
                    <ElementDropdown
                      data={countryDropdownData}
                      value={(values as any).country_id as any}
                      onChange={v => {
                        setFieldValue('country_id', (typeof v === 'number' ? v : Number(v)) || null);
                        clearInvalid('country_id');
                        clearFieldError('country_id');
                      }}
                      placeholder={t('selectCountry') || t('selectOption')}
                      containerStyle={{
                        borderColor: invalid.country_id ? '#db2d2d' : C.inputBorder,
                        backgroundColor: C.inputBg,
                      } as any}
                      error={!!invalid.country_id}
                      onSearchText={searchCountries}
                      onEndReached={() => {
                        const next = countryPage + 1;
                        const maxPages = Math.max(1, Math.ceil(countryTotal / DEFAULT_PAGE_LIMIT));
                        if (!countryBusyRef.current && next <= maxPages) {
                          loadCountries(next, countryQuery);
                        }
                      }}
                    />
                    {renderFieldError('country_id')}
                  </View>

                  {/* Email Address */}
                  <View onLayout={e => setFieldPos('email_address', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('emailAddress')}{' '}
                        {!values.sensitive_nation ? <Text style={{color: '#c00000'}}>*</Text> : null}
                      </Text>
                      <HelpIcon title={t('emailAddress')} message={t('infoEmailAddress')} />
                    </View>
                    <AppInput
                      value={values.email_address}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onChangeText={(v: string) => {
                        setFieldValue('email_address', v);
                        clearInvalid('email_address');
                        clearFieldError('email_address');
                      }}
                      onBlur={handleBlur('email_address')}
                      error={!!invalid.email_address}
                    />
                    {renderFieldError('email_address')}
                  </View>

                  {/* Mobile Phone */}
                  <View onLayout={e => setFieldPos('mobile_phone', e.nativeEvent.layout.y)}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('mobilePhone')}{' '}
                      {!values.sensitive_nation ? <Text style={{color: '#c00000'}}>*</Text> : null}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderRadius: rs(3),
                        paddingLeft: ms(8),
                        paddingRight: ms(12),
                        height: FORM_INPUT_HEIGHT,
                        borderColor: invalid.mobile_phone ? '#db2d2d' : C.inputBorder,
                        backgroundColor: C.inputBg,
                      }}>
                      {/* Flag + calling code are one button: most people tap the code. */}
                      <TouchableOpacity
                        onPress={() => setShowCountryPicker(true)}
                        activeOpacity={0.6}
                        accessibilityRole="button"
                        accessibilityLabel={`+${callingCode}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          alignSelf: 'stretch',
                          gap: ms(6),
                          paddingRight: ms(10),
                          borderRightWidth: StyleSheet.hairlineWidth,
                          borderRightColor: C.inputBorder,
                        }}>
                        <Text style={{fontSize: fs(18)}}>{countryCodeToFlag(countryCode)}</Text>
                        <Text style={{fontSize: fs(14), color: C.textPrimary}}>+{callingCode}</Text>
                        <Text style={{fontSize: fs(10), color: C.textSecondary}}>▼</Text>
                      </TouchableOpacity>
                      <TextInput
                        allowFontScaling={false}
                        style={{
                          flex: 1,
                          marginLeft: ms(8),
                          fontSize: fs(14),
                          color: C.inputText,
                          paddingVertical: 0,
                        }}
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        value={formatPhoneReadable(values.mobile_phone)}
                        onChangeText={v => {
                          const digits = v.replace(/\D/g, '').slice(0, 15);
                          setFieldValue('mobile_phone', digits);
                          clearInvalid('mobile_phone');
                          clearFieldError('mobile_phone');
                        }}
                        placeholder=""
                      />
                    </View>
                    <CountryPicker
                      show={showCountryPicker}
                      lang={'en'}
                      pickerButtonOnPress={item => {
                        setCountryCode(item.code);
                        setCallingCode(item.dial_code.replace('+', ''));
                        setShowCountryPicker(false);
                      }}
                      onBackdropPress={() => setShowCountryPicker(false)}
                      inputPlaceholderTextColor={C.textSecondary}
                      style={{
                        backdrop: {backgroundColor: C.overlay},
                        modal: {backgroundColor: C.surface},
                        modalInner: {backgroundColor: C.surface},
                        textInput: {color: C.inputText, backgroundColor: C.inputBg},
                        line: {backgroundColor: C.inputBorder},
                        itemsList: {backgroundColor: C.surface},
                        searchMessageText: {color: C.textSecondary},
                        countryName: {color: C.textPrimary},
                        dialCode: {color: C.textSecondary},
                        countryButtonStyles: {backgroundColor: C.bgSelectedOption},
                        flag: {color: C.textPrimary},
                      }}
                    />
                    {renderFieldError('mobile_phone')}
                  </View>

                  {/* Credentials */}
                  <View onLayout={e => setFieldPos('credentials', e.nativeEvent.layout.y)}>
                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                      {t('credentials')}
                    </Text>
                    <ElementDropdown
                      data={credentialDropdownData}
                      value={(values.credentials as string) || CREDENTIALS_NONE_VALUE}
                      onChange={v => {
                        const next = (v as string) || CREDENTIALS_NONE_VALUE;
                        setFieldValue('credentials', next);
                        if (!hasCredentialsSelection(next)) {
                          setFieldValue('credentials_number', '');
                          setFieldValue('credentials_from', '');
                          setFieldValue('credentials_expiry_date', null);
                        }
                        clearInvalid('credentials');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                    />
                  </View>

                  {hasCredentialsSelection(values.credentials) && (
                    <>
                      {/* Credentials Number */}
                      <View onLayout={e => setFieldPos('credentials_number', e.nativeEvent.layout.y)}>
                        <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                          {t('credentialsNumber')}
                        </Text>
                        <AppInput
                          value={values.credentials_number}
                          autoCapitalize="none"
                          onChangeText={handleChange('credentials_number')}
                          onBlur={handleBlur('credentials_number')}
                        />
                      </View>

                      {/* Credentials From */}
                      <View onLayout={e => setFieldPos('credentials_from', e.nativeEvent.layout.y)}>
                        <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                          {t('credentialsFrom')}
                        </Text>
                        <AppInput
                          value={values.credentials_from}
                          autoCapitalize="none"
                          onChangeText={handleChange('credentials_from')}
                          onBlur={handleBlur('credentials_from')}
                        />
                      </View>

                      {/* Credentials Expiry */}
                      <View onLayout={e => setFieldPos('credentials_expiry_date', e.nativeEvent.layout.y)}>
                        <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                          {t('credentialsExpiry')}
                        </Text>
                        <DateTripleDropdown
                          value={values.credentials_expiry_date}
                          onChange={d => setFieldValue('credentials_expiry_date', d)}
                          yearRange={50}
                        />
                      </View>
                    </>
                  )}

                  {/* Save Button */}
                  <AppButton
                    onPress={() => handleSubmit()}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    variant="primary"
                    style={globalStyles.mainButton}>
                    {t('save')}
                  </AppButton>

                </View>
              )}
            </Formik>
          </ScrollView>
        </KeyboardAvoidingView>
        )}
      </Layout>
    </SafeAreaView>
  );
}
