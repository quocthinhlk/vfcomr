import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  ActivityIndicator,
  View,
  ScrollView,
  TextInput,
  Image,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {CountryPicker} from 'react-native-country-codes-picker';
import {resolveByCallingCodePrefix} from '../config/phone';
import {formStyles} from '../../../shared/styles/form';
import {getChurchesList} from '../../church/services/church.service';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {getUserById, updateUser, uploadUserPhoto} from '../services/user.service';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {Formik, FormikProps} from 'formik';
import HelpIcon from '../../../shared/components/HelpIcon';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs, hs, ws} from '../../../shared/utils/scale';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {LockIcon, MailIcon} from '../../../shared/components/icons/UiIcons';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {COLORS} from '../../../shared/constants/colors';
import {useLatestRequest} from '../../church/hooks/useLatestRequest';
import {
  fillTemplate,
  formatYmd,
  parseYmd,
  splitApiFieldErrors,
} from '../../church/utils/churchForm';

/** Sentinel value for the credentials dropdown when the user has no credential type. */
const CREDENTIALS_NONE_VALUE = 'No';

const hasCredentialsSelection = (credentials: string) =>
  !!credentials && credentials !== CREDENTIALS_NONE_VALUE;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields that show their API error under the input; other API errors go to an alert. */
const FIELDS_WITH_ERROR_TEXT = new Set([
  'username',
  'title',
  'first_name',
  'last_name',
  'role_id',
  'language_id',
  'church_id',
  'email_address',
  'mobile_phone',
]);

/** Scroll order of the form, for jumping to the first invalid field. */
const FIELD_ORDER = [
  'first_name', 'last_name', 'username', 'title', 'role_id',
  'language_id', 'church_id', 'email_address', 'mobile_phone',
];

/** Coerce API ids (number | string) to number for dropdown value matching. */
function parseNullableId(v: unknown): number | null {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

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

export default function EditProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const T = useUiTokens();
  // After ChangeEmail succeeds it returns here with the new address: show it
  // in the email field without resetting the user's other unsaved edits.
  const formikRef = useRef<FormikProps<any>>(null);
  const emailChangedTo: string | undefined = route.params?.emailChangedTo;
  useEffect(() => {
    if (emailChangedTo) {
      formikRef.current?.setFieldValue('email_address', emailChangedTo);
    }
  }, [emailChangedTo]);
  const userId = Number(route.params?.id);
  const {t} = useTranslation();
  const C = useThemedColors();

  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  const scrollRef = useRef<ScrollView>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrorText, setFieldErrorText] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<any | null>(null);
  const emailLocked = !!String(initial?.email_address ?? '').trim();

  const [prefixOptions, setPrefixOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<{id: number; name: string}[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{id: number; name: string}[]>([]);
  const [credentialOptions, setCredentialOptions] = useState<string[]>([]);

  const [countryCode, setCountryCode] = useState<string>('SG');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [callingCode, setCallingCode] = useState<string>('65');

  const [churchItems, setChurchItems] = useState<{id: number; name: string}[]>([]);
  const [churchTotal, setChurchTotal] = useState<number>(0);
  const [churchPage, setChurchPage] = useState<number>(1);
  const [churchQuery, setChurchQuery] = useState<string>('');

  /** The selected church, kept in `churchItems` even when it is not on the loaded page. */
  const userChurchForDropdownRef = useRef<{id: number; name: string} | null>(null);

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));
  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({y: Math.max(0, y - ms(20)), animated: true});
  };
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
      title: t('ministryTitle') || 'Ministry Title',
      first_name: t('firstName') || 'First Name',
      last_name: t('lastName') || 'Last Name',
      role_id: t('omrStatus') || 'OMR Status',
      language_id: t('language') || 'Language',
      church_id: t('church') || 'Church',
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
    const only = String(digits).replace(/\D/g, '').slice(0, 15);
    return only.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  // Searches are debounced, and only the latest request may update the list:
  // a slow answer for an older query can't replace the newer results.
  const {begin, debounce} = useLatestRequest();
  const churchBusyRef = useRef(false);

  const loadChurches = useCallback(async (page: number, query = '') => {
    const q = query.trim();
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
      const items = (data?.items ?? []).map((c: any) => ({
        id: Number(c.id),
        name: String(c.name ?? ''),
      }));
      setChurchItems(prev => {
        if (page !== 1) {
          const seen = new Set(prev.map(c => c.id));
          return [...prev, ...items.filter(c => !seen.has(c.id))];
        }
        // Keep the selected church in the list even when it is not on this
        // page or in the search results, so the field keeps showing its name.
        const seed = userChurchForDropdownRef.current;
        return seed && !items.some(c => c.id === seed.id) ? [seed, ...items] : items;
      });
      setChurchTotal(data?.total ?? items.length);
      setChurchPage(data?.page ?? page);
    } catch {
      // A failed search / next page keeps the current list.
    } finally {
      if (isLatest()) {
        churchBusyRef.current = false;
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

  // Prefill (user + form-data) failed: show a retryable error instead of a
  // blank, savable form (was an Alert + empty form).
  const [loadError, setLoadError] = useState<unknown>(null);
  const loadTokenRef = useRef(0);

  const loadProfile = useCallback(async () => {
    const token = ++loadTokenRef.current;
    const isCurrent = () => token === loadTokenRef.current;
      try {
        const [form, userRes] = await Promise.all([
          api.get('/users/form-data'),
          getUserById(userId),
        ]);
        if (!isCurrent()) {
          return;
        }
        const d = form.data?.data || {};
        const formRoles: {id: number; name: string}[] = Array.isArray(d?.roles)
          ? d.roles.map((r: any) => ({
              id: Number(r.id),
              name: String(r.name ?? ''),
            }))
          : [];
        setPrefixOptions(d?.prefixes || []);
        setCredentialOptions(d?.credentials || []);

        // Language is required: a failure goes to the retryable load error
        // instead of an empty Language dropdown.
        const lg = await api.get('/language-regions', {params: {sort_by: 'name', sort_desc: false}});
        if (!isCurrent()) {
          return;
        }
        const arr = Array.isArray(lg.data?.data) ? lg.data.data : [];
        const roots = arr.filter((x: any) => x.parent_id == null && !x.disabled);
        setLanguageOptions(roots.map((x: any) => ({id: Number(x.id), name: String(x.name ?? '')})));

        // Support both `{ data: user }` and occasional `{ data: { data: user } }` envelopes.
        let u: any = (userRes as any)?.data ?? userRes;
        if (u && u.username == null && u.data && typeof u.data === 'object' && u.data.username != null) {
          u = u.data;
        }

        const roleIdResolved = parseNullableId(
          u?.role?.id ?? u?.role_id ?? (u as any)?.Role?.id ?? (u as any)?.omr_role_id,
        );
        const roleNameFromUser = String(
          u?.role?.name ?? (u as any)?.role_name ?? (u as any)?.roleName ?? '',
        ).trim();
        let mergedRoles = formRoles;
        if (roleIdResolved != null && !mergedRoles.some(r => r.id === roleIdResolved)) {
          mergedRoles = [
            {
              id: roleIdResolved,
              name: roleNameFromUser || `Role #${roleIdResolved}`,
            },
            ...formRoles,
          ];
        }
        setRoleOptions(mergedRoles);

        const churchIdResolved = parseNullableId(
          u?.church_id ?? u?.church?.id ?? (u as any)?.default_church_id,
        );
        const churchNameResolved = String(
          (u as any)?.church_name ?? u?.church?.name ?? '',
        ).trim();

        const rawDigits = (u?.mobile_phone || '').replace(/\D/g, '');
        let resolvedCca2: string | undefined;
        let resolvedCode: string | undefined;
        let subscriberDigits = '';
        if (!rawDigits) {
          subscriberDigits = '';
        } else {
          const got = resolveByCallingCodePrefix(rawDigits);
          if (got.callingCode) {
            resolvedCode = got.callingCode;
          }
          if (got.cca2) {
            resolvedCca2 = got.cca2;
          }
          if (resolvedCode) {
            subscriberDigits = rawDigits.slice(resolvedCode.length);
          } else {
            resolvedCode = rawDigits.slice(0, 2);
            subscriberDigits = rawDigits.slice(2);
          }
          if (resolvedCca2) {
            setCountryCode(resolvedCca2);
          }
          if (resolvedCode) {
            setCallingCode(resolvedCode);
          }
        }

        setInitial({
          username: u?.username || '',
          password: '',
          prefix: u?.prefix || '',
          title: (u as any)?.title || '',
          first_name: u?.first_name || '',
          last_name: u?.last_name || '',
          role_id: roleIdResolved,
          user_photo: u?.user_photo || '',
          photo_url: (u as any)?.photo_url || '',
          sensitive_nation: !!u?.sensitive_nation,
          language_id: parseNullableId(u?.language_id),
          church_id: churchIdResolved,
          email_address: u?.email_address || '',
          mobile_phone: subscriberDigits,
          credentials: u?.credentials || CREDENTIALS_NONE_VALUE,
          credentials_number: u?.credentials_number || '',
          credentials_from: u?.credentials_from || '',
          // parseYmd: `new Date('2026-05-10')` is UTC midnight, the previous
          // day west of UTC, so every save moved the expiry a day earlier.
          credentials_expiry_date: parseYmd(u?.credentials_expiry_date),
        });

        userChurchForDropdownRef.current =
          churchIdResolved != null && churchNameResolved
            ? {id: churchIdResolved, name: churchNameResolved}
            : churchIdResolved != null
              ? {id: churchIdResolved, name: `Church #${churchIdResolved}`}
              : null;

        setLoadError(null);
        await loadChurches(1);
      } catch (e: any) {
        if (isCurrent()) {
          setLoadError(e);
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
  }, [userId, loadChurches]);

  useEffect(() => {
    loadProfile();
    return () => {
      // Invalidate the in-flight request (unmount / user change).
      loadTokenRef.current += 1;
    };
  }, [loadProfile]);

  const prefixDropdownData = useMemo(
    () => prefixOptions.map(p => ({label: p, value: p})),
    [prefixOptions],
  );
  const credentialDropdownData = useMemo(
    () => [
      {label: t('no'), value: CREDENTIALS_NONE_VALUE},
      ...credentialOptions
        .filter(c => c !== CREDENTIALS_NONE_VALUE)
        .map(c => ({label: c, value: c})),
    ],
    [credentialOptions, t],
  );
  // A retried save reuses the photo already uploaded for the same file.
  const uploadedPhotoRef = useRef<{source: string; path: string} | null>(null);
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

  if (loadError && !initial) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
          <Header title={t('editUser')} showMenu={false} />
          <ApiErrorState error={loadError} onRetry={loadProfile} />
        </Layout>
      </SafeAreaView>
    );
  }

  if (loading || !initial) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
          <Header title={t('editUser')} showMenu={false} />
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        </Layout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('editUser')} showMenu={false} />
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
            contentContainerStyle={{paddingBottom: 24}}>
            <Formik
              innerRef={formikRef}
              enableReinitialize
              initialValues={initial}
              onSubmit={async values => {
                setFieldErrorText({});
                const sens = !!values.sensitive_nation;
                const email = String(values.email_address || '').trim();
                const newInvalid: Record<string, boolean> = {};
                newInvalid.username = !String(values.username || '').trim();
                newInvalid.title = !String(values.title || '').trim();
                newInvalid.first_name = !String(values.first_name || '').trim();
                newInvalid.last_name = !String(values.last_name || '').trim();
                newInvalid.role_id = values.role_id == null;
                newInvalid.language_id = values.language_id == null;
                newInvalid.church_id = values.church_id == null;
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
                if (email && !emailLocked && !EMAIL_PATTERN.test(email)) {
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
                const payload: any = {
                  username: String(values.username).trim(),
                  prefix: values.prefix,
                  title: String(values.title).trim(),
                  first_name: String(values.first_name).trim(),
                  last_name: String(values.last_name).trim(),
                  role_id: values.role_id,
                  sensitive_nation: sens,
                  language_id: values.language_id,
                  church_id: values.church_id,
                  email_address: email,
                  mobile_phone: formattedPhone,
                  credentials: withCredentials ? values.credentials : '',
                  credentials_number: withCredentials
                    ? String(values.credentials_number || '').trim()
                    : '',
                  credentials_from: withCredentials
                    ? String(values.credentials_from || '').trim()
                    : '',
                  credentials_expiry_date: withCredentials
                    ? formatYmd(values.credentials_expiry_date)
                    : null,
                };

                try {
                  if (imagePath && uploadedPhotoRef.current?.source === imagePath) {
                    payload.user_photo = uploadedPhotoRef.current.path;
                  } else if (imagePath) {
                    // A photo that fails to upload stops the save (it used to be
                    // dropped silently and the old photo kept).
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
                  } else if (initial?.user_photo && !values.user_photo && !values.photo_url) {
                    // The existing photo was removed with ✗.
                    payload.user_photo = null;
                  }

                  const response = await updateUser(userId, payload);
                  markDataChanged('users');
                  const warning =
                    typeof response?.warning === 'string' ? response.warning.trim() : '';
                  Alert.alert(
                    t('success'),
                    warning || response?.message || t('profileUpdatedSuccess'),
                    [{text: t('ok'), onPress: () => returnAfterEdit(navigation)}],
                    {cancelable: false},
                  );
                } catch (error: any) {
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
                      otherMessages.join('\n') ||
                        error?.response?.data?.message ||
                        t('couldNotUpdateUser'),
                    );
                  }
                }
              }}>
              {({values, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting}) => (
                <View style={{gap: ms(12)}}>

                  {/* Sign-in settings: two compact buttons side by side, above the form fields. */}
                  <View style={styles.accountRow}>
                    {[
                      {
                        key: 'password',
                        Icon: LockIcon,
                        label: t('changePassword'),
                        onPress: () => navigation.navigate('ChangePasswordForOtherUser', {id: userId}),
                      },
                      {
                        key: 'email',
                        Icon: MailIcon,
                        label: t('changeEmail'),
                        onPress: () =>
                          navigation.navigate('ChangeEmail', {id: userId, email: values.email_address}),
                      },
                    ].map(item => (
                      <Pressable
                        key={item.key}
                        onPress={item.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        style={({pressed}) => [
                          styles.accountButton,
                          {backgroundColor: pressed ? T.pressedBg : T.brandTint},
                        ]}>
                        <item.Icon color={T.brandText} size={ws(16)} />
                        <Text
                          style={[styles.accountButtonText, {color: T.brandText}]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

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
                      onChangeText={v => {
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
                      onChangeText={v => {
                        setFieldValue('last_name', v);
                        clearInvalid('last_name');
                        clearFieldError('last_name');
                      }}
                      onBlur={handleBlur('last_name')}
                      error={!!invalid.last_name}
                    />
                    {renderFieldError('last_name')}
                  </View>

                  {/* Username (read-only) */}
                  <View onLayout={e => setFieldPos('username', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('username')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('username')} message={t('usernameHelp')} size={16} offsetY={-2} />
                    </View>
                    <AppInput
                      value={values.username}
                      autoCapitalize="none"
                      editable={false}
                      onChangeText={v => {
                        setFieldValue('username', v);
                        clearInvalid('username');
                        clearFieldError('username');
                      }}
                      onBlur={handleBlur('username')}
                      error={!!invalid.username}
                    />
                    {renderFieldError('username')}
                  </View>

                  {/* Ministry Title */}
                  <View onLayout={e => setFieldPos('title', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('titleOfChurchRole')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('ministryTitle')} message={t('helpMinistryTitle')} size={16} offsetY={-2} />
                    </View>
                    <AppInput
                      value={values.title}
                      autoCapitalize="words"
                      onChangeText={v => {
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
                      <HelpIcon title={t('omrStatus')} message={t('helpOmrStatus')} size={16} offsetY={-2} />
                    </View>
                    <ElementDropdown
                      key={`role-${roleOptions.length > 0}`}
                      data={roleDropdownData}
                      value={values.role_id as any}
                      onChange={v => {
                        const roleId = (typeof v === 'number' ? v : Number(v)) || null;
                        setFieldValue('role_id', roleId);
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
                      <HelpIcon title={t('userPhoto')} message={t('helpUserPhoto')} size={16} offsetY={-2} />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleImagePick()}
                      style={[formStyles.avatarSquare as any, {backgroundColor: C.inputBg, borderColor: C.inputBorder}] as any}>
                      {imagePath || (values as any).photo_url || values.user_photo ? (
                        <>
                          <Image
                            source={
                              imagePath
                                ? {uri: imagePath}
                                : (values as any).photo_url
                                ? {uri: (values as any).photo_url}
                                : values.user_photo && values.user_photo.startsWith('http')
                                ? ({uri: values.user_photo} as any)
                                : (undefined as any)
                            }
                            style={formStyles.avatarImage as any}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => {
                              clearImage();
                              setFieldValue('user_photo', '');
                              setFieldValue('photo_url', '');
                            }}
                            style={formStyles.avatarClose as any}>
                            <Text style={{color: '#fff'}}>✗</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Image
                          source={require('../../../../app/assets/images/blank-avatar.png')}
                          style={formStyles.avatarImage as any}
                          resizeMode="cover"
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Sensitive Nation */}
                  <View onLayout={e => setFieldPos('sensitive_nation', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('inSensitiveNation')}
                      </Text>
                      <HelpIcon title={t('sensitiveNation')} message={t('helpSensitiveNation')} size={16} offsetY={-2} />
                    </View>
                    <ElementDropdown
                      data={[{label: t('yes'), value: 'Yes'}, {label: t('no'), value: 'No'}]}
                      value={values.sensitive_nation ? 'Yes' : 'No'}
                      onChange={v => {
                        setFieldValue('sensitive_nation', v === 'Yes');
                        if (v === 'Yes') {
                          clearInvalid('email_address');
                          clearInvalid('mobile_phone');
                          clearFieldError('email_address');
                          clearFieldError('mobile_phone');
                        }
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                    />
                  </View>

                  {/* Language */}
                  <View onLayout={e => setFieldPos('language_id', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('theLanguageOmrWillUseForYou')} <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon title={t('language')} message={t('helpUserLanguage')} size={16} offsetY={-2} />
                    </View>
                    <ElementDropdown
                      key={`language-${languageOptions.length > 0}`}
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
                      <HelpIcon title={t('church')} message={t('helpUserChurch')} size={16} offsetY={-2} />
                    </View>
                    <ElementDropdown
                      key={`church-${churchItems.length > 0}`}
                      data={churchDropdownData}
                      value={values.church_id as any}
                      onChange={v => {
                        const id = (typeof v === 'number' ? v : Number(v)) || null;
                        userChurchForDropdownRef.current =
                          churchItems.find(c => c.id === id) ?? null;
                        setFieldValue('church_id', id);
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

                  {/* Email Address */}
                  <View onLayout={e => setFieldPos('email_address', e.nativeEvent.layout.y)}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                        {t('emailAddress')}{' '}
                        {!values.sensitive_nation ? <Text style={{color: '#c00000'}}>*</Text> : null}
                      </Text>
                      <HelpIcon title={t('emailAddress')} message={t('infoEmailAddress')} size={16} offsetY={-2} />
                    </View>
                    {/* Locked once the profile has an email: it changes only through
                        Change Email (current email + password). An empty one stays
                        editable so a required email can still be filled in. */}
                    <AppInput
                      value={values.email_address}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!emailLocked}
                      selectTextOnFocus={false}
                      accessibilityState={{disabled: emailLocked}}
                      containerStyle={emailLocked ? {backgroundColor: T.neutralTint} : undefined}
                      style={emailLocked ? {color: C.textSecondary} : undefined}
                      onChangeText={v => {
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
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    flexDirection: 'row',
    gap: ms(8),
  },
  accountButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
    paddingHorizontal: ms(8),
    borderRadius: rs(10),
  },
  accountButtonText: {
    flexShrink: 1,
    fontSize: fs(13),
    fontWeight: '600',
  },
});
