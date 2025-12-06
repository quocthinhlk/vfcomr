import React, {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {
  ScrollView,
  View,
  Image,
  Alert,
  TouchableOpacity,
  NativeSyntheticEvent,
  TextLayoutEventData,
  TextInput,
  Text as RNText,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Input,
  Button,
  Layout,
  Datepicker,
  Text,
  Select,
  SelectItem,
} from '@ui-kitten/components';
import {Formik} from 'formik';
import {globalStyles} from '../../../shared/styles/global';
import {userStyles} from '../styles';
import {addUser, uploadImage} from '../services/user.service';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {useSelectState} from '../../church/hooks/useSelectState';
import {useNavigation} from '@react-navigation/native';
import {BackButton} from '../../../shared/components/BackButton';
import {Header} from '../../../shared/components/Header';
import SelectListWithClear from '../../../shared/components/SelectListWithClear';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
// Note: DropDownPicker removed in favor of SelectListWithClear
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import api from '../../../config/api';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {authImages} from '../../auth/config/auth.constants';
import {getChurchesList} from '../../church/services/church.service';
import { COLORS } from '../../../shared/constants/colors';
import HelpIcon from '../../../shared/components/HelpIcon';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';

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
  const { t } = useTranslation();
  const C = useThemedColors();

  const cpTheme: any = {
    primaryColor: C.textPrimary,
    primaryColorVariant: C.textSecondary,
    backgroundColor: C.surface,
    onBackgroundTextColor: C.textPrimary,
    filterPlaceholderTextColor: C.textSecondary,
  };

  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  const {selectedIndex: prefixIndex, onSelect: onSelectPrefix} =
    useSelectState();
  const {selectedIndex: roleIndex, onSelect: onSelectRole} = useSelectState();
  const {selectedIndex: sensitiveIndex, onSelect: onSelectSensitive} =
    useSelectState();
  const {selectedIndex: credentialsIndex, onSelect: onSelectCredentials} =
    useSelectState();

  const [prefixOptions, setPrefixOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<{id: number; name: string}[]>(
    [],
  );
  const [languageOptions, setLanguageOptions] = useState<
    {id: number; name: string}[]
  >([]);
  const [countryOptions, setCountryOptions] = useState<
    {id: number; name: string}[]
  >([]);
  const [credentialOptions, setCredentialOptions] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState<CountryCode>('SG');
  const [callingCode, setCallingCode] = useState<string>('65');
  const [churchItems, setChurchItems] = useState<{id: number; name: string}[]>(
    [],
  );
  const [churchTotal, setChurchTotal] = useState<number>(0);
  const [churchPage, setChurchPage] = useState<number>(1);
  const [churchSelectedId, setChurchSelectedId] = useState<number | null>(null);
  const [churchQuery, setChurchQuery] = useState<string>('');
  const churchHasMore = churchItems.length < churchTotal;
  const churchItemsForPicker = useMemo(
    () =>
      churchHasMore
        ? [
            ...churchItems,
            {label: t('loadMore'), value: '__LOAD_MORE__' as any},
          ]
        : churchItems,
    [churchItems, churchHasMore],
  );
  const [showPassword, setShowPassword] = useState(false);

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));
  const formatPhoneReadable = (digits: string) => {
    if (!digits) return '';
    const only = digits.replace(/\D/g, '').slice(0, 15);
    return only.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };


  // Validation + scroll
  const scrollRef = useRef<ScrollView>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const loadChurches = useCallback(async (page: number, query?: string) => {
    try {
      const data = await getChurchesList({
        page,
        limit: DEFAULT_PAGE_LIMIT,
        name: query && query.trim() ? query.trim() : undefined,
      });
      const items = (data?.items ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
      }));
      setChurchItems(prev => (page === 1 ? items : [...prev, ...items]));
      setChurchTotal(data?.total ?? items.length);
      setChurchPage(data?.page ?? page);
    } catch (e) {
      // ignore silently in this form context
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .get<FormDataApi>('/users/form-data')
      .then(res => {
        if (!mounted) {
          return;
        }
        const d = res.data?.data;
        setPrefixOptions(d?.prefixes || []);
        setRoleOptions(d?.roles || []);
        setCredentialOptions(d?.credentials || []);
      })
      .catch(() => {});
    // fetch languages from language-regions (root only)
    api
      .get('/language-regions')
      .then(res => {
        if (!mounted) {
          return;
        }
        const arr = Array.isArray(res.data?.data) ? res.data.data : [];
        const roots = arr.filter(
          (x: any) => x.parent_id == null && !x.disabled,
        );
        setLanguageOptions(roots.map((x: any) => ({id: x.id, name: x.name})));
      })
      .catch(() => {});
    // fetch countries with limit
    api
      .get('/countries?limit=1000')
      .then(res => {
        if (!mounted) {
          return;
        }
        const items = res?.data?.data?.items ?? [];
        setCountryOptions(items.map((x: any) => ({id: x.id, name: x.name})));
      })
      .catch(() => {});
    // fetch first page of churches
    loadChurches(1);
    return () => {
      mounted = false;
    };
  }, []);

  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));

  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({y: Math.max(0, y - 20), animated: true});
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
      <Header title={t('addNewPastor')} showMenu={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : ((StatusBar.currentHeight || 0) + 50)}
          style={{ flex: 1 }}
        >
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="always" contentContainerStyle={{ paddingBottom: 24 }}>
          <Formik
            initialValues={{
              username: '',
              password: '',
              prefix: '',
              first_name: '',
              last_name: '',
              role_id: null as number | null,
              user_photo: '',
              sensitive_nation: false,
              language_id: null as number | null,
              country_id: null as number | null,
              email_address: '',
              mobile_phone: '',
              credentials: '',
              credentials_number: '',
              credentials_form: '',
              credentials_expiry_date: null as Date | null,
              church_id: null as number | null,
            }}
            onSubmit={async values => {
              const sens = !!values.sensitive_nation;
              const newInvalid: Record<string, boolean> = {};
              // Required
              newInvalid.username = !values.username;
              newInvalid.password = !values.password;
              newInvalid.first_name = !values.first_name;
              newInvalid.role_id = values.role_id == null;
              newInvalid.language_id = values.language_id == null;
              newInvalid.country_id = values.country_id == null;
              newInvalid.church_id = values.church_id == null;
              if (!sens) {
                newInvalid.email_address = !values.email_address;
                newInvalid.mobile_phone = !values.mobile_phone;
              }
              setInvalid(newInvalid);
              const firstInvalidKey = [
                'username',
                'password',
                'prefix',
                'first_name',
                'last_name',
                'role_id',
                'user_photo',
                'sensitive_nation',
                'language_id',
                'country_id',
                'church_id',
                'email_address',
                'mobile_phone',
                'credentials',
                'credentials_number',
                'credentials_form',
                'credentials_expiry_date',
              ].find(k => newInvalid[k]);
              if (firstInvalidKey) {
                scrollToField(firstInvalidKey);
                Alert.alert(t('validation'), t('fillRequiredFields'));
                return;
              }

              // Format phone as +<callingCode><digits>
              const formattedPhone = (() => {
                const digits = (values.mobile_phone || '').replace(/\D/g, '');
                return digits ? `+${callingCode}${digits}` : '';
              })();

              // If a new image was selected, upload it first to get server path
              let uploadedUserPhotoPath: string | null = null;
              try {
                if (imagePath) {
                  const form = new FormData();
                  const fileName = imagePath.split('/').pop() || 'photo.jpg';
                  form.append('file', {
                    // @ts-ignore React Native file
                    uri: imagePath,
                    name: fileName,
                    type: 'image/jpeg',
                  } as any);
                  form.append('entity_type', 'users');
                  form.append('alt_text', `${values.first_name || ''} ${values.last_name || ''}`.trim());
                  const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                  uploadedUserPhotoPath = uploadRes?.data?.data?.path || null;
                }
              } catch (e) {
                // ignore upload failure; proceed without photo
              }

              const payload = {
                username: values.username,
                password: values.password,
                prefix: values.prefix,
                first_name: values.first_name,
                last_name: values.last_name,
                role_id: values.role_id,
                user_photo: uploadedUserPhotoPath || '',
                sensitive_nation: sens,
                language_id: values.language_id,
                country_id: values.country_id,
                church_id: values.church_id,
                email_address: values.email_address,
                mobile_phone: formattedPhone,
                credentials: values.credentials,
                credentials_number: values.credentials_number,
                credentials_form: values.credentials_form,
                credentials_expiry_date: values.credentials_expiry_date
                  ? `${values.credentials_expiry_date.getFullYear()}-${String(values.credentials_expiry_date.getMonth() + 1).padStart(2, '0')}-${String(values.credentials_expiry_date.getDate()).padStart(2, '0')}`
                  : null,
              } as any;
              try {
                await addUser(payload);
                Alert.alert(t('success'), 'User created successfully!');
                navigation.navigate('UserList');
              } catch (error: any) {
                Alert.alert(
                  t('error'),
                  error?.response?.data?.message ||
                    error.message ||
                    'Could not create user.',
                );
              }
            }}>
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              setFieldValue,
            }) => (
              <View>
                {/* Username (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('username', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('username')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <HelpIcon
                      title={t('username')}
                      message={t('usernameHelp')}
                      size={13}
                      offsetY={-4}
                    />
                  </View>
                  <Input
                    style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: invalid.username ? '#db2d2d' : C.inputBorder }]}
                    value={values.username}
                    textStyle={userStyles.inputTextStyle}
                    autoCapitalize="none"
                    onChangeText={t => {
                      setFieldValue('username', t);
                      clearInvalid('username');
                    }}
                    onBlur={handleBlur('username')}
                    status={invalid.username ? 'danger' : 'basic'}
                  />
                </View>

                {/* Password (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('password', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('password')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <HelpIcon
                      title={t('password')}
                      message={t('passwordHelp')}
                      size={13}
                      offsetY={-2}
                    />
                  </View>
                  <View style={{position: 'relative'}}>
                    <Input
                      style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: invalid.password ? '#db2d2d' : C.inputBorder }]}
                      textStyle={userStyles.inputTextStyle}
                      secureTextEntry={!showPassword}
                      value={values.password}
                      autoCapitalize="none"
                      onChangeText={t => {
                        setFieldValue('password', t);
                        clearInvalid('password');
                      }}
                      onBlur={handleBlur('password')}
                      status={invalid.password ? 'danger' : 'basic'}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 10,
                        height: 24,
                        width: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Image
                        source={
                          showPassword ? authImages.eye : authImages.blind
                        }
                        style={{width: 20, height: 20, resizeMode: 'contain'}}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Prefix */}
                <View
                  onLayout={e => setFieldPos('prefix', e.nativeEvent.layout.y)}>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('prefix')}
                  </Text>
                  <ElementDropdown
                    data={useMemo(
                      () => prefixOptions.map(p => ({label: p, value: p})),
                      [prefixOptions],
                    )}
                    value={values.prefix as any}
                    onChange={v => setFieldValue('prefix', (v as string) || '')}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...(userStyles.input as any),
                      backgroundColor: C.inputBg,
                      borderColor: C.inputBorder,
                    } as any}
                  />
                </View>

                {/* First Name (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('first_name', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('firstName')} <Text style={{ color: '#c00000' }}>*</Text>
                  </Text>
                  <Input
                    style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: invalid.first_name ? '#db2d2d' : C.inputBorder }]}
                    textStyle={userStyles.inputTextStyle}
                    value={values.first_name}
                    autoCapitalize="words"
                    onChangeText={t => {
                      setFieldValue('first_name', t);
                      clearInvalid('first_name');
                    }}
                    onBlur={handleBlur('first_name')}
                    status={invalid.first_name ? 'danger' : 'basic'}
                  />
                </View>

                {/* Last Name */}
                <View
                  onLayout={e =>
                    setFieldPos('last_name', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('lastName')}
                  </Text>
                  <Input
                    style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: C.inputBorder }]}
                    textStyle={userStyles.inputTextStyle}
                    value={values.last_name}
                    autoCapitalize="words"
                    onChangeText={handleChange('last_name')}
                    onBlur={handleBlur('last_name')}
                  />
                </View>

                {/* OMR Status (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('role_id', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('omrStatus')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <HelpIcon
                      title={t('omrStatus')}
                      message={t('helpOmrStatus')}
                      size={13}
                      offsetY={-2}
                    />
                  </View>
                  <ElementDropdown
                    data={useMemo(
                      () =>
                        roleOptions.map(r => ({label: r.name, value: r.id})),
                      [roleOptions],
                    )}
                    value={values.role_id as any}
                    onChange={v => {
                      setFieldValue(
                        'role_id',
                        (typeof v === 'number' ? v : Number(v)) || null,
                      );
                      clearInvalid('role_id');
                    }}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...userStyles.input,
                      borderColor: invalid.role_id ? '#db2d2d' : C.inputBorder,
                      backgroundColor: C.inputBg,
                    } as any}
                    error={!!invalid.role_id}
                  />
                </View>

                {/* User Photo */}
                <View
                  onLayout={e =>
                    setFieldPos('user_photo', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('userPhoto')}
                    </Text>
                    <HelpIcon
                      title={t('userPhoto')}
                      message={t('helpUserPhoto')}
                      size={13}
                      offsetY={-2}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleImagePick()}
                    style={[userStyles.avatarSquare as any, { backgroundColor: C.inputBg, borderColor: C.inputBorder }] as any}>
                    {imagePath ? (
                      <>
                        <Image source={{ uri: imagePath }} style={userStyles.avatarImage as any} resizeMode="cover" />
                        <TouchableOpacity onPress={clearImage} style={userStyles.avatarClose as any}>
                          <Text style={{ color: '#fff' }}>✗</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={[userStyles.avatarPlus as any, { color: C.textSecondary } as any] as any}>+</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Sensitive Nation? */}
                <View
                  onLayout={e =>
                    setFieldPos('sensitive_nation', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('sensitiveNation')}
                    </Text>
                    <HelpIcon
                      title={t('sensitiveNation')}
                      message={t('helpSensitiveNation')}
                      size={13}
                      offsetY={-2}
                    />
                  </View>
                  <ElementDropdown
                    data={[
                      {label: t('yes'), value: 'Yes'},
                      {label: t('no'), value: 'No'},
                    ]}
                    value={values.sensitive_nation ? 'Yes' : 'No'}
                    onChange={v => {
                      setFieldValue('sensitive_nation', v === 'Yes');
                      if (v === 'Yes') {
                        clearInvalid('email_address');
                        clearInvalid('mobile_phone');
                      }
                    }}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...(userStyles.input as any),
                      backgroundColor: C.inputBg,
                      borderColor: C.inputBorder,
                    } as any}
                  />
                </View>

                {/* Language (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('language_id', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('language')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <HelpIcon
                      title={t('language')}
                      message={t('helpUserLanguage')}
                      size={13}
                      offsetY={-2}
                    />
                  </View>
                  <ElementDropdown
                    data={useMemo(
                      () =>
                        languageOptions.map(o => ({
                          label: o.name,
                          value: o.id,
                        })),
                      [languageOptions],
                    )}
                    value={values.language_id as any}
                    onChange={v => {
                      setFieldValue(
                        'language_id',
                        (typeof v === 'number' ? v : Number(v)) || null,
                      );
                      clearInvalid('language_id');
                    }}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...userStyles.input,
                      borderColor: invalid.language_id ? '#db2d2d' : C.inputBorder,
                      backgroundColor: C.inputBg,
                    } as any}
                    error={!!invalid.language_id}
                  />
                </View>

                {/* Country (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('country_id', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('country')} <Text style={{ color: '#c00000' }}>*</Text>
                  </Text>
                  <ElementDropdown
                    data={useMemo(
                      () =>
                        countryOptions.map(o => ({label: o.name, value: o.id})),
                      [countryOptions],
                    )}
                    value={values.country_id as any}
                    onChange={v => {
                      const id =
                        (typeof v === 'number' ? v : Number(v)) || null;
                      setFieldValue('country_id', id);
                      clearInvalid('country_id');
                      try {
                        const name =
                          countryOptions.find(o => o.id === id)?.name || '';
                        // best-effort resolve using country picker dataset
                        const anyPicker: any = require('react-native-country-picker-modal');
                        const all = anyPicker?.getAllCountries?.() || [];
                        const found = all.find((c: any) => {
                          const n = (c?.name?.common || c?.name || '')
                            .toString()
                            .toLowerCase();
                          return (
                            n === name.toLowerCase() ||
                            n.includes(name.toLowerCase())
                          );
                        });
                        if (found) {
                          if (found.cca2) {
                            setCountryCode(found.cca2 as CountryCode);
                          }
                          const cc = Array.isArray(found.callingCode)
                            ? found.callingCode[0]
                            : found.callingCode || '';
                          if (cc) {
                            setCallingCode(cc.toString());
                          }
                        }
                      } catch {}
                    }}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...userStyles.input,
                      borderColor: invalid.country_id ? '#db2d2d' : C.inputBorder,
                      backgroundColor: C.inputBg,
                    } as any}
                    error={!!invalid.country_id}
                  />
                </View>

                {/* Church (required) */}
                <View
                  onLayout={e =>
                    setFieldPos('church_id', e.nativeEvent.layout.y)
                  }>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                      {t('church')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <HelpIcon
                      title={t('church')}
                      message={t('helpUserChurch')}
                      size={13}
                      offsetY={-2}
                    />
                  </View>
                  <ElementDropdown
                    data={useMemo(
                      () =>
                        churchItems.map(c => ({label: c.name, value: c.id})),
                      [churchItems],
                    )}
                    value={values.church_id as any}
                    onChange={v => {
                      setFieldValue(
                        'church_id',
                        (typeof v === 'number' ? v : Number(v)) || null,
                      );
                      clearInvalid('church_id');
                    }}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...userStyles.input,
                      borderColor: invalid.church_id ? '#db2d2d' : C.inputBorder,
                      backgroundColor: C.inputBg,
                    } as any}
                    error={!!invalid.church_id}
                    onSearchText={async text => {
                      setChurchQuery(text);
                      setChurchItems([]);
                      setChurchTotal(0);
                      setChurchPage(1);
                      await loadChurches(1, text);
                    }}
                    onEndReached={async () => {
                      const next = churchPage + 1;
                      const maxPages = Math.max(
                        1,
                        Math.ceil(churchTotal / DEFAULT_PAGE_LIMIT),
                      );
                      if (next <= maxPages) {
                        await loadChurches(next, churchQuery);
                      }
                    }}
                  />
                </View>

                {/* Email Address */}
                <View
                  onLayout={e =>
                    setFieldPos('email_address', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('emailAddress')}{' '}
                    {!values.sensitive_nation ? (
                      <Text style={{ color: '#c00000' }}>*</Text>
                    ) : null}
                  </Text>
                  <Input
                    style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: invalid.email_address ? '#db2d2d' : C.inputBorder }]}
                    textStyle={userStyles.inputTextStyle}
                    value={values.email_address}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={t => {
                      setFieldValue('email_address', t);
                      clearInvalid('email_address');
                    }}
                    onBlur={handleBlur('email_address')}
                    status={invalid.email_address ? 'danger' : 'basic'}
                  />
                </View>

                {/* Mobile Phone */}
                <View
                  onLayout={e =>
                    setFieldPos('mobile_phone', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('mobilePhone')}{' '}
                    {!values.sensitive_nation ? (
                      <Text style={{ color: '#c00000' }}>*</Text>
                    ) : null}
                  </Text>
                  <View
                    style={[
                      userStyles.input,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: 44,
                        paddingHorizontal: 8,
                        borderWidth: 1,
                        borderRadius: 6,
                        borderColor: invalid.mobile_phone ? '#db2d2d' : C.inputBorder,
                        backgroundColor: C.inputBg,
                      },
                    ]}>
                    <CountryPicker
                      theme={cpTheme}
                      countryCode={countryCode}
                      withFlag
                      withFilter
                      withCallingCode
                      withEmoji
                      onSelect={(c: Country) => {
                        setCountryCode(c.cca2 as CountryCode);
                        const cc =
                          c.callingCode && c.callingCode[0]
                            ? c.callingCode[0]
                            : '';
                        setCallingCode(cc);
                      }}
                    />
                    <Text style={{marginLeft: 8, fontSize: 16, color: C.textPrimary}}>
                      +{callingCode}
                    </Text>
                    <TextInput
                      style={{flex: 1, marginLeft: 8, fontSize: 16, color: C.inputText}}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      value={formatPhoneReadable(values.mobile_phone)}
                      onChangeText={t => {
                        const digits = t.replace(/\D/g, '').slice(0, 15);
                        setFieldValue('mobile_phone', digits);
                        clearInvalid('mobile_phone');
                      }}
                      placeholder=""
                    />
                  </View>
                </View>

                {/* I hold Credentials */}
                <View
                  onLayout={e =>
                    setFieldPos('credentials', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('credentials')}
                  </Text>
                  <ElementDropdown
                    data={useMemo(
                      () => credentialOptions.map(c => ({label: c, value: c})),
                      [credentialOptions],
                    )}
                    value={values.credentials as any}
                    onChange={v => {
                      setFieldValue('credentials', (v as string) || '');
                      clearInvalid('credentials');
                    }}
                    placeholder={t('selectOption')}
                    containerStyle={{
                      ...(userStyles.input as any),
                      backgroundColor: C.inputBg,
                      borderColor: C.inputBorder,
                    } as any}
                  />
                </View>

                {/* Credentials Number */}
                <View
                  onLayout={e =>
                    setFieldPos('credentials_number', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('credentialsNumber')}
                  </Text>
                  <Input
                    style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: C.inputBorder }]}
                    textStyle={userStyles.inputTextStyle}
                    value={values.credentials_number}
                    autoCapitalize="none"
                    onChangeText={handleChange('credentials_number')}
                    onBlur={handleBlur('credentials_number')}
                  />
                </View>

                {/* With what organisation? */}
                <View
                  onLayout={e =>
                    setFieldPos('credentials_form', e.nativeEvent.layout.y)
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('credentialsFrom')}
                  </Text>
                  <Input
                    style={[userStyles.input, { backgroundColor: C.inputBg, color: C.inputText, borderColor: C.inputBorder }]}
                    textStyle={userStyles.inputTextStyle}
                    value={values.credentials_form}
                    autoCapitalize="none"
                    onChangeText={handleChange('credentials_form')}
                    onBlur={handleBlur('credentials_form')}
                  />
                </View>

                {/* When do these Credentials expire? */}
                <View
                  onLayout={e =>
                    setFieldPos(
                      'credentials_expiry_date',
                      e.nativeEvent.layout.y,
                    )
                  }>
                  <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">
                    {t('credentialsExpiry')}
                  </Text>
                  <DateTripleDropdown
                    value={values.credentials_expiry_date}
                    onChange={(d) => setFieldValue('credentials_expiry_date', d)}
                    yearRange={50}
                  />
                </View>

                <Button
                  onPress={() => handleSubmit()}
                  style={[globalStyles.button, {marginTop: 16}]}>
                  {t('save')}
                </Button>
              </View>
            )}
          </Formik>
        </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}
