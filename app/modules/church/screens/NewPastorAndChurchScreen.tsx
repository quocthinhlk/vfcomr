import React, {useRef, useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {churchStyles} from '../styles';
import {formStyles, FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {Formik} from 'formik';
import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {AddChurchFormValues, useFormOptions} from './utils/addChurch.utils';
import {CountryPicker} from 'react-native-country-codes-picker';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import HelpIcon from '../../../shared/components/HelpIcon';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {Col, Row, Grid} from 'react-native-easy-grid';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import {ROLES} from '../../../shared/utils/permissions';

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

type CombinedFormValues = AddChurchFormValues & {
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
  user_country_id: string;
  credentials: string;
  credentials_from: string;
  credentials_expiry_date: Date | null;
  user_email_address: string;
  user_mobile_phone: string;
};

const CHURCH_DRAFT_KEY = 'new_pastor_and_church_church_draft_v1';

const CHURCH_REQUIRED_KEYS = [
  'name', 'church_type_id',
  'geographical_region_id',
  'country_id', 'currency_id', 'email_address', 'date_of_birth',
];

const USER_REQUIRED_KEYS = [
  'username', 'password', 'title', 'first_name', 'user_role_id',
  'user_language_id', 'user_church_id', 'user_country_id', 'user_email_address', 'user_mobile_phone',
];

export default function NewPastorAndChurchScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const scrollRef = useRef<ScrollView>(null);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrorText, setFieldErrorText] = useState<Record<string, string>>({});
  const [fieldY, setFieldY] = useState<Record<string, number>>({});

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
      name: t('churchName') || 'Church Name',
      is_first_msc: 'Is this the first MSC?',
      msc_parent_id: 'MSC Designated Parent',
      church_type_id: t('churchType') || 'Church Type',
      geographical_region_id: t('geographicalRegion') || 'Geographical Region',
      country_id: t('nation') || 'Nation',
      city_id: t('cityTownVillage') || 'City / Town / Village',
      currency_id: t('currency') || 'Currency',
      email_address: t('emailAddress') || 'Email Address',
      date_of_birth: t('dob') || 'Date of Birth',
      username: t('username') || 'Username',
      password: t('password') || 'Password',
      title: t('titleOfChurchRole') || 'Title of Church Role',
      first_name: t('firstName') || 'First Name',
      user_role_id: t('omrStatus') || 'OMR Status',
      user_language_id: t('language') || 'Language',
      user_church_id: t('church') || 'Church',
      user_country_id: t('nation') || 'Nation',
      user_email_address: t('emailAddress') || 'Email Address',
      user_mobile_phone: t('mobilePhone') || 'Mobile Phone',
    };
    const label = labelByKey[key] || key;
    return `${label} is a required field`;
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

  const [showPastorSection, setShowPastorSection] = useState(false);

  const {
    motherChurchOptions,
    churchTypeOptions,
    churchNetworkOptions,
    languageOptions,
    churchRegionOptions,
    geographicalRegionOptions,
    languageRegionOptions,
    countryOptions,
    localCurrencyOptions,
  } = useFormOptions();

  const {
    imagePath: churchImagePath,
    handleImagePick: pickChurchImage,
    clearImage: clearChurchImage,
  } = useImagePicker({width: 1600, height: 900});
  const {
    imagePath: userImagePath,
    handleImagePick: pickUserImage,
    clearImage: clearUserImage,
  } = useImagePicker();

  const [cityOptions, setCityOptions] = useState<{label: string; value: string}[]>([]);
  const loadCities = async (countryId: string | number) => {
    try {
      const res = await api.get(`cities/country/${countryId}`, {params: {sort_by: 'name', sort_desc: false}});
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCityOptions(list.map((x: any) => ({label: x.name, value: String(x.id)})));
    } catch {}
  };

  const PAGE_LIMIT = DEFAULT_PAGE_LIMIT;
  const [langOptions, setLangOptions] = useState(languageOptions);
  const [langPage, setLangPage] = useState(1);
  const [langHasNext, setLangHasNext] = useState(false);
  const [langQuery, setLangQuery] = useState('');
  const [userCountryItems, setUserCountryItems] = useState<{id: number; name: string}[]>([]);
  const [userCountryTotal, setUserCountryTotal] = useState<number>(0);
  const [userCountryPage, setUserCountryPage] = useState<number>(1);
  const [userCountryQuery, setUserCountryQuery] = useState<string>('');
  const [prefixOptions, setPrefixOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<Array<{id: number; name: string}>>([]);
  const [credentialOptions, setCredentialOptions] = useState<string[]>([]);
  const [userCountryCode, setUserCountryCode] = useState<string>('SG');
  const [userCallingCode, setUserCallingCode] = useState<string>('65');
  const [showUserCountryPicker, setShowUserCountryPicker] = useState(false);
  const [initialValues, setInitialValues] = useState<CombinedFormValues>({
    name: '', short_name: '', is_msc: '', is_first_msc: '', enable_cpm: '', parent_id: '', msc_parent_id: '', language_id: '',
    church_type_id: '', pastor_id: '', church_network_id: '', church_region_id: '',
    geographical_region_id: '', language_region_id: '', sensitive_nation: '', country_id: '',
    currency_id: '', city_id: '', photo_dir: '', service_address_street: '',
    service_address_postal_code: '', mailing_address_postal_code: '', office_address_street: '',
    office_address_postal_code: '', office_phone: '', office_fax: '', email_address: '',
    website: '', facebook: '', instagram: '', twitter: '', date_of_birth: null,
    username: '', password: '', prefix: '', title: '', first_name: '', last_name: '',
    user_role_id: '', user_sensitive_nation: '', user_language_id: '', user_church_id: '', user_country_id: '',
    credentials: '', credentials_from: '', credentials_expiry_date: null,
    user_email_address: '', user_mobile_phone: '',
  });
  const [draftLoaded, setDraftLoaded] = useState(false);

  const formatPhoneReadable = (digits: string) => {
    if (!digits) {
      return '';
    }
    const only = String(digits).replace(/\D/g, '').slice(0, 15);
    return only.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  const loadLanguages = async (page: number, name?: string) => {
    try {
      const res = await api.get('languages', {
        params: {page, limit: PAGE_LIMIT, sort_by: 'name', sort_desc: false, ...(name?.trim() ? {name: name.trim()} : {})},
      });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setLangOptions(prev => (page === 1 ? items : [...prev, ...items]));
      setLangPage(page);
      setLangHasNext(!!res.data?.data?.has_next);
    } catch {}
  };

  const loadUserCountries = async (page: number, name?: string) => {
    try {
      const res = await api.get('/countries', {
        params: {
          page,
          limit: PAGE_LIMIT,
          sort_by: 'name',
          sort_desc: false,
          ...(name?.trim() ? {name: name.trim()} : {}),
        },
      });
      const data = res?.data?.data;
      const items = Array.isArray(data?.items) ? data.items : [];
      const mapped = items.map((c: any) => ({id: c.id, name: c.name}));
      setUserCountryItems(prev => (page === 1 ? mapped : [...prev, ...mapped]));
      setUserCountryPage(data?.page ?? page);
      setUserCountryTotal(data?.total ?? mapped.length);
    } catch {}
  };

  const userCountryDropdownData = useMemo(
    () => userCountryItems.map(c => ({label: c.name, value: String(c.id)})),
    [userCountryItems],
  );

  useEffect(() => {
    if (!langQuery && langPage === 1) {
      setLangOptions(languageOptions);
    }
  }, [languageOptions]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHURCH_DRAFT_KEY);
        if (!mounted) {
          return;
        }
        if (raw) {
          const saved = JSON.parse(raw) as Partial<CombinedFormValues> & {
            date_of_birth?: string | null;
          };
          setInitialValues(prev => ({
            ...prev,
            name: saved.name ?? prev.name,
            short_name: saved.short_name ?? prev.short_name,
            is_msc: saved.is_msc ?? prev.is_msc,
            is_first_msc: (saved as any).is_first_msc ?? prev.is_first_msc,
            enable_cpm: saved.enable_cpm ?? prev.enable_cpm,
            parent_id: saved.parent_id ?? prev.parent_id,
            msc_parent_id: (saved as any).msc_parent_id ?? prev.msc_parent_id,
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
            date_of_birth: saved.date_of_birth
              ? new Date(saved.date_of_birth as any)
              : prev.date_of_birth,
          }));
        } else {
          try {
            const res = await api.get('churches/defaults');
            if (!mounted) {
              return;
            }
            const defaults = res?.data?.data;
            if (defaults) {
              setInitialValues(prev => ({
                ...prev,
                church_network_id: defaults.church_network_id
                  ? String(defaults.church_network_id)
                  : prev.church_network_id,
                church_region_id: defaults.church_region_id
                  ? String(defaults.church_region_id)
                  : prev.church_region_id,
                geographical_region_id: defaults.geographical_region_id
                  ? String(defaults.geographical_region_id)
                  : prev.geographical_region_id,
                language_region_id: defaults.language_region_id
                  ? String(defaults.language_region_id)
                  : prev.language_region_id,
              }));
            }
          } catch (error) {
            console.error('Error loading church defaults:', error);
          }
        }
      } catch {
        // ignore storage errors
      } finally {
        if (mounted) {
          setDraftLoaded(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .get('/users/form-data')
      .then(res => {
        if (!mounted) {
          return;
        }
        const d = res?.data?.data;
        setPrefixOptions(d?.prefixes || []);
        setRoleOptions(Array.isArray(d?.roles) ? d.roles : []);
        setCredentialOptions(d?.credentials || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const pastorLeader = roleOptions.find(r => r?.id === ROLES.PASTOR_LEADER);
    if (!pastorLeader) {
      return;
    }
    setInitialValues(prev => {
      if (prev.user_role_id) {
        return prev;
      }
      return {...prev, user_role_id: String(pastorLeader.id)};
    });
  }, [roleOptions]);

  const handleSaveChurchAndContinue = async (values: CombinedFormValues) => {
    setFieldErrorText({});
    const nextInvalid: Record<string, boolean> = {};
    CHURCH_REQUIRED_KEYS.forEach(k => {
      nextInvalid[k] = !(values as any)[k];
    });
    nextInvalid.is_first_msc = values.is_msc === 'Yes' && !values.is_first_msc;
    nextInvalid.msc_parent_id =
      values.is_msc === 'Yes' &&
      values.is_first_msc === 'No' &&
      !values.msc_parent_id;
    setInvalid(prev => ({...prev, ...nextInvalid}));

    const newFieldErrors: Record<string, string> = {};
    Object.keys(nextInvalid).forEach(k => {
      if (nextInvalid[k]) {
        newFieldErrors[k] = requiredFieldMessageForKey(k);
      }
    });
    setFieldErrorText(newFieldErrors);

    const firstInvalidKey = CHURCH_REQUIRED_KEYS.find(k => nextInvalid[k]);
    if (firstInvalidKey) {
      scrollToField(firstInvalidKey);
      return;
    }
    if (nextInvalid.is_first_msc) {
      scrollToField('is_first_msc');
      return;
    }
    if (nextInvalid.msc_parent_id) {
      scrollToField('msc_parent_id');
      return;
    }

    // Server-side validation for church fields (ignore user.* errors).
    try {
      const churchPayloadForValidate: any = {
        name: values.name,
        short_name: values.short_name,
        is_msc: values.is_msc === 'Yes',
        is_first_msc: values.is_msc === 'Yes' && values.is_first_msc === 'Yes',
        enable_cpm: values.enable_cpm ? values.enable_cpm === 'Yes' : false,
        parent_id: values.parent_id ? Number(values.parent_id) : null,
        msc_parent_id:
          values.is_msc === 'Yes' &&
          values.is_first_msc === 'No' &&
          values.msc_parent_id
            ? Number(values.msc_parent_id)
            : 0,
        language_id: values.language_id ? Number(values.language_id) : null,
        church_type_id: values.church_type_id ? Number(values.church_type_id) : null,
        church_network_id: values.church_network_id ? Number(values.church_network_id) : null,
        church_region_id: values.church_region_id ? Number(values.church_region_id) : null,
        geographical_region_id: values.geographical_region_id ? Number(values.geographical_region_id) : 0,
        language_region_id: values.language_region_id ? Number(values.language_region_id) : 0,
        country_id: values.country_id ? Number(values.country_id) : null,
        city_id: values.city_id ? Number(values.city_id) : 0,
        currency_id: values.currency_id ? Number(values.currency_id) : null,
        sensitive_nation: values.sensitive_nation === 'Yes',
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
        date_of_birth: values.date_of_birth
          ? `${values.date_of_birth.getFullYear()}-${String(values.date_of_birth.getMonth() + 1).padStart(2, '0')}-${String(values.date_of_birth.getDate()).padStart(2, '0')}`
          : null,
        service_venue: '',
        church_planting_projection_id: 0,
        photo_dir: values.photo_dir,
        mailing_address_street: '',
        property: '',
      };

      await api.post('churches/with-user', {church: churchPayloadForValidate, user: {}});
    } catch (e: any) {
      const apiErrors = e?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        const nextInvalidFromApi: Record<string, boolean> = {};
        const nextFieldErrorsFromApi: Record<string, string> = {};

        Object.entries(apiErrors).forEach(([key, value]) => {
          if (typeof value !== 'string' || !value.trim()) {
            return;
          }
          if (!key.startsWith('church.')) {
            return;
          }
          const churchKey = key.slice('church.'.length);
          // City is not required in this flow.
          if (churchKey === 'city_id') {
            return;
          }
          nextInvalidFromApi[churchKey] = true;
          nextFieldErrorsFromApi[churchKey] = value;
        });

        if (Object.keys(nextFieldErrorsFromApi).length > 0) {
          setInvalid(prev => ({...prev, ...nextInvalidFromApi}));
          setFieldErrorText(prev => ({...prev, ...nextFieldErrorsFromApi}));
          const firstKey = Object.keys(nextFieldErrorsFromApi)[0];
          if (firstKey) {
            scrollToField(firstKey);
          }
          return;
        }
        // Only user.* errors returned => church data passed validation.
      } else {
        // If server doesn't return structured validation errors, don't block the flow here.
      }
    }

    try {
      const draftToStore = {
        name: values.name,
        short_name: values.short_name,
        is_msc: values.is_msc,
        is_first_msc: values.is_first_msc,
        enable_cpm: values.enable_cpm,
        parent_id: values.parent_id,
        msc_parent_id: values.msc_parent_id,
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
        date_of_birth: values.date_of_birth ? values.date_of_birth.toISOString() : null,
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
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('addNewChurchAndPastor')} showMenu={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={
            Platform.OS === 'ios'
              ? hs(64)
              : (StatusBar.currentHeight || 0) + hs(50)
          }
          style={{flex: 1, backgroundColor: C.background}}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="always"
            style={{backgroundColor: C.background}}
            contentContainerStyle={{paddingBottom: ms(24)}}>

            {draftLoaded && (
              <Formik<CombinedFormValues>
                enableReinitialize
                initialValues={initialValues}
                onSubmit={async values => {
                  try {
                    console.log('[NewPastorAndChurchScreen] submit start');
                    setFieldErrorText({});
                    const newInvalid: Record<string, boolean> = {};
                    [...CHURCH_REQUIRED_KEYS, ...USER_REQUIRED_KEYS].forEach(k => {
                      newInvalid[k] = !(values as any)[k];
                    });
                    newInvalid.is_first_msc =
                      values.is_msc === 'Yes' && !values.is_first_msc;
                    newInvalid.msc_parent_id =
                      values.is_msc === 'Yes' &&
                      values.is_first_msc === 'No' &&
                      !values.msc_parent_id;
                    setInvalid(newInvalid);

                    const newFieldErrors: Record<string, string> = {};
                    Object.keys(newInvalid).forEach(k => {
                      if (newInvalid[k]) {
                        newFieldErrors[k] = requiredFieldMessageForKey(k);
                      }
                    });
                    setFieldErrorText(newFieldErrors);

                    const firstInvalidKey = [
                      ...CHURCH_REQUIRED_KEYS,
                      'is_first_msc',
                      'msc_parent_id',
                      ...USER_REQUIRED_KEYS,
                    ].find(k => newInvalid[k]);
                    if (firstInvalidKey) {
                      scrollToField(firstInvalidKey);
                      return;
                    }

                    let churchPhotoPath: string | null = null;
                    if (churchImagePath) {
                      const form = new FormData();
                      const fileName = churchImagePath.split('/').pop() || 'photo.jpg';
                      form.append('file', {uri: churchImagePath, name: fileName, type: 'image/jpeg'} as any);
                      form.append('entity_type', 'churches');
                      form.append('alt_text', values.name || 'church photo');
                      const uploadRes = await api.post('images/upload', form, {
                        headers: {'Content-Type': 'multipart/form-data'},
                      });
                      churchPhotoPath = uploadRes?.data?.data?.path || null;
                    }
                    let userPhotoPath: string | null = null;
                    if (userImagePath) {
                      const form = new FormData();
                      const fileName = userImagePath.split('/').pop() || 'photo.jpg';
                      form.append('file', {uri: userImagePath, name: fileName, type: 'image/jpeg'} as any);
                      form.append('entity_type', 'users');
                      form.append('alt_text', values.first_name || 'user photo');
                      const uploadRes = await api.post('images/upload', form, {
                        headers: {'Content-Type': 'multipart/form-data'},
                      });
                      userPhotoPath = uploadRes?.data?.data?.path || null;
                    }

                    const churchPayload: any = {
                      name: values.name,
                      short_name: values.short_name,
                      is_msc: values.is_msc === 'Yes',
                      is_first_msc:
                        values.is_msc === 'Yes' && values.is_first_msc === 'Yes',
                      enable_cpm: values.enable_cpm ? values.enable_cpm === 'Yes' : false,
                      parent_id: values.parent_id ? Number(values.parent_id) : null,
                      msc_parent_id:
                        values.is_msc === 'Yes' &&
                        values.is_first_msc === 'No' &&
                        values.msc_parent_id
                          ? Number(values.msc_parent_id)
                          : 0,
                      language_id: values.language_id ? Number(values.language_id) : null,
                      church_type_id: values.church_type_id ? Number(values.church_type_id) : null,
                      church_network_id: values.church_network_id ? Number(values.church_network_id) : null,
                      church_region_id: values.church_region_id ? Number(values.church_region_id) : null,
                      geographical_region_id: values.geographical_region_id ? Number(values.geographical_region_id) : 0,
                      language_region_id: values.language_region_id ? Number(values.language_region_id) : 0,
                      country_id: values.country_id ? Number(values.country_id) : null,
                      // Backend currently validates city_id as required; send 0 when not selected.
                      city_id: values.city_id ? Number(values.city_id) : 0,
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
                      date_of_birth: values.date_of_birth
                        ? `${values.date_of_birth.getFullYear()}-${String(values.date_of_birth.getMonth() + 1).padStart(2, '0')}-${String(values.date_of_birth.getDate()).padStart(2, '0')}`
                        : null,
                      service_venue: '',
                      church_planting_projection_id: 0,
                      photo_dir: values.photo_dir,
                      mailing_address_street: '',
                      property: '',
                    };

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
                      country_id: values.user_country_id ? Number(values.user_country_id) : null,
                      mobile_phone: formattedUserPhone,
                      email_address: values.user_email_address,
                      credentials: values.credentials || undefined,
                      credentials_from: values.credentials_from || undefined,
                      credentials_expiry_date: values.credentials_expiry_date
                        ? `${values.credentials_expiry_date.getFullYear()}-${String(values.credentials_expiry_date.getMonth() + 1).padStart(2, '0')}-${String(values.credentials_expiry_date.getDate()).padStart(2, '0')}`
                        : undefined,
                    };

                    const payload = {church: churchPayload, user: userPayload};
                    console.log('[NewPastorAndChurchScreen] submit payload:', payload);
                    const res = await api.post('churches/with-user', payload);
                    console.log('[NewPastorAndChurchScreen] submit response:', res?.data);
                    try {
                      await AsyncStorage.removeItem(CHURCH_DRAFT_KEY);
                    } catch {}
                    Alert.alert(t('success'), 'Church and User created successfully!');
                    navigation.navigate('Churches');
                  } catch (e: any) {
                    console.error('[NewPastorAndChurchScreen] submit error:', {
                      message: e?.message,
                      status: e?.response?.status,
                      data: e?.response?.data,
                    });
                    const apiErrors = e?.response?.data?.errors;
                    if (apiErrors && typeof apiErrors === 'object') {
                      const nextInvalid: Record<string, boolean> = {};
                      const nextFieldErrors: Record<string, string> = {};

                      const mapUserKeyToFormKey = (userKey: string) => {
                        // Keys from API: user.<field>
                        // Form keys: some are prefixed with user_
                        switch (userKey) {
                          case 'role_id':
                            return 'user_role_id';
                          case 'language_id':
                            return 'user_language_id';
                          case 'church_id':
                            return 'user_church_id';
                          case 'email_address':
                            return 'user_email_address';
                          case 'mobile_phone':
                            return 'user_mobile_phone';
                          case 'sensitive_nation':
                            return 'user_sensitive_nation';
                          default:
                            return userKey; // username, password, first_name, last_name, title, prefix, etc.
                        }
                      };

                      Object.entries(apiErrors).forEach(([key, value]) => {
                        if (typeof value !== 'string' || !value.trim()) {
                          return;
                        }
                        if (key.startsWith('church.')) {
                          const churchKey = key.slice('church.'.length);
                          nextInvalid[churchKey] = true;
                          nextFieldErrors[churchKey] = value;
                          return;
                        }
                        if (key.startsWith('user.')) {
                          const userKey = key.slice('user.'.length);
                          const formKey = mapUserKeyToFormKey(userKey);
                          nextInvalid[formKey] = true;
                          nextFieldErrors[formKey] = value;
                          return;
                        }
                        // Fallback: already a form key
                        nextInvalid[key] = true;
                        nextFieldErrors[key] = value;
                      });
                      if (Object.keys(nextFieldErrors).length > 0) {
                        setInvalid(prev => ({...prev, ...nextInvalid}));
                        setFieldErrorText(nextFieldErrors);
                        const firstKey = Object.keys(nextFieldErrors)[0];
                        if (firstKey) {
                          scrollToField(firstKey);
                        }
                        return;
                      }
                    }
                    Alert.alert(
                      t('error'),
                      e?.response?.data?.message || e?.message || t('failedToCreateChurch'),
                    );
                  }
                }}>
                {({values, handleChange, handleBlur, handleSubmit, setFieldValue}) => (
                  <Grid>
                    <Row>
                      <Col>
                        <View style={{gap: ms(12)}}>

                          {!showPastorSection && (
                            <>
                              <Text
                                category="label"
                                style={[churchStyles.title, {marginTop: ms(8), color: C.textPrimary}]}>
                                {t('churchData')}
                              </Text>

                              {/* Church Name */}
                              <View onLayout={e => setFieldPos('name', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('churchName')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('churchName')} message={t('helpChurchName')} />
                                  </View>
                                  <AppInput
                                    value={values.name}
                                    autoCapitalize="words"
                                    onChangeText={text => {
                                      setFieldValue('name', text);
                                      setInvalid(prev => ({...prev, name: false}));
                                      clearFieldError('name');
                                    }}
                                    onBlur={handleBlur('name')}
                                    error={!!invalid.name}
                                  />
                                  {renderFieldError('name')}
                                </View>
                              </View>

                              {/* Short Name */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('shortName')}
                                      <Text style={formStyles.subLabel}> [{t('only10Chars')}]</Text>
                                    </Text>
                                  </View>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.short_name}
                                    onChangeText={text =>
                                      setFieldValue('short_name', (text || '').slice(0, 10))
                                    }
                                    onBlur={handleBlur('short_name')}
                                  />
                                </View>
                              </View>

                              {/* MSC */}
                              <View onLayout={e => setFieldPos('is_msc', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('msc')}?
                                    </Text>
                                  </View>
                                  <ElementDropdown
                                    data={[{label: t('yes'), value: 'Yes'}, {label: t('no'), value: 'No'}]}
                                    value={values.is_msc as any}
                                    onChange={v => {
                                      setFieldValue('is_msc', (v as string) || '');
                                      setInvalid(prev => ({...prev, is_msc: false}));
                                      clearFieldError('is_msc');
                                      const next = (v as string) || '';
                                      if (next !== 'Yes') {
                                        setFieldValue('is_first_msc', '');
                                        setFieldValue('msc_parent_id', '');
                                        setInvalid(prev => ({
                                          ...prev,
                                          is_first_msc: false,
                                          msc_parent_id: false,
                                        }));
                                        clearFieldError('is_first_msc');
                                        clearFieldError('msc_parent_id');
                                      }
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.is_msc ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.is_msc}
                                  />
                                  {renderFieldError('is_msc')}
                                </View>
                              </View>

                              {values.is_msc === 'Yes' && (
                                <View onLayout={e => setFieldPos('is_first_msc', e.nativeEvent.layout.y)}>
                                  <View>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      Is this the first MSC? <Text style={{color: '#c00000'}}>*</Text>
                                    </Text>
                                    <ElementDropdown
                                      data={[
                                        {label: t('yes'), value: 'Yes'},
                                        {label: t('no'), value: 'No'},
                                      ]}
                                      value={values.is_first_msc as any}
                                      onChange={v => {
                                        setFieldValue('is_first_msc', (v as string) || '');
                                        setInvalid(prev => ({...prev, is_first_msc: false}));
                                        clearFieldError('is_first_msc');
                                        const next = (v as string) || '';
                                        if (next !== 'No') {
                                          setFieldValue('msc_parent_id', '');
                                          setInvalid(prev => ({...prev, msc_parent_id: false}));
                                          clearFieldError('msc_parent_id');
                                        }
                                      }}
                                      placeholder={t('selectOption')}
                                      containerStyle={{
                                        backgroundColor: C.inputBg,
                                        borderColor: invalid?.is_first_msc ? '#db2d2d' : C.inputBorder,
                                      } as any}
                                      error={!!invalid?.is_first_msc}
                                    />
                                    {renderFieldError('is_first_msc')}
                                  </View>
                                </View>
                              )}

                              {/* Mother Church */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('motherChurch')}
                                    </Text>
                                  </View>
                                  <ElementDropdown
                                    data={motherChurchOptions}
                                    value={values.parent_id as any}
                                    onChange={v => setFieldValue('parent_id', v as any)}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                                  />
                                </View>
                              </View>

                              {values.is_msc === 'Yes' && values.is_first_msc === 'No' && (
                                <View onLayout={e => setFieldPos('msc_parent_id', e.nativeEvent.layout.y)}>
                                  <View>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      MSC Designated Parent <Text style={{color: '#c00000'}}>*</Text>
                                    </Text>
                                    <ElementDropdown
                                      data={motherChurchOptions}
                                      value={values.msc_parent_id as any}
                                      onChange={v => {
                                        setFieldValue('msc_parent_id', v as any);
                                        setInvalid(prev => ({...prev, msc_parent_id: false}));
                                        clearFieldError('msc_parent_id');
                                      }}
                                      placeholder={t('selectOption')}
                                      containerStyle={{
                                        backgroundColor: C.inputBg,
                                        borderColor: invalid?.msc_parent_id ? '#db2d2d' : C.inputBorder,
                                      } as any}
                                      error={!!invalid?.msc_parent_id}
                                    />
                                    {renderFieldError('msc_parent_id')}
                                  </View>
                                </View>
                              )}

                              {/* Language */}
                              <View onLayout={e => setFieldPos('language_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('languageUsedInTheService')}
                                    </Text>
                                  </View>
                                  <ElementDropdown
                                    data={langOptions}
                                    value={values.language_id as any}
                                    onChange={v => {
                                      setFieldValue('language_id', v as any);
                                      setInvalid(prev => ({...prev, language_id: false}));
                                      clearFieldError('language_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.language_id ? '#db2d2d' : C.inputBorder} as any}
                                    onFocus={async () => {
                                      if (langOptions.length === 0) {
                                        await loadLanguages(1);
                                      }
                                    }}
                                    onSearchText={async text => {
                                      setLangQuery(text);
                                      await loadLanguages(1, text);
                                    }}
                                    onEndReached={async () => {
                                      if (langHasNext) {
                                        await loadLanguages(langPage + 1, langQuery);
                                      }
                                    }}
                                    error={!!invalid?.language_id}
                                  />
                                  {renderFieldError('language_id')}
                                </View>
                              </View>

                              {/* Church Type */}
                              <View onLayout={e => setFieldPos('church_type_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('churchType')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('churchType')} message={t('helpChurchType')} />
                                  </View>
                                  <ElementDropdown
                                    data={churchTypeOptions}
                                    value={values.church_type_id as any}
                                    onChange={v => {
                                      setFieldValue('church_type_id', v as any);
                                      setInvalid(prev => ({...prev, church_type_id: false}));
                                      clearFieldError('church_type_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.church_type_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.church_type_id}
                                  />
                                  {renderFieldError('church_type_id')}
                                </View>
                              </View>

                              {/* Church Network */}
                              <View onLayout={e => setFieldPos('church_network_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('churchNetwork')}
                                    </Text>
                                    <HelpIcon title={t('churchNetwork')} message={t('helpChurchNetwork')} />
                                  </View>
                                  <ElementDropdown
                                    data={churchNetworkOptions}
                                    value={values.church_network_id as any}
                                    onChange={v => {
                                      setFieldValue('church_network_id', v as any);
                                      setInvalid(prev => ({...prev, church_network_id: false}));
                                      clearFieldError('church_network_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.church_network_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.church_network_id}
                                  />
                                  {renderFieldError('church_network_id')}
                                </View>
                              </View>

                              {/* Apostolic Region */}
                              <View onLayout={e => setFieldPos('church_region_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('apostolicRegion')}
                                    </Text>
                                    <HelpIcon title={t('apostolicRegion')} message={t('helpApostolicRegion')} />
                                  </View>
                                  <ElementDropdown
                                    data={churchRegionOptions}
                                    value={values.church_region_id as any}
                                    onChange={v => {
                                      setFieldValue('church_region_id', v as any);
                                      setInvalid(prev => ({...prev, church_region_id: false}));
                                      clearFieldError('church_region_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.church_region_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.church_region_id}
                                  />
                                  {renderFieldError('church_region_id')}
                                </View>
                              </View>

                              {/* Geographical Region */}
                              <View onLayout={e => setFieldPos('geographical_region_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('geographicalRegion')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('geographicalRegion')} message={t('helpGeographicalRegion')} />
                                  </View>
                                  <ElementDropdown
                                    data={geographicalRegionOptions}
                                    value={values.geographical_region_id as any}
                                    renderItem={createHierarchyDropdownRenderItem(C) as any}
                                    onChange={v => {
                                      setFieldValue('geographical_region_id', v as any);
                                      setInvalid(prev => ({...prev, geographical_region_id: false}));
                                      clearFieldError('geographical_region_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.geographical_region_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.geographical_region_id}
                                  />
                                  {renderFieldError('geographical_region_id')}
                                </View>
                              </View>

                              {/* Language Region */}
                              <View onLayout={e => setFieldPos('language_region_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('languageRegion')}
                                    </Text>
                                    <HelpIcon title={t('languageRegion')} message={t('helpLanguageRegion')} />
                                  </View>
                                  <ElementDropdown
                                    data={languageRegionOptions}
                                    value={values.language_region_id as any}
                                    onChange={v => {
                                      setFieldValue('language_region_id', v as any);
                                      setInvalid(prev => ({...prev, language_region_id: false}));
                                      clearFieldError('language_region_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.language_region_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.language_region_id}
                                  />
                                  {renderFieldError('language_region_id')}
                                </View>
                              </View>

                              {/* Sensitive Nation */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('inSensitiveNation')}?
                                    </Text>
                                    <HelpIcon title={t('sensitiveNation')} message={t('helpSensitiveNation')} />
                                  </View>
                                  <ElementDropdown
                                    data={[{label: t('yes'), value: 'Yes'}, {label: t('no'), value: 'No'}]}
                                    value={values.sensitive_nation as any}
                                    onChange={v => setFieldValue('sensitive_nation', (v as string) || '')}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                                  />
                                </View>
                              </View>

                              {/* Country */}
                              <View onLayout={e => setFieldPos('country_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('nation')} <Text status="danger">*</Text>
                                  </Text>
                                  <ElementDropdown
                                    data={countryOptions}
                                    value={values.country_id as any}
                                    onChange={v => {
                                      setFieldValue('country_id', v as any);
                                      setInvalid(prev => ({...prev, country_id: false}));
                                      clearFieldError('country_id');
                                      const id = v as any;
                                      if (id) {
                                        loadCities(id);
                                      }
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.country_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.country_id}
                                  />
                                  {renderFieldError('country_id')}
                                </View>
                              </View>

                              {/* City */}
                              {values.country_id ? (
                                <View>
                                  <View>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                        {t('cityTownVillage')} 
                                        {/* <Text status="danger">*</Text> */}
                                      </Text>
                                      <HelpIcon title={t('cityTownVillage')} message={t('helpCity')} />
                                    </View>
                                    <ElementDropdown
                                      data={cityOptions}
                                      value={values.city_id as any}
                                      onChange={v => {
                                        setFieldValue('city_id', v as any);
                                        setInvalid(prev => ({...prev, city_id: false}));
                                        clearFieldError('city_id');
                                      }}
                                      placeholder={t('selectOption')}
                                      containerStyle={{
                                        backgroundColor: C.inputBg,
                                        borderColor: invalid?.city_id ? '#db2d2d' : C.inputBorder,
                                      } as any}
                                      error={!!invalid?.city_id}
                                    />
                                    {renderFieldError('city_id')}
                                  </View>
                                </View>
                              ) : null}

                              {/* Currency */}
                              <View onLayout={e => setFieldPos('currency_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('currency')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('currency')} message={t('helpCurrency')} />
                                  </View>
                                  <ElementDropdown
                                    data={localCurrencyOptions}
                                    value={values.currency_id as any}
                                    onChange={v => {
                                      setFieldValue('currency_id', v as any);
                                      setInvalid(prev => ({...prev, currency_id: false}));
                                      clearFieldError('currency_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.currency_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.currency_id}
                                  />
                                  {renderFieldError('currency_id')}
                                </View>
                              </View>

                              {/* Church Photo */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('churchPhoto')}
                                      <Text style={formStyles.subLabel}> [{t('max5mb')}]</Text>
                                    </Text>
                                    <HelpIcon title={t('churchPhoto')} message={t('helpChurchPhoto')} />
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => pickChurchImage()}
                                    style={[formStyles.avatarSquare as any, {backgroundColor: C.inputBg, borderColor: C.inputBorder}] as any}>
                                    {churchImagePath ? (
                                      <>
                                        <Image source={{uri: churchImagePath}} style={formStyles.avatarImage as any} resizeMode="cover" />
                                        <TouchableOpacity onPress={clearChurchImage} style={formStyles.avatarClose as any}>
                                          <Text style={{color: '#fff'}}>✗</Text>
                                        </TouchableOpacity>
                                      </>
                                    ) : (
                                      <Text style={[formStyles.avatarPlus as any, {color: C.textSecondary}] as any}>+</Text>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Service Address */}
                              <View>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('serviceAddress')}
                                  </Text>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.service_address_street}
                                    onChangeText={handleChange('service_address_street')}
                                    onBlur={handleBlur('service_address_street')}
                                  />
                                </View>
                              </View>

                              {/* Service Postal Code */}
                              <View>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('servicePostalCode')}
                                  </Text>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.service_address_postal_code}
                                    onChangeText={handleChange('service_address_postal_code')}
                                    onBlur={handleBlur('service_address_postal_code')}
                                  />
                                </View>
                              </View>

                              {/* Email Address */}
                              <View onLayout={e => setFieldPos('email_address', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('emailAddress')} <Text status="danger">*</Text>
                                    </Text>
                                  </View>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.email_address}
                                    onChangeText={text => {
                                      setFieldValue('email_address', text);
                                      setInvalid(prev => ({...prev, email_address: false}));
                                      clearFieldError('email_address');
                                    }}
                                    onBlur={handleBlur('email_address')}
                                    error={!!invalid.email_address}
                                  />
                                  {renderFieldError('email_address')}
                                </View>
                              </View>

                              {/* Website */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('website')}
                                    </Text>
                                    <HelpIcon title={t('website')} message={t('helpWebsite')} />
                                  </View>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.website}
                                    onChangeText={handleChange('website')}
                                    onBlur={handleBlur('website')}
                                  />
                                </View>
                              </View>

                              {/* Facebook */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('facebook')}
                                    </Text>
                                    <HelpIcon title={t('facebook')} message={t('helpFacebook')} />
                                  </View>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.facebook}
                                    onChangeText={handleChange('facebook')}
                                    onBlur={handleBlur('facebook')}
                                  />
                                </View>
                              </View>

                              {/* Instagram */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      Instagram
                                    </Text>
                                    <HelpIcon title="Instagram" message={t('helpInstagram')} />
                                  </View>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.instagram}
                                    onChangeText={handleChange('instagram')}
                                    onBlur={handleBlur('instagram')}
                                  />
                                </View>
                              </View>

                              {/* X (Twitter) */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      X
                                    </Text>
                                    <HelpIcon title="X" message={t('helpX')} />
                                  </View>
                                  <AppInput
                                    autoCapitalize="none"
                                    value={values.twitter}
                                    onChangeText={handleChange('twitter')}
                                    onBlur={handleBlur('twitter')}
                                  />
                                </View>
                              </View>

                              {/* Date of Birth */}
                              <View onLayout={e => setFieldPos('date_of_birth', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('dob')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('dob')} message={t('helpDob')} />
                                  </View>
                                  <DateTripleDropdown
                                    value={values.date_of_birth}
                                    onChange={d => {
                                      setFieldValue('date_of_birth', d);
                                      setInvalid(prev => ({...prev, date_of_birth: false}));
                                      clearFieldError('date_of_birth');
                                    }}
                                    yearRange={50}
                                    startYear={new Date().getFullYear() - 50}
                                    error={!!invalid?.date_of_birth}
                                  />
                                  {renderFieldError('date_of_birth')}
                                </View>
                              </View>

                              <AppButton
                                onPress={() => handleSaveChurchAndContinue(values)}
                                style={globalStyles.mainButton}>
                                {t('saveAndContinuePastorDetails')}
                              </AppButton>
                            </>
                          )}

                          {showPastorSection && (
                            <>
                              <Text
                                category="label"
                                style={[churchStyles.title, {marginTop: 16, color: C.textPrimary}]}>
                                {t('pastorLeader')}
                              </Text>

                              {/* Prefix */}
                              <View>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    Prefix
                                  </Text>
                                  <ElementDropdown
                                    data={prefixOptions.map(p => ({label: p, value: p}))}
                                    value={values.prefix as any}
                                    onChange={v => setFieldValue('prefix', (v as string) || '')}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                                  />
                                </View>
                              </View>

                              {/* First Name */}
                              <View onLayout={e => setFieldPos('first_name', e.nativeEvent.layout.y)}>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('firstName')} <Text status="danger">*</Text>
                                  </Text>
                                  <AppInput
                                    value={values.first_name}
                                    autoCapitalize="words"
                                    onChangeText={text => {
                                      setFieldValue('first_name', text);
                                      setInvalid(prev => ({...prev, first_name: false}));
                                      clearFieldError('first_name');
                                    }}
                                    onBlur={handleBlur('first_name')}
                                    error={!!invalid.first_name}
                                  />
                                  {renderFieldError('first_name')}
                                </View>
                              </View>

                              {/* Last Name */}
                              <View>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('lastName')}
                                  </Text>
                                  <AppInput
                                    value={values.last_name}
                                    autoCapitalize="words"
                                    onChangeText={handleChange('last_name')}
                                    onBlur={handleBlur('last_name')}
                                  />
                                </View>
                              </View>

                              {/* Username */}
                              <View onLayout={e => setFieldPos('username', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('username')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('username')} message={t('usernameHelp')} />
                                  </View>
                                  <AppInput
                                    value={values.username}
                                    autoCapitalize="none"
                                    onChangeText={text => {
                                      setFieldValue('username', text);
                                      setInvalid(prev => ({...prev, username: false}));
                                      clearFieldError('username');
                                    }}
                                    onBlur={handleBlur('username')}
                                    error={!!invalid.username}
                                  />
                                  {renderFieldError('username')}
                                </View>
                              </View>

                              {/* Password */}
                              <View onLayout={e => setFieldPos('password', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('password')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('password')} message={t('passwordHelp')} />
                                  </View>
                                  <AppInput
                                    value={values.password}
                                    autoCapitalize="none"
                                    secureTextEntry
                                    autoComplete="off"
                                    textContentType="none"
                                    importantForAutofill="no"
                                    autoCorrect={false}
                                    onChangeText={text => {
                                      setFieldValue('password', text);
                                      setInvalid(prev => ({...prev, password: false}));
                                      clearFieldError('password');
                                    }}
                                    onBlur={handleBlur('password')}
                                    error={!!invalid.password}
                                  />
                                  {renderFieldError('password')}
                                </View>
                              </View>

                              {/* Ministry Title */}
                              <View onLayout={e => setFieldPos('title', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('titleOfChurchRole')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('ministryTitle')} message={t('helpMinistryTitle')} />
                                  </View>
                                  <AppInput
                                    value={values.title}
                                    autoCapitalize="words"
                                    onChangeText={text => {
                                      setFieldValue('title', text);
                                      setInvalid(prev => ({...prev, title: false}));
                                      clearFieldError('title');
                                    }}
                                    onBlur={handleBlur('title')}
                                    error={!!invalid.title}
                                  />
                                  {renderFieldError('title')}
                                </View>
                              </View>

                              {/* OMR Status */}
                              <View onLayout={e => setFieldPos('user_role_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('omrStatus')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('omrStatus')} message={t('helpOmrStatus')} />
                                  </View>
                                  <ElementDropdown
                                    data={roleOptions.map(r => ({label: r.name, value: String(r.id)}))}
                                    value={values.user_role_id as any}
                                    onChange={v => {
                                      setFieldValue('user_role_id', (v as string) || '');
                                      setInvalid(prev => ({...prev, user_role_id: false}));
                                      clearFieldError('user_role_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.user_role_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.user_role_id}
                                  />
                                  {renderFieldError('user_role_id')}
                                </View>
                              </View>

                              {/* User Photo */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('userPhoto')}
                                      <Text style={formStyles.subLabel}> [{t('max5mb')}]</Text>
                                    </Text>
                                    <HelpIcon title={t('userPhoto')} message={t('helpUserPhoto')} size={16} offsetY={-2} />
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => pickUserImage()}
                                    style={[formStyles.avatarSquare as any, {backgroundColor: C.inputBg, borderColor: C.inputBorder}] as any}>
                                    {userImagePath ? (
                                      <>
                                        <Image source={{uri: userImagePath}} style={formStyles.avatarImage as any} resizeMode="cover" />
                                        <TouchableOpacity onPress={clearUserImage} style={formStyles.avatarClose as any}>
                                          <Text style={{color: '#fff'}}>✗</Text>
                                        </TouchableOpacity>
                                      </>
                                    ) : (
                                      <Text style={[formStyles.avatarPlus as any, {color: C.textSecondary}] as any}>+</Text>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* User Sensitive Nation */}
                              <View>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('inSensitiveNation')}?
                                    </Text>
                                    <HelpIcon title={t('sensitiveNation')} message={t('helpSensitiveNation')} />
                                  </View>
                                  <ElementDropdown
                                    data={[{label: t('yes'), value: 'Yes'}, {label: t('no'), value: 'No'}]}
                                    value={values.user_sensitive_nation as any}
                                    onChange={v => setFieldValue('user_sensitive_nation', (v as string) || '')}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                                  />
                                </View>
                              </View>

                              {/* User Language */}
                              <View onLayout={e => setFieldPos('user_language_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('theLanguageOmrWillUseForYou')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('language')} message={t('helpUserLanguage')} />
                                  </View>
                                  <ElementDropdown
                                    data={langOptions}
                                    value={values.user_language_id as any}
                                    onChange={v => {
                                      setFieldValue('user_language_id', v as any);
                                      setInvalid(prev => ({...prev, user_language_id: false}));
                                      clearFieldError('user_language_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.user_language_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.user_language_id}
                                  />
                                  {renderFieldError('user_language_id')}
                                </View>
                              </View>

                              {/* User Church */}
                              <View onLayout={e => setFieldPos('user_church_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('churchBelongsTo')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('church')} message={t('helpUserChurch')} />
                                  </View>
                                  <ElementDropdown
                                    data={motherChurchOptions}
                                    value={values.user_church_id as any}
                                    onChange={v => {
                                      setFieldValue('user_church_id', v as any);
                                      setInvalid(prev => ({...prev, user_church_id: false}));
                                      clearFieldError('user_church_id');
                                    }}
                                    placeholder={t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.user_church_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.user_church_id}
                                  />
                                  {renderFieldError('user_church_id')}
                                </View>
                              </View>

                              {/* User Nation */}
                              <View onLayout={e => setFieldPos('user_country_id', e.nativeEvent.layout.y)}>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('nation') || 'Nation'} <Text status="danger">*</Text>
                                  </Text>
                                  <ElementDropdown
                                    data={userCountryDropdownData}
                                    value={values.user_country_id as any}
                                    onChange={v => {
                                      setFieldValue('user_country_id', (v as string) || '');
                                      setInvalid(prev => ({...prev, user_country_id: false}));
                                      clearFieldError('user_country_id');
                                    }}
                                    placeholder={t('selectCountry') || t('selectOption')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.user_country_id ? '#db2d2d' : C.inputBorder} as any}
                                    error={!!invalid?.user_country_id}
                                    onFocus={async () => {
                                      if (userCountryItems.length === 0) {
                                        await loadUserCountries(1);
                                      }
                                    }}
                                    onSearchText={async text => {
                                      setUserCountryQuery(text);
                                      setUserCountryItems([]);
                                      setUserCountryTotal(0);
                                      setUserCountryPage(1);
                                      await loadUserCountries(1, text);
                                    }}
                                    onEndReached={async () => {
                                      const next = userCountryPage + 1;
                                      const maxPages = Math.max(1, Math.ceil(userCountryTotal / PAGE_LIMIT));
                                      if (next <= maxPages) {
                                        await loadUserCountries(next, userCountryQuery);
                                      }
                                    }}
                                  />
                                  {renderFieldError('user_country_id')}
                                </View>
                              </View>

                              {/* User Email */}
                              <View onLayout={e => setFieldPos('user_email_address', e.nativeEvent.layout.y)}>
                                <View>
                                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                      {t('emailAddress')} <Text status="danger">*</Text>
                                    </Text>
                                    <HelpIcon title={t('emailAddress')} message={t('infoEmailAddress')} />
                                  </View>
                                  <AppInput
                                    value={values.user_email_address}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    onChangeText={text => {
                                      setFieldValue('user_email_address', text);
                                      setInvalid(prev => ({...prev, user_email_address: false}));
                                      clearFieldError('user_email_address');
                                    }}
                                    onBlur={handleBlur('user_email_address')}
                                    error={!!invalid.user_email_address}
                                  />
                                  {renderFieldError('user_email_address')}
                                </View>
                              </View>

                              {/* Mobile Phone */}
                              <View onLayout={e => setFieldPos('user_mobile_phone', e.nativeEvent.layout.y)}>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('mobilePhone')} <Text status="danger">*</Text>
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
                                      borderColor: invalid.user_mobile_phone ? '#db2d2d' : C.inputBorder,
                                      backgroundColor: C.inputBg,
                                    }}>
                                    <TouchableOpacity
                                      onPress={() => setShowUserCountryPicker(true)}
                                      style={{flexDirection: 'row', alignItems: 'center'}}>
                                      <Text style={{fontSize: fs(18), marginRight: ms(4)}}>
                                        {countryCodeToFlag(userCountryCode)}
                                      </Text>
                                    </TouchableOpacity>
                                    <Text style={{marginLeft: ms(8), fontSize: fs(14), color: C.textPrimary}}>
                                      +{userCallingCode}
                                    </Text>
                                    <TextInput
                                      allowFontScaling={false}
                                      style={{flex: 1, marginLeft: ms(8), fontSize: fs(14), color: C.inputText, paddingVertical: 0}}
                                      keyboardType="number-pad"
                                      autoCapitalize="none"
                                      value={formatPhoneReadable(values.user_mobile_phone)}
                                      onChangeText={text => {
                                        const digits = text.replace(/\D/g, '').slice(0, 15);
                                        setFieldValue('user_mobile_phone', digits);
                                        setInvalid(prev => ({...prev, user_mobile_phone: false}));
                                        clearFieldError('user_mobile_phone');
                                      }}
                                      placeholder=""
                                    />
                                  </View>
                                  {renderFieldError('user_mobile_phone')}
                                </View>
                              </View>

                              <CountryPicker
                                show={showUserCountryPicker}
                                lang={'en'}
                                pickerButtonOnPress={item => {
                                  setUserCountryCode(item.code);
                                  setUserCallingCode(item.dial_code.replace('+', ''));
                                  setShowUserCountryPicker(false);
                                }}
                                onBackdropPress={() => setShowUserCountryPicker(false)}
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

                              {/* Credentials */}
                              <View>
                                <View>
                                  <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                    {t('credentials')}
                                  </Text>
                                  <ElementDropdown
                                    data={credentialOptions.map(c => ({label: c, value: c}))}
                                    value={values.credentials as any}
                                    onChange={v => setFieldValue('credentials', (v as string) || '')}
                                    placeholder={t('no')}
                                    containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                                  />
                                </View>
                              </View>

                              {!!values.credentials && (
                                <>
                                  <View>
                                    <View>
                                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                        {t('credentialsFrom')}
                                      </Text>
                                      <AppInput
                                        autoCapitalize="none"
                                        value={values.credentials_from}
                                        onChangeText={text => setFieldValue('credentials_from', text)}
                                        onBlur={handleBlur('credentials_from')}
                                      />
                                    </View>
                                  </View>

                                  <View>
                                    <View>
                                      <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                        {t('credentialsExpiry')}
                                      </Text>
                                      <DateTripleDropdown
                                        value={values.credentials_expiry_date}
                                        onChange={d => setFieldValue('credentials_expiry_date', d)}
                                        yearRange={50}
                                      />
                                    </View>
                                  </View>
                                </>
                              )}

                              <View style={{flexDirection: 'row', marginTop: ms(16)}}>
                                <View style={{flex: 1, marginRight: ms(8)}}>
                                  <AppButton
                                    style={globalStyles.mainButton}
                                    onPress={() => setShowPastorSection(false)}>
                                    {t('back')}
                                  </AppButton>
                                </View>
                                <View style={{flex: 1, marginLeft: ms(8)}}>
                                  <AppButton
                                    style={globalStyles.mainButton}
                                    onPress={() => handleSubmit()}>
                                    {t('save')}
                                  </AppButton>
                                </View>
                              </View>
                            </>
                          )}

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
