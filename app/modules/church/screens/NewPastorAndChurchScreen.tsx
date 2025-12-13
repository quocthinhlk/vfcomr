import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, TextInput, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Button, Layout, Text } from '@ui-kitten/components';
import { BackButton } from '../../../shared/components/BackButton';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { churchStyles } from '../styles';
import { formStyles } from '../../../shared/styles/form';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import { Formik } from 'formik';
import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useImagePicker } from '../../church/hooks/useImagePicker';
import { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import { AddChurchFormValues, useFormOptions } from './utils/addChurch.utils';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import { COLORS } from '../../../shared/constants/colors';
import HelpIcon from '../../../shared/components/HelpIcon';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { Col, Row, Grid } from 'react-native-easy-grid';

type CombinedFormValues = AddChurchFormValues & {
  // user fields
  username: string;
  password: string;
  prefix: string;
  title: string;
  first_name: string;
  last_name: string;
  user_role_id: string;
  user_sensitive_nation: string;
  user_language_id: string;
  user_church_id: string;
  credentials: string;
  credentials_from: string;
  credentials_expiry_date: Date | null;
  user_email_address: string;
  user_mobile_phone: string;
};

const CHURCH_DRAFT_KEY = 'new_pastor_and_church_church_draft_v1';

export default function NewPastorAndChurchScreen() {
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
  const scrollRef = useRef<ScrollView>(null);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const setFieldPos = (key: string, y: number) => setFieldY(prev => (prev[key] === y ? prev : { ...prev, [key]: y }));
  const scrollToField = (key: string) => { const y = fieldY[key] ?? 0; scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true }); };
  const [showPastorSection, setShowPastorSection] = useState(false);

  // church dropdown options
  const {
    motherChurchOptions,
    churchTypeOptions,
    churchNetworkOptions,
    pastorOptions,
    languageOptions,
    churchRegionOptions,
    geographicalRegionOptions,
    languageRegionOptions,
    countryOptions,
    localCurrencyOptions,
  } = useFormOptions();

  // pickers for images (church & user)
  // Church photo: enforce 16:9 crop ratio (e.g. 1600x900)
  const {
    imagePath: churchImagePath,
    handleImagePick: pickChurchImage,
    clearImage: clearChurchImage,
  } = useImagePicker({ width: 1600, height: 900 });
  const {
    imagePath: userImagePath,
    handleImagePick: pickUserImage,
    clearImage: clearUserImage,
  } = useImagePicker();

  // dependent cities for church
  const [cityOptions, setCityOptions] = useState<{ label: string; value: string }[]>([]);
  const loadCities = async (countryId: string | number) => {
    try {
      const res = await api.get(`cities/country/${countryId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCityOptions(list.map((x: any) => ({ label: x.name, value: String(x.id) })));
    } catch {}
  };

  const PAGE_LIMIT = DEFAULT_PAGE_LIMIT;
  const [langOptions, setLangOptions] = useState(languageOptions);
  const [langPage, setLangPage] = useState(1);
  const [langHasNext, setLangHasNext] = useState(false);
  const [langQuery, setLangQuery] = useState('');
  const [prefixOptions, setPrefixOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [credentialOptions, setCredentialOptions] = useState<string[]>([]);
  const [userCountryCode, setUserCountryCode] = useState<CountryCode>('SG');
  const [userCallingCode, setUserCallingCode] = useState<string>('65');
  const [initialValues, setInitialValues] = useState<CombinedFormValues>({
    // church
    name: '', short_name: '', is_msc: '', enable_cpm: '', parent_id: '', language_id: '', church_type_id: '', pastor_id: '', church_network_id: '', church_region_id: '', geographical_region_id: '', language_region_id: '', sensitive_nation: '', country_id: '', currency_id: '', city_id: '', photo_dir: '', service_address_street: '', service_address_postal_code: '', mailing_address_postal_code: '', office_address_street: '', office_address_postal_code: '', office_phone: '', office_fax: '', email_address: '', website: '', facebook: '', instagram: '', twitter: '', date_of_birth: null,
    // user
    username: '', password: '', prefix: '', title: '', first_name: '', last_name: '', user_role_id: '', user_sensitive_nation: '', user_language_id: '', user_church_id: '', credentials: '', credentials_from: '', credentials_expiry_date: null, user_email_address: '', user_mobile_phone: '',
  });
  const [draftLoaded, setDraftLoaded] = useState(false);

  const formatPhoneReadable = (digits: string) => {
    if (!digits) return '';
    const only = String(digits).replace(/\D/g, '').slice(0, 15);
    return only.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  const loadLanguages = async (page: number, name?: string) => {
    try {
      const res = await api.get('languages', { params: { page, limit: PAGE_LIMIT, ...(name?.trim() ? { name: name.trim() } : {}) } });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));
      setLangOptions(prev => (page === 1 ? items : [...prev, ...items]));
      setLangPage(page);
      setLangHasNext(!!res.data?.data?.has_next);
    } catch {}
  };

  useEffect(() => { if (!langQuery && langPage === 1) setLangOptions(languageOptions); }, [languageOptions]);

  // Load saved church draft (step 1) from storage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHURCH_DRAFT_KEY);
        if (!mounted) return;
        if (raw) {
          const saved = JSON.parse(raw) as Partial<CombinedFormValues> & { date_of_birth?: string | null };
          setInitialValues(prev => ({
            ...prev,
            // church-only fields
            name: saved.name ?? prev.name,
            short_name: saved.short_name ?? prev.short_name,
            is_msc: saved.is_msc ?? prev.is_msc,
            enable_cpm: saved.enable_cpm ?? prev.enable_cpm,
            parent_id: saved.parent_id ?? prev.parent_id,
            language_id: saved.language_id ?? prev.language_id,
            church_type_id: saved.church_type_id ?? prev.church_type_id,
            pastor_id: saved.pastor_id ?? prev.pastor_id,
            church_network_id: saved.church_network_id ?? prev.church_network_id,
            church_region_id: saved.church_region_id ?? prev.church_region_id,
            geographical_region_id: saved.geographical_region_id ?? prev.geographical_region_id,
            language_region_id: saved.language_region_id ?? prev.language_region_id,
            sensitive_nation: saved.sensitive_nation ?? prev.sensitive_nation,
            country_id: saved.country_id ?? prev.country_id,
            currency_id: saved.currency_id ?? prev.currency_id,
            city_id: saved.city_id ?? prev.city_id,
            photo_dir: saved.photo_dir ?? prev.photo_dir,
            service_address_street: saved.service_address_street ?? prev.service_address_street,
            service_address_postal_code: saved.service_address_postal_code ?? prev.service_address_postal_code,
            mailing_address_postal_code: saved.mailing_address_postal_code ?? prev.mailing_address_postal_code,
            office_address_street: saved.office_address_street ?? prev.office_address_street,
            office_address_postal_code: saved.office_address_postal_code ?? prev.office_address_postal_code,
            office_phone: saved.office_phone ?? prev.office_phone,
            office_fax: saved.office_fax ?? prev.office_fax,
            email_address: saved.email_address ?? prev.email_address,
            website: saved.website ?? prev.website,
            facebook: saved.facebook ?? prev.facebook,
            instagram: saved.instagram ?? prev.instagram,
            twitter: saved.twitter ?? prev.twitter,
            date_of_birth: saved.date_of_birth ? new Date(saved.date_of_birth as any) : prev.date_of_birth,
          }));
        }
      } catch {
        // ignore storage errors
      } finally {
        if (mounted) setDraftLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    let mounted = true;
    api.get('/users/form-data').then(res => {
      if (!mounted) return;
      const d = res?.data?.data;
      setPrefixOptions(d?.prefixes || []);
      setRoleOptions(Array.isArray(d?.roles) ? d.roles : []);
      setCredentialOptions(d?.credentials || []);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSaveChurchAndContinue = async (values: CombinedFormValues) => {
    const nextInvalid: Record<string, boolean> = {};
    // validate church section only
    nextInvalid.name = !values.name;
    nextInvalid.is_msc = !values.is_msc;
    nextInvalid.language_id = !values.language_id;
    nextInvalid.church_type_id = !values.church_type_id;
    nextInvalid.church_network_id = !values.church_network_id;
    nextInvalid.church_region_id = !values.church_region_id;
    nextInvalid.geographical_region_id = !values.geographical_region_id;
    nextInvalid.language_region_id = !values.language_region_id;
    nextInvalid.country_id = !values.country_id;
    nextInvalid.currency_id = !values.currency_id;
    nextInvalid.email_address = !values.email_address;
    nextInvalid.date_of_birth = !values.date_of_birth;

    setInvalid(nextInvalid);

    const firstInvalidKey = [
      'name',
      'is_msc',
      'language_id',
      'church_type_id',
      'church_network_id',
      'church_region_id',
      'geographical_region_id',
      'language_region_id',
      'country_id',
      'currency_id',
      'email_address',
      'date_of_birth',
    ].find(k => nextInvalid[k]);

    if (firstInvalidKey) {
      Alert.alert(t('validation'), t('fillRequiredFields'));
      try {
        setTimeout(() => scrollToField(firstInvalidKey), 0);
      } catch {}
      return;
    }

    try {
      const draftToStore = {
        name: values.name,
        short_name: values.short_name,
        is_msc: values.is_msc,
        enable_cpm: values.enable_cpm,
        parent_id: values.parent_id,
        language_id: values.language_id,
        church_type_id: values.church_type_id,
        pastor_id: values.pastor_id,
        church_network_id: values.church_network_id,
        church_region_id: values.church_region_id,
        geographical_region_id: values.geographical_region_id,
        language_region_id: values.language_region_id,
        sensitive_nation: values.sensitive_nation,
        country_id: values.country_id,
        currency_id: values.currency_id,
        city_id: values.city_id,
        photo_dir: values.photo_dir,
        service_address_street: values.service_address_street,
        service_address_postal_code: values.service_address_postal_code,
        mailing_address_postal_code: values.mailing_address_postal_code,
        office_address_street: values.office_address_street,
        office_address_postal_code: values.office_address_postal_code,
        office_phone: values.office_phone,
        office_fax: values.office_fax,
        email_address: values.email_address,
        website: values.website,
        facebook: values.facebook,
        instagram: values.instagram,
        twitter: values.twitter,
        date_of_birth: values.date_of_birth
          ? values.date_of_birth.toISOString()
          : null,
      };

      await AsyncStorage.setItem(CHURCH_DRAFT_KEY, JSON.stringify(draftToStore));
    } catch {
      // ignore storage errors
    }

    setShowPastorSection(true);
    try {
      setTimeout(() => scrollToField('username'), 0);
    } catch {}
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
      <Header title={t('addNewChurchAndPastor')} showMenu={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : ((StatusBar.currentHeight || 0) + 50)}
          style={{ flex: 1, backgroundColor: C.background }}
        >
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="always" style={{ backgroundColor: C.background }} contentContainerStyle={{ paddingBottom: 24 }}>

          {draftLoaded && (
          <Formik<CombinedFormValues>
            enableReinitialize
            initialValues={initialValues}
            onSubmit={async (values) => {
              try {
                const newInvalid: Record<string, boolean> = {};
                // required (church)
                newInvalid.name = !values.name;
                newInvalid.is_msc = !values.is_msc;
                newInvalid.language_id = !values.language_id;
                newInvalid.church_type_id = !values.church_type_id;
                newInvalid.church_network_id = !values.church_network_id;
                newInvalid.church_region_id = !values.church_region_id;
                newInvalid.geographical_region_id = !values.geographical_region_id;
                newInvalid.language_region_id = !values.language_region_id;
                newInvalid.country_id = !values.country_id;
                newInvalid.currency_id = !values.currency_id;
                newInvalid.email_address = !values.email_address;
                newInvalid.date_of_birth = !values.date_of_birth;
                // required (user)
                newInvalid.username = !values.username;
                newInvalid.password = !values.password;
                newInvalid.title = !values.title;
                newInvalid.first_name = !values.first_name;
                newInvalid.user_role_id = !values.user_role_id;
                newInvalid.user_language_id = !values.user_language_id;
                newInvalid.user_church_id = !values.user_church_id;
                newInvalid.user_email_address = !values.user_email_address;
                newInvalid.user_mobile_phone = !values.user_mobile_phone;
                setInvalid(newInvalid);
                const firstInvalidKey = [
                  'name','is_msc','language_id','church_type_id','church_network_id','church_region_id','geographical_region_id','language_region_id','country_id','currency_id','email_address','date_of_birth',
                  'username','password','title','first_name','user_role_id','user_language_id','user_church_id','user_email_address','user_mobile_phone'
                ].find(k => newInvalid[k]);
                if (firstInvalidKey) {
                  Alert.alert(t('validation'), t('fillRequiredFields'), [
                    { text: 'OK', onPress: () => { try { setTimeout(() => scrollToField(firstInvalidKey), 0); } catch {} } }
                  ]);
                  return;
                }

                // upload images first if any
                let churchPhotoPath: string | null = null;
                if (churchImagePath) {
                  const form = new FormData();
                  const fileName = churchImagePath.split('/').pop() || 'photo.jpg';
                  form.append('file', { uri: churchImagePath, name: fileName, type: 'image/jpeg' } as any);
                  form.append('entity_type', 'churches');
                  form.append('alt_text', values.name || 'church photo');
                  const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                  churchPhotoPath = uploadRes?.data?.data?.path || null;
                }
                let userPhotoPath: string | null = null;
                if (userImagePath) {
                  const form = new FormData();
                  const fileName = userImagePath.split('/').pop() || 'photo.jpg';
                  form.append('file', { uri: userImagePath, name: fileName, type: 'image/jpeg' } as any);
                  form.append('entity_type', 'users');
                  form.append('alt_text', values.first_name || 'user photo');
                  const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                  userPhotoPath = uploadRes?.data?.data?.path || null;
                }

                const churchPayload: any = {
                  name: values.name,
                  short_name: values.short_name,
                  is_msc: values.is_msc === 'Yes',
                  is_first_msc: false,
                  enable_cpm: values.enable_cpm ? values.enable_cpm === 'Yes' : false,
                  parent_id: values.parent_id ? Number(values.parent_id) : null,
                  language_id: values.language_id ? Number(values.language_id) : null,
                  church_type_id: values.church_type_id ? Number(values.church_type_id) : null,
                  church_network_id: values.church_network_id ? Number(values.church_network_id) : null,
                  church_region_id: values.church_region_id ? Number(values.church_region_id) : null,
                  geographical_region_id: values.geographical_region_id ? Number(values.geographical_region_id) : 0,
                  language_region_id: values.language_region_id ? Number(values.language_region_id) : 0,
                  country_id: values.country_id ? Number(values.country_id) : null,
                  city_id: values.city_id ? Number(values.city_id) : null,
                  currency_id: values.currency_id ? Number(values.currency_id) : null,
                  sensitive_nation: values.sensitive_nation === 'Yes',
                  photo: churchPhotoPath,
                  service_address_street: values.service_address_street,
                  service_address_postal_code: values.service_address_postal_code,
                  mailing_address_postal_code: values.mailing_address_postal_code,
                  office_address_street: values.office_address_street,
                  office_address_postal_code: values.office_address_postal_code,
                  office_phone: values.office_phone,
                  office_fax: values.office_fax,
                  email_address: values.email_address,
                  website: values.website,
                  facebook: values.facebook,
                  twitter: values.twitter,
                  date_of_birth: values.date_of_birth ? `${values.date_of_birth.getFullYear()}-${String(values.date_of_birth.getMonth() + 1).padStart(2, '0')}-${String(values.date_of_birth.getDate()).padStart(2, '0')}` : null,
                  service_venue: '',
                  church_planting_projection_id: 0,
                  msc_parent_id: 0,
                  photo_dir: values.photo_dir,
                  mailing_address_street: '',
                  property: '',
                };

                // format phone for user as +<digits> (assuming already includes country code in UI)
                const formattedUserPhone = (() => {
                  const digits = (values.user_mobile_phone || '').replace(/\D/g, '');
                  return digits ? `+${userCallingCode}${digits}` : '';
                })();

                const userPayload: any = {
                  username: values.username,
                  password: values.password,
                  prefix: values.prefix,
                  title: values.title,
                  first_name: values.first_name,
                  last_name: values.last_name,
                  role_id: values.user_role_id ? Number(values.user_role_id) : undefined,
                  user_photo: userPhotoPath,
                  sensitive_nation: values.user_sensitive_nation === 'Yes',
                  language_id: values.user_language_id ? Number(values.user_language_id) : null,
                  mobile_phone: formattedUserPhone,
                  email_address: values.user_email_address,
                  credentials: values.credentials || undefined,
                  credentials_from: values.credentials_from || undefined,
                  credentials_expiry_date: values.credentials_expiry_date ? `${values.credentials_expiry_date.getFullYear()}-${String(values.credentials_expiry_date.getMonth() + 1).padStart(2, '0')}-${String(values.credentials_expiry_date.getDate()).padStart(2, '0')}` : undefined,
                };

                const payload = { church: churchPayload, user: userPayload };
                await api.post('churches/with-user', payload);
                try {
                  await AsyncStorage.removeItem(CHURCH_DRAFT_KEY);
                } catch {}
                Alert.alert(t('success'), t('churchCreatedSuccess'));
                navigation.navigate('Churches');
              } catch (e: any) {
                Alert.alert(t('error'), e?.response?.data?.message || e?.message || t('failedToCreateChurch'));
              }
            }}
            >
            {({ values, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
              <Grid>
                <Row>
                  <Col>
              <View>
                {!showPastorSection && (
                  <>
                <Text category="label" style={[churchStyles.title, { marginTop: 8, color: C.textPrimary }]}>{t('churchData')}</Text>
                <View onLayout={e => setFieldPos('name', e.nativeEvent.layout.y)}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('churchName')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('churchName')}
                        message={t('helpChurchName')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.name ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="words"
                      value={values.name}
                      onChangeText={t => { setFieldValue('name', t); setInvalid(prev => ({ ...prev, name: false })); }}
                      onBlur={handleBlur('name')}
                      status={invalid?.name ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                        {t('shortName')}
                        <Text style={formStyles.subLabel}> [{t('only10Chars')}]</Text>
                      </Text>
                      <HelpIcon
                        title={t('shortName')}
                        message={t('helpShortName')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.short_name}
                      onChangeText={t => setFieldValue('short_name', (t || '').slice(0, 10))}
                      onBlur={handleBlur('short_name')}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('is_msc', e.nativeEvent.layout.y)}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('msc')}? <Text status="danger">*</Text></Text>
                    </View>
                    <ElementDropdown
                      data={[{ label: t('yes'), value: 'Yes' }, { label: t('no'), value: 'No' }]}
                      value={values.is_msc as any}
                      onChange={v => { setFieldValue('is_msc', (v as string) || ''); setInvalid(prev => ({ ...prev, is_msc: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.is_msc ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.is_msc}
                    />
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('motherChurch')}</Text>
                    </View>
                    <ElementDropdown
                      data={motherChurchOptions}
                      value={values.parent_id as any}
                      onChange={v => setFieldValue('parent_id', v as any)}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
                    />
                  </View>
                </View>

                <View>
                  <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                          {t('languageUsedInTheService')} <Text status="danger">*</Text>
                        </Text>
                        <HelpIcon
                          title={t('languageUsedInTheService')}
                          message={t('helpLanguage')}
                          size={16}
                          offsetY={-2}
                        />
                      </View>
                    <ElementDropdown
                      data={langOptions}
                      value={values.language_id as any}
                      onChange={v => { setFieldValue('language_id', v as any); setInvalid(prev => ({ ...prev, language_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.language_id ? '#db2d2d' : C.inputBorder } as any}
                      onFocus={async () => { if (langOptions.length === 0) await loadLanguages(1); }}
                      onSearchText={async text => { setLangQuery(text); await loadLanguages(1, text); }}
                      onEndReached={async () => { if (langHasNext) await loadLanguages(langPage + 1, langQuery); }}
                      error={!!invalid?.language_id}
                    />
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('churchType')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('churchType')}
                        message={t('helpChurchType')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={churchTypeOptions}
                      value={values.church_type_id as any}
                      onChange={v => { setFieldValue('church_type_id', v as any); setInvalid(prev => ({ ...prev, church_type_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.church_type_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.church_type_id}
                    />
                  </View>
                </View>

                {/* Pastor / Leader field removed as requested */}

                <View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('churchNetwork')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('churchNetwork')}
                        message={t('helpChurchNetwork')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={churchNetworkOptions}
                      value={values.church_network_id as any}
                      onChange={v => { setFieldValue('church_network_id', v as any); setInvalid(prev => ({ ...prev, church_network_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.church_network_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.church_network_id}
                    />
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('apostolicRegion')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('apostolicRegion')}
                        message={t('helpApostolicRegion')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={churchRegionOptions}
                      value={values.church_region_id as any}
                      onChange={v => { setFieldValue('church_region_id', v as any); setInvalid(prev => ({ ...prev, church_region_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.church_region_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.church_region_id}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('geographicalRegion')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('geographicalRegion')}
                        message={t('helpGeographicalRegion')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={geographicalRegionOptions}
                      value={values.geographical_region_id as any}
                      onChange={v => { setFieldValue('geographical_region_id', v as any); setInvalid(prev => ({ ...prev, geographical_region_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.geographical_region_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.geographical_region_id}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('languageRegion')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('languageRegion')}
                        message={t('helpLanguageRegion')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={languageRegionOptions}
                      value={values.language_region_id as any}
                      onChange={v => { setFieldValue('language_region_id', v as any); setInvalid(prev => ({ ...prev, language_region_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.language_region_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.language_region_id}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('sensitiveNation')}?</Text>
                      <HelpIcon
                        title={t('sensitiveNation')}
                        message={t('helpSensitiveNation')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={[{ label: t('yes'), value: 'Yes' }, { label: t('no'), value: 'No' }]}
                      value={values.sensitive_nation as any}
                      onChange={v => setFieldValue('sensitive_nation', (v as string) || '')}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('country_id', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('nation')} <Text status="danger">*</Text></Text>
                    <ElementDropdown
                      data={countryOptions}
                      value={values.country_id as any}
                      onChange={v => { setFieldValue('country_id', v as any); setInvalid(prev => ({...prev, country_id: false})); const id = v as any; if (id) loadCities(id); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.country_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.country_id}
                    />
                  </View>
                </View>

                {values.country_id ? (
                  <View>
                    <View style={churchStyles.input}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('city')}</Text>
                        <HelpIcon
                          title={t('city')}
                          message={t('helpCity')}
                          size={16}
                          offsetY={-2}
                        />
                      </View>
                      <ElementDropdown
                        data={cityOptions}
                        value={values.city_id as any}
                        onChange={v => setFieldValue('city_id', v as any)}
                        placeholder={t('selectOption')}
                        containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
                      />
                    </View>
                  </View>
                ) : null}

                <View onLayout={e => setFieldPos('currency_id', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('currency')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('currency')}
                        message={t('helpCurrency')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={localCurrencyOptions}
                      value={values.currency_id as any}
                      onChange={v => { setFieldValue('currency_id', v as any); setInvalid(prev => ({...prev, currency_id: false})); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.currency_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.currency_id}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                        {t('churchPhoto')}
                        <Text style={formStyles.subLabel}> [{t('max5mb')}]</Text>
                      </Text>
                      <HelpIcon
                        title={t('churchPhoto')}
                        message={t('helpChurchPhoto')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <TouchableOpacity onPress={() => pickChurchImage()} style={[formStyles.avatarSquare as any, { backgroundColor: C.inputBg, borderColor: C.inputBorder }] as any}>
                      {churchImagePath ? (
                        <>
                          <Image source={{ uri: churchImagePath }} style={formStyles.avatarImage as any} resizeMode="cover" />
                          <TouchableOpacity onPress={clearChurchImage} style={formStyles.avatarClose as any}><Text style={{ color: '#fff' }}>✗</Text></TouchableOpacity>
                        </>
                      ) : (<><Text style={[formStyles.avatarPlus as any, { color: C.textSecondary } as any] as any}>+</Text></>)}
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('serviceAddress')}</Text>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.service_address_street}
                      onChangeText={handleChange('service_address_street')}
                      onBlur={handleBlur('service_address_street')}
                    />
                  </View>
                </View>
                <View>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('servicePostalCode')}</Text>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.service_address_postal_code}
                      onChangeText={handleChange('service_address_postal_code')}
                      onBlur={handleBlur('service_address_postal_code')}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('email_address', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                        {t('emailAddress')}<Text status="danger">*</Text>
                      </Text>
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.email_address ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.email_address}
                      onChangeText={t => { setFieldValue('email_address', t); setInvalid(prev => ({...prev, email_address: false})); }}
                      onBlur={handleBlur('email_address')}
                      status={invalid?.email_address ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('website')}</Text>
                    <HelpIcon
                      title={t('website')}
                      message={t('helpWebsite')}
                      size={16}
                      offsetY={-2}
                    />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.website}
                      onChangeText={handleChange('website')}
                      onBlur={handleBlur('website')}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('facebook')}</Text>
                      <HelpIcon
                        title={t('facebook')}
                        message={t('helpFacebook')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.facebook}
                      onChangeText={handleChange('facebook')}
                      onBlur={handleBlur('facebook')}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">Instagram</Text>
                      <HelpIcon
                        title="Instagram"
                        message={t('helpInstagram')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.instagram}
                      onChangeText={handleChange('instagram')}
                      onBlur={handleBlur('instagram')}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">X</Text>
                      <HelpIcon
                        title="X"
                        message={t('helpX')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.twitter}
                      onChangeText={handleChange('twitter')}
                      onBlur={handleBlur('twitter')}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('date_of_birth', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('dob')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('dob')}
                        message={t('helpDob')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <DateTripleDropdown
                      value={values.date_of_birth}
                      onChange={d => { setFieldValue('date_of_birth', d); setInvalid(prev => ({...prev, date_of_birth: false})); }}
                      yearRange={50}
                      startYear={new Date().getFullYear() - 50}
                      error={!!invalid?.date_of_birth}
                    />
                  </View>
                </View>

                <Button
                  onPress={() => handleSaveChurchAndContinue(values)}
                  style={globalStyles.mainButton}
                >
                  {t('saveAndContinuePastorDetails')}
                </Button>
                  </>
                )}

                {showPastorSection && (<>

                <Text category="label" style={[churchStyles.title, { marginTop: 16, color: C.textPrimary }]}>{t('pastorLeader')}</Text>

                <View>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">Prefix</Text>
                    <ElementDropdown
                      data={prefixOptions.map(p => ({ label: p, value: p }))}
                      value={values.prefix as any}
                      onChange={v => setFieldValue('prefix', (v as string) || '')}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('first_name', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('firstName')} <Text status="danger">*</Text></Text>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.first_name ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      value={values.first_name}
                      autoCapitalize="words"
                      onChangeText={t => { setFieldValue('first_name', t); setInvalid(prev => ({ ...prev, first_name: false })); }}
                      onBlur={handleBlur('first_name')}
                      status={invalid?.first_name ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('lastName')}</Text>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      value={values.last_name}
                      autoCapitalize="words"
                      onChangeText={handleChange('last_name')}
                      onBlur={handleBlur('last_name')}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('username', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('username')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('username')}
                        message={t('usernameHelp')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.username ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      value={values.username}
                      autoCapitalize="none"
                      onChangeText={t => { setFieldValue('username', t); setInvalid(prev => ({ ...prev, username: false })); }}
                      onBlur={handleBlur('username')}
                      status={invalid?.username ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('password', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('password')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('password')}
                        message={t('passwordHelp')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.password ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      value={values.password}
                      autoCapitalize="none"
                      secureTextEntry
                      onChangeText={t => { setFieldValue('password', t); setInvalid(prev => ({ ...prev, password: false })); }}
                      onBlur={handleBlur('password')}
                      status={invalid?.password ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('title', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                        {t('ministryTitle')} <Text status="danger">*</Text>
                      </Text>
                      <HelpIcon
                        title={t('ministryTitle')}
                        message={t('helpMinistryTitle')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.title ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      value={values.title}
                      autoCapitalize="words"
                      onChangeText={t => { setFieldValue('title', t); setInvalid(prev => ({ ...prev, title: false })); }}
                      onBlur={handleBlur('title')}
                      status={invalid?.title ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View onLayout={e => setFieldPos('user_role_id', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('omrStatus')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('omrStatus')}
                        message={t('helpOmrStatus')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={roleOptions.map(r => ({ label: r.name, value: String(r.id) }))}
                      value={values.user_role_id as any}
                      onChange={v => { setFieldValue('user_role_id', (v as string) || ''); setInvalid(prev => ({ ...prev, user_role_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.user_role_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.user_role_id}
                    />
                  </View>
                </View>

                <View >
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                        {t('userPhoto')}
                        <Text style={formStyles.subLabel}> [{t('max5mb')}]</Text>
                      </Text>
                    <HelpIcon
                      title={t('userPhoto')}
                      message={t('helpUserPhoto')}
                      size={16}
                      offsetY={-2}
                    />
                    </View>
                    <TouchableOpacity onPress={() => pickUserImage()} style={[formStyles.avatarSquare as any, { backgroundColor: C.inputBg, borderColor: C.inputBorder }] as any}>
                      {userImagePath ? (
                        <>
                          <Image source={{ uri: userImagePath }} style={formStyles.avatarImage as any} resizeMode="cover" />
                          <TouchableOpacity onPress={clearUserImage} style={formStyles.avatarClose as any}><Text style={{ color: '#fff' }}>✗</Text></TouchableOpacity>
                        </>
                      ) : (<><Text style={[formStyles.avatarPlus as any, { color: C.textSecondary } as any] as any}>+</Text></>)}
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('sensitiveNation')}?</Text>
                      <HelpIcon
                        title={t('sensitiveNation')}
                        message={t('helpSensitiveNation')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={[{ label: t('yes'), value: 'Yes' }, { label: t('no'), value: 'No' }]}
                      value={values.user_sensitive_nation as any}
                      onChange={v => setFieldValue('user_sensitive_nation', (v as string) || '')}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('language')} <Text status="danger">*</Text></Text>
                      <HelpIcon
                        title={t('language')}
                        message={t('helpUserLanguage')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <ElementDropdown
                      data={langOptions}
                      value={values.user_language_id as any}
                      onChange={v => { setFieldValue('user_language_id', v as any); setInvalid(prev => ({ ...prev, user_language_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.user_language_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.user_language_id}
                    />
                  </View>
                </View>

                {/* User country field removed as requested */}

                <View onLayout={e => setFieldPos('user_church_id', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('church')} <Text status="danger">*</Text></Text>
                    <HelpIcon
                      title={t('church')}
                      message={t('helpUserChurch')}
                      size={16}
                      offsetY={-2}
                    />
                    </View>
                    <ElementDropdown
                      data={motherChurchOptions}
                      value={values.user_church_id as any}
                      onChange={v => { setFieldValue('user_church_id', v as any); setInvalid(prev => ({ ...prev, user_church_id: false })); }}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.user_church_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.user_church_id}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                        {t('emailAddress')} <Text status="danger">*</Text>
                      </Text>
                      <HelpIcon
                        title={t('emailAddress')}
                        message={t('infoEmailAddress')}
                        size={16}
                        offsetY={-2}
                      />
                    </View>
                    <Input
                      style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.user_email_address ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={formStyles.inputTextStyle}
                      value={values.user_email_address}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={t => { setFieldValue('user_email_address', t); setInvalid(prev => ({ ...prev, user_email_address: false })); }}
                      onBlur={handleBlur('user_email_address')}
                      status={invalid?.user_email_address ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('mobilePhone')} <Text status="danger">*</Text></Text>
                    <View style={[formStyles.input as any, { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 8, borderWidth: 1, borderRadius: 6, borderColor: invalid.user_mobile_phone ? '#db2d2d' : C.inputBorder, backgroundColor: C.inputBg }]}> 
                      <CountryPicker
                        theme={cpTheme}
                        countryCode={userCountryCode}
                        withFlag
                        withFilter
                        withCallingCode
                        withEmoji
                        onSelect={(c: Country) => {
                          setUserCountryCode(c.cca2 as CountryCode);
                          const cc = c.callingCode && c.callingCode[0] ? c.callingCode[0] : '';
                          setUserCallingCode(cc);
                        }}
                      />
                      <Text style={{marginLeft: 8, fontSize: 16, color: C.textPrimary}}>+{userCallingCode}</Text>
                      <TextInput
                        style={{flex: 1, marginLeft: 8, fontSize: 16, color: C.inputText}}
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        value={formatPhoneReadable(values.user_mobile_phone)}
                        onChangeText={t => {
                          const digits = t.replace(/\D/g, '').slice(0, 15);
                          setFieldValue('user_mobile_phone', digits);
                          setInvalid(prev => ({ ...prev, user_mobile_phone: false }));
                        }}
                        placeholder=""
                      />
                    </View>
                  </View>
                </View>

                <View>
                  <View style={churchStyles.input}>
                    <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('credentials')}</Text>
                    <ElementDropdown
                      data={credentialOptions.map(c => ({ label: c, value: c }))}
                      value={values.credentials as any}
                      onChange={v => setFieldValue('credentials', (v as string) || '')}
                      placeholder={t('selectOption')}
                      containerStyle={{ ...(formStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any}
                    />
                  </View>
                </View>

                {!!values.credentials && (
                  <>
                    <View>
                      <View style={churchStyles.input}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('credentialsFrom')}</Text>
                        <Input
                          style={[formStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                          textStyle={formStyles.inputTextStyle}
                          autoCapitalize="none"
                          value={values.credentials_from}
                          onChangeText={t => setFieldValue('credentials_from', t)}
                          onBlur={handleBlur('credentials_from')}
                        />
                      </View>
                    </View>

                    <View>
                      <View style={churchStyles.input}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">{t('credentialsExpiry')}</Text>
                        <DateTripleDropdown
                          value={values.credentials_expiry_date}
                          onChange={d => setFieldValue('credentials_expiry_date', d)}
                          yearRange={50}
                        />
                      </View>
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Button
                      style={globalStyles.mainButton}
                      onPress={() => setShowPastorSection(false)}
                    >
                      {t('back')}
                    </Button>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Button
                      style={globalStyles.mainButton}
                      onPress={() => handleSubmit()}
                    >
                      {t('save')}
                    </Button>
                  </View>
                </View>
                </>)}
              </View>
                  </Col>
                </Row>
              </Grid>
            )}
          </Formik>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}

