import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {Header} from '../../../shared/components/Header';
import {BackButton} from '../../../shared/components/BackButton';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {Formik} from 'formik';
import {AddChurchFormValues, useFormOptions} from './utils/addChurch.utils';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import HelpIcon from '../../../shared/components/HelpIcon';
import api from '../../../config/api';
import {addChurch, getChurchDetail, updateChurch} from '../services/church.service';
import {useNavigation} from '@react-navigation/native';
import {Alert} from 'react-native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {ms, hs} from '../../../shared/utils/scale';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import {getLanguageById} from '../../language/services/language.service';

export default function AddChurchScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  // read id param for edit
  const route: any = navigation.getState?.() as any;
  const maybeParams =
    (route?.routes || []).find((r: any) => r?.name === 'AddChurch')?.params ||
    (route?.routes || [])[route?.index || 0]?.params;
  const editId: number | null = maybeParams?.id ?? null;
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

  // Church photo: enforce 16:9 crop ratio (e.g. 1600x900)
  const {imagePath, handleImagePick, clearImage} = useImagePicker({
    width: 1600,
    height: 900,
  });
  const [cityOptions, setCityOptions] = useState<{label: string; value: string}[]>([]);
  const PAGE_LIMIT = 10;

  // Language dropdown: baseline from `languageOptions` (full list from hook); search uses a separate list.
  const [langSearchOptions, setLangSearchOptions] = useState<{label: string; value: string}[]>([]);
  const [langSearchPage, setLangSearchPage] = useState(1);
  const [langSearchHasNext, setLangSearchHasNext] = useState(false);
  const [langQuery, setLangQuery] = useState('');
  /** Fetched-by-id rows when edit payload references a language not in `languageOptions`. */
  const [languageExtraOptions, setLanguageExtraOptions] = useState<{label: string; value: string}[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const lastLanguageFetchRef = useRef<string | null>(null);

  const resetLangSearchState = useCallback(() => {
    setLangQuery('');
    setLangSearchOptions([]);
    setLangSearchPage(1);
    setLangSearchHasNext(false);
  }, []);

  const languageDropdownData = useMemo(() => {
    if (langQuery.trim()) {
      return langSearchOptions;
    }
    const seen = new Set<string>();
    const out: {label: string; value: string}[] = [];
    for (const o of languageExtraOptions) {
      if (seen.has(o.value)) {
        continue;
      }
      seen.add(o.value);
      out.push(o);
    }
    for (const o of languageOptions) {
      if (seen.has(o.value)) {
        continue;
      }
      seen.add(o.value);
      out.push(o);
    }
    return out;
  }, [langQuery, langSearchOptions, languageOptions, languageExtraOptions]);

  /** Server search results only; baseline list always comes from `motherChurchOptions`. */
  const [motherSearchOptions, setMotherSearchOptions] = useState<{label: string; value: string}[]>([]);
  const [motherSearchPage, setMotherSearchPage] = useState(1);
  const [motherSearchHasNext, setMotherSearchHasNext] = useState(false);
  const [motherQuery, setMotherQuery] = useState('');

  const resetMotherSearchState = useCallback(() => {
    setMotherQuery('');
    setMotherSearchOptions([]);
    setMotherSearchPage(1);
    setMotherSearchHasNext(false);
  }, []);

  const motherDropdownData = useMemo(
    () => (motherQuery.trim() ? motherSearchOptions : motherChurchOptions),
    [motherQuery, motherSearchOptions, motherChurchOptions],
  );

  const [pastorOpts, setPastorOpts] = useState<{label: string; value: string}[]>(pastorOptions);
  const [pastorPage, setPastorPage] = useState(1);
  const [pastorHasNext, setPastorHasNext] = useState(false);
  const [pastorQuery, setPastorQuery] = useState('');

  const [countryOpts, setCountryOpts] = useState<{label: string; value: string}[]>(countryOptions);
  const [countryPage, setCountryPage] = useState(1);
  const [countryHasNext, setCountryHasNext] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  // Validation + scroll to first invalid
  const scrollRef = useRef<ScrollView>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrorText, setFieldErrorText] = useState<Record<string, string>>({});
  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({y: Math.max(0, y - ms(20)), animated: true});
  };
  const clearInvalid = (key: string) => setInvalid(prev => ({...prev, [key]: false}));
  const clearFieldError = (key: string) =>
    setFieldErrorText(prev => {
      if (!prev[key]) {
        return prev;
      }
      const next = {...prev};
      delete next[key];
      return next;
    });
  const requiredFieldMessage = () =>
    t('fillRequiredFields') || 'Please fill all required fields.';
  const requiredFieldMessageForKey = (key: string) => {
    const labelByKey: Record<string, string> = {
      name: t('churchName') || 'Church Name',
      is_first_msc: 'Is this the first MSC?',
      msc_parent_id: 'MSC Designated Parent',
      church_type_id: t('churchType') || 'Church Type',
      pastor_id: t('pastorLeader') || 'Pastor Leader',
      geographical_region_id: t('geographicalRegion') || 'Geographical Region',
      country_id: t('nation') || 'Nation',
      currency_id: t('currency') || 'Currency',
      email_address: t('emailAddress') || 'Email Address',
      date_of_birth: t('dob') || 'Date of Birth',
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

  const loadCities = async (countryId: string | number) => {
    try {
      const res = await api.get(`cities/country/${countryId}`, {params: {sort_by: 'name', sort_desc: false}});
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCityOptions(list.map((x: any) => ({label: x.name, value: String(x.id)})));
    } catch {}
  };

  /** Paginated language search only; does not replace `languageOptions` baseline. */
  const loadLanguageSearchResults = async (page: number, searchName: string) => {
    const q = searchName.trim();
    if (!q) {
      return;
    }
    try {
      const res = await api.get('languages', {
        params: {
          page,
          limit: PAGE_LIMIT,
          sort_by: 'name',
          sort_desc: false,
          name: q,
        },
      });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setLangSearchOptions(prev => (page === 1 ? items : [...prev, ...items]));
      setLangSearchPage(page);
      setLangSearchHasNext(!!res.data?.data?.has_next);
    } catch {}
  };

  /** Loads paginated churches for the search box only; never mutates the full baseline list. */
  const loadMotherSearchResults = async (page: number, searchName: string) => {
    const q = searchName.trim();
    if (!q) {
      return;
    }
    try {
      const res = await api.get('churches', {
        params: {
          page,
          limit: PAGE_LIMIT,
          sort_by: 'name',
          sort_desc: false,
          name: q,
        },
      });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setMotherSearchOptions(prev => (page === 1 ? items : [...prev, ...items]));
      setMotherSearchPage(page);
      setMotherSearchHasNext(!!res.data?.data?.has_next);
    } catch {}
  };

  const loadPastors = async (page: number, name?: string) => {
    try {
      const res = await api.get('users/pastors', {
        params: {page, limit: PAGE_LIMIT, sort_by: 'name', sort_desc: false, ...(name?.trim() ? {name: name.trim()} : {})},
      });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setPastorOpts(prev => (page === 1 ? items : [...prev, ...items]));
      setPastorPage(page);
      setPastorHasNext(!!res.data?.data?.has_next);
    } catch {}
  };

  const loadCountries = async (page: number, name?: string) => {
    try {
      const res = await api.get('countries', {
        params: {page, limit: 1000, sort_by: 'name', sort_desc: false, ...(name?.trim() ? {name: name.trim()} : {})},
      });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setCountryOpts(prev => (page === 1 ? items : [...prev, ...items]));
      setCountryPage(page);
      setCountryHasNext(false);
    } catch {}
  };

  // Sync base options from useFormOptions into local lazy lists on first load or when not searching
  useEffect(() => {
    if (!pastorQuery && pastorPage === 1) {
      setPastorOpts(pastorOptions);
    }
  }, [pastorOptions]);
  useEffect(() => {
    if (!countryQuery && countryPage === 1) {
      setCountryOpts(countryOptions);
    }
  }, [countryOptions]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (editId) {
        try {
          const d = await getChurchDetail(editId);
          if (!mounted || !d) {
            return;
          }
          // prefill basic fields via Formik setFieldValue through initialValues override approach using key prop
          setInitialFormValues({
            name: d.name || '',
            short_name: d.short_name || '',
            is_msc: d.is_msc ? 'Yes' : 'No',
            is_first_msc: d.is_first_msc ? 'Yes' : 'No',
            enable_cpm: d.enable_cpm ? 'Yes' : 'No',
            parent_id: d.parent_id ? String(d.parent_id) : '',
            msc_parent_id: d.msc_parent_id ? String(d.msc_parent_id) : '',
            language_id: d.language_id ? String(d.language_id) : '',
            church_type_id: d.church_type_id ? String(d.church_type_id) : '',
            pastor_id: d.pastor_id ? String(d.pastor_id) : '',
            church_network_id: d.church_network_id ? String(d.church_network_id) : '',
            church_region_id: d.church_region_id ? String(d.church_region_id) : '',
            geographical_region_id: d.geographical_region_id ? String(d.geographical_region_id) : '',
            language_region_id: d.language_region_id ? String(d.language_region_id) : '',
            sensitive_nation: d.sensitive_nation ? 'Yes' : 'No',
            country_id: d.country_id ? String(d.country_id) : '',
            currency_id: d.currency_id ? String(d.currency_id) : '',
            city_id: d.city_id ? String(d.city_id) : '',
            photo_dir: d.photo_dir ? String(d.photo_dir) : '',
            service_address_street: d.service_address_street || '',
            service_address_postal_code: d.service_address_postal_code || '',
            mailing_address_postal_code: d.mailing_address_postal_code || '',
            office_address_street: d.office_address_street || '',
            office_address_postal_code: d.office_address_postal_code || '',
            office_phone: d.office_phone || '',
            office_fax: d.office_fax || '',
            email_address: d.email_address || '',
            website: d.website || '',
            facebook: d.facebook || '',
            instagram: d.instagram || '',
            twitter: d.twitter || '',
            date_of_birth: d.date_of_birth ? new Date(d.date_of_birth) : null,
          });
          // preload dependent cities
          if (d.country_id) {
            await loadCities(d.country_id);
          }
        } catch {}
      } else {
        // Load defaults for create mode
        try {
          const res = await api.get('churches/defaults');
          if (!mounted) return;
          const defaults = res?.data?.data;
          if (defaults) {
            setInitialFormValues(prev => ({
              ...prev,
              church_network_id: defaults.church_network_id ? String(defaults.church_network_id) : prev.church_network_id,
              church_region_id: defaults.church_region_id ? String(defaults.church_region_id) : prev.church_region_id,
              geographical_region_id: defaults.geographical_region_id ? String(defaults.geographical_region_id) : prev.geographical_region_id,
              language_region_id: defaults.language_region_id ? String(defaults.language_region_id) : prev.language_region_id,
            }));
          }
        } catch (error) {
          console.error('Error loading church defaults:', error);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [editId]);

  const [initialFormValues, setInitialFormValues] = useState<AddChurchFormValues>({
    name: '',
    short_name: '',
    is_msc: 'No',
    is_first_msc: '',
    enable_cpm: '',
    parent_id: '',
    msc_parent_id: '',
    language_id: '',
    church_type_id: '',
    pastor_id: '',
    church_network_id: '',
    church_region_id: '',
    geographical_region_id: '',
    language_region_id: '',
    sensitive_nation: '',
    country_id: '',
    currency_id: '',
    city_id: '',
    photo_dir: '',
    service_address_street: '',
    service_address_postal_code: '',
    mailing_address_postal_code: '',
    office_address_street: '',
    office_address_postal_code: '',
    office_phone: '',
    office_fax: '',
    email_address: '',
    website: '',
    facebook: '',
    instagram: '',
    twitter: '',
    date_of_birth: null,
  });

  useEffect(() => {
    const v = initialFormValues.language_id?.toString?.() ?? '';
    setSelectedLanguageId(v.trim() ? v : null);
  }, [initialFormValues.language_id]);

  // Ensure selected language appears in the dropdown when it is missing from hook + search lists (edit mode).
  useEffect(() => {
    const selectedId = selectedLanguageId;
    if (!selectedId) {
      lastLanguageFetchRef.current = null;
      return;
    }
    const id = String(selectedId);
    const inExtra = languageExtraOptions.some(opt => String(opt.value) === id);
    const inBaseline = languageOptions.some(opt => String(opt.value) === id);
    const inSearch =
      !!langQuery.trim() && langSearchOptions.some(opt => String(opt.value) === id);
    if (inExtra || inBaseline || inSearch) {
      lastLanguageFetchRef.current = null;
      return;
    }

    if (lastLanguageFetchRef.current === selectedId) {
      return;
    }
    lastLanguageFetchRef.current = selectedId;

    (async () => {
      try {
        const res = await getLanguageById(Number(selectedId));
        const lang = (res as any)?.data;
        if (!lang?.id || !lang?.name) {
          return;
        }

        const option = {label: String(lang.name), value: String(lang.id)};
        setLanguageExtraOptions(prev => {
          const already = prev.some(x => String(x.value) === option.value);
          if (already) {
            return prev;
          }
          return [option, ...prev];
        });
      } catch {
        // Keep previous options; dropdown will remain placeholder if request fails.
      } finally {
        lastLanguageFetchRef.current = null;
      }
    })();
  }, [
    selectedLanguageId,
    languageOptions,
    langQuery,
    langSearchOptions,
    languageExtraOptions,
  ]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header
          title={maybeParams?.id ? t('editChurch') : t('addNewChurch')}
          showMenu={false}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : ((StatusBar.currentHeight || 0) + 50)}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}

            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="always"
            contentContainerStyle={{paddingBottom: ms(24)}}>

          <Formik<AddChurchFormValues>
            enableReinitialize
            key={editId ? `edit-${editId}` : 'create'}
            initialValues={{
              ...initialFormValues,
            }}
            onSubmit={async (values) => {
              try {
                setFieldErrorText({});
                const newInvalid: Record<string, boolean> = {};
                newInvalid.name = !values.name;
                newInvalid.church_type_id = !values.church_type_id;
                newInvalid.pastor_id = !values.pastor_id;
                newInvalid.geographical_region_id = !values.geographical_region_id;
                newInvalid.country_id = !values.country_id;
                newInvalid.currency_id = !values.currency_id;
                newInvalid.email_address = !values.email_address;
                newInvalid.date_of_birth = !values.date_of_birth;
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
                  'name',
                  'is_first_msc',
                  'msc_parent_id',
                  'church_type_id',
                  'pastor_id',
                  'geographical_region_id',
                  'country_id',
                  'currency_id',
                  'email_address',
                  'date_of_birth',
                ].find(k => newInvalid[k]);
                if (firstInvalidKey) {
                  scrollToField(firstInvalidKey);
                  return;
                }
                let uploadedPhotoPath: string | null = null;
                if (imagePath) {
                  const form = new FormData();
                  const fileName = imagePath.split('/').pop() || 'photo.jpg';
                  form.append('file', {
                    uri: imagePath,
                    name: fileName,
                    type: 'image/jpeg',
                  } as any);
                  form.append('entity_type', 'churches');
                  form.append('alt_text', values.name || 'church photo');
                  const uploadRes = await api.post('images/upload', form, {
                    headers: {'Content-Type': 'multipart/form-data'},
                  });
                  uploadedPhotoPath = uploadRes?.data?.data?.path || null;
                }
                const payload: any = {
                  name: values.name,
                  short_name: values.short_name,
                  is_msc: values.is_msc === 'Yes',
                  is_first_msc: values.is_msc === 'Yes' && values.is_first_msc === 'Yes',
                  enable_cpm: values.enable_cpm ? values.enable_cpm === 'Yes' : false,
                  parent_id: values.parent_id ? Number(values.parent_id) : null,
                  language_id: values.language_id ? Number(values.language_id) : null,
                  church_type_id: values.church_type_id ? Number(values.church_type_id) : null,
                  pastor_id: values.pastor_id ? Number(values.pastor_id) : null,
                  church_network_id: values.church_network_id ? Number(values.church_network_id) : null,
                  church_region_id: values.church_region_id ? Number(values.church_region_id) : null,
                  country_id: values.country_id ? Number(values.country_id) : null,
                  city_id: values.city_id ? Number(values.city_id) : null,
                  currency_id: values.currency_id ? Number(values.currency_id) : null,
                  sensitive_nation: values.sensitive_nation === 'Yes',
                  photo: uploadedPhotoPath,
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
                    ? `${values.date_of_birth.getFullYear()}-${String(
                        values.date_of_birth.getMonth() + 1,
                      ).padStart(2, '0')}-${String(values.date_of_birth.getDate()).padStart(
                        2,
                        '0',
                      )}`
                    : null,
                  service_venue: '',
                  church_planting_projection_id: 0,
                  msc_parent_id:
                    values.is_msc === 'Yes' && values.is_first_msc === 'No' && values.msc_parent_id
                      ? Number(values.msc_parent_id)
                      : 0,
                  geographical_region_id: values.geographical_region_id ? Number(values.geographical_region_id) : 0,
                  language_region_id: values.language_region_id ? Number(values.language_region_id) : 0,
                  photo_dir: values.photo_dir,
                  mailing_address_street: '',
                  property: '',
                };
                if (editId) {
                  await updateChurch(editId, payload as any);
                  Alert.alert('Success', 'Church updated successfully!');
                } else {
                  await addChurch(payload as any);
                  Alert.alert('Success', 'Church added successfully!');
                }
                navigation.navigate('Churches');
              } catch (e: any) {
                const apiErrors = e?.response?.data?.errors;
                if (apiErrors && typeof apiErrors === 'object') {
                  const nextInvalid: Record<string, boolean> = {};
                  const nextFieldErrors: Record<string, string> = {};
                  Object.entries(apiErrors).forEach(([key, value]) => {
                    if (typeof value === 'string' && value.trim()) {
                      nextInvalid[key] = true;
                      nextFieldErrors[key] = value;
                    }
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
                  'Error',
                  e?.response?.data?.message || e?.message || 'Failed to add church.',
                );
              }
            }}>
            {({values, handleChange, handleBlur, handleSubmit, setFieldValue}) => (
              <Grid>
                <Row>
                  <Col>
              <View style={{gap: ms(12)}}>
                <View
                  onLayout={e => setFieldPos('name', e.nativeEvent.layout.y)}>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('churchName')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon
                        title={t('churchName')}
                        message={t('helpChurchName')}
                      />
                    </View>
                    <AppInput
                      autoCapitalize="words"
                      value={values.name}
                      onChangeText={(t: string) => {
                        setFieldValue('name', t);
                        setInvalid(prev => ({...prev, name: false}));
                        clearFieldError('name');
                      }}
                      onBlur={handleBlur('name')}
                      error={!!invalid?.name}
                    />
                    {renderFieldError('name')}
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('shortName')}
                        <Text style={formStyles.subLabel}>
                          {' '}
                          [{t('only10Chars')}]
                        </Text>
                      </Text>
                    </View>
                    <AppInput
                      autoCapitalize="none"
                      value={values.short_name}
                      onChangeText={handleChange('short_name')}
                      onBlur={handleBlur('short_name')}
                    />
                  </View>
                </View>

                <View
                  onLayout={e => setFieldPos('is_msc', e.nativeEvent.layout.y)}>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('isMultiServiceChurchMsc')}
                      </Text>
                      <HelpIcon title={t('msc')} message={t('helpIsMsc')} />
                    </View>
                    <ElementDropdown
                      data={[
                        {label: t('yes'), value: 'Yes'},
                        {label: t('no'), value: 'No'},
                      ]}
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
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.is_msc
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.is_msc}
                    />
                    {renderFieldError('is_msc')}
                  </View>
                </View>

                {values.is_msc === 'Yes' && (
                  <View
                    onLayout={e =>
                      setFieldPos('is_first_msc', e.nativeEvent.layout.y)
                    }>
                    <View>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          Is this the first MSC? <Text style={{color: '#c00000'}}>*</Text>
                        </Text>
                      </View>
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
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: invalid?.is_first_msc
                              ? '#db2d2d'
                              : C.inputBorder,
                          } as any
                        }
                        error={!!invalid?.is_first_msc}
                      />
                      {renderFieldError('is_first_msc')}
                    </View>
                  </View>
                )}

                {/* House C.P. field removed as requested */}

                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('motherChurch')}
                      </Text>
                    </View>
                    <ElementDropdown
                      data={motherDropdownData}
                      value={values.parent_id as any}
                      onChange={v => setFieldValue('parent_id', v as any)}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: C.inputBorder,
                        } as any
                      }
                      onOpen={resetMotherSearchState}
                      onSearchText={async text => {
                        setMotherQuery(text);
                        if (!text.trim()) {
                          setMotherSearchOptions([]);
                          setMotherSearchPage(1);
                          setMotherSearchHasNext(false);
                          return;
                        }
                        await loadMotherSearchResults(1, text);
                      }}
                      onEndReached={async () => {
                        if (motherQuery.trim() && motherSearchHasNext) {
                          await loadMotherSearchResults(
                            motherSearchPage + 1,
                            motherQuery,
                          );
                        }
                      }}
                    />
                  </View>
                </View>

                {values.is_msc === 'Yes' && values.is_first_msc === 'No' && (
                  <View
                    onLayout={e =>
                      setFieldPos('msc_parent_id', e.nativeEvent.layout.y)
                    }>
                    <View>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          MSC Designated Parent <Text style={{color: '#c00000'}}>*</Text>
                        </Text>
                      </View>
                      <ElementDropdown
                        data={motherDropdownData}
                        value={values.msc_parent_id as any}
                        onChange={v => {
                          setFieldValue('msc_parent_id', v as any);
                          setInvalid(prev => ({...prev, msc_parent_id: false}));
                          clearFieldError('msc_parent_id');
                        }}
                        placeholder={t('selectOption')}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: invalid?.msc_parent_id
                              ? '#db2d2d'
                              : C.inputBorder,
                          } as any
                        }
                        onOpen={resetMotherSearchState}
                        onSearchText={async text => {
                          setMotherQuery(text);
                          if (!text.trim()) {
                            setMotherSearchOptions([]);
                            setMotherSearchPage(1);
                            setMotherSearchHasNext(false);
                            return;
                          }
                          await loadMotherSearchResults(1, text);
                        }}
                        onEndReached={async () => {
                          if (motherQuery.trim() && motherSearchHasNext) {
                            await loadMotherSearchResults(
                              motherSearchPage + 1,
                              motherQuery,
                            );
                          }
                        }}
                        error={!!invalid?.msc_parent_id}
                      />
                      {renderFieldError('msc_parent_id')}
                    </View>
                  </View>
                )}

                <View
                  onLayout={e =>
                    setFieldPos('language_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('languageUsedInTheService')}{' '}
                      </Text>
                    </View>
                    <ElementDropdown
                      data={languageDropdownData}
                      value={values.language_id as any}
                      onChange={v => {
                        const next = v == null ? null : String(v);
                        setSelectedLanguageId(next);
                        setFieldValue('language_id', v as any);
                        setInvalid(prev => ({...prev, language_id: false}));
                        clearFieldError('language_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.language_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      onOpen={resetLangSearchState}
                      onSearchText={async text => {
                        setLangQuery(text);
                        if (!text.trim()) {
                          setLangSearchOptions([]);
                          setLangSearchPage(1);
                          setLangSearchHasNext(false);
                          return;
                        }
                        await loadLanguageSearchResults(1, text);
                      }}
                      onEndReached={async () => {
                        if (langQuery.trim() && langSearchHasNext) {
                          await loadLanguageSearchResults(
                            langSearchPage + 1,
                            langQuery,
                          );
                        }
                      }}
                      error={!!invalid?.language_id}
                    />
                    {renderFieldError('language_id')}
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('church_type_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('churchType')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon
                        title={t('churchType')}
                        message={t('helpChurchType')}
                      />
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
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.church_type_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.church_type_id}
                      onSearchText={async text => {
                        try {
                          const res = await api.get('church-types', {params: {sort_by: 'name', sort_desc: false}});
                          const items = ((res.data?.data ?? []) as any[]).map(
                            i => ({label: i.name, value: String(i.id)}),
                          );
                          // @ts-ignore
                          churchTypeOptions.splice(
                            0,
                            churchTypeOptions.length,
                            ...items,
                          );
                        } catch {}
                      }}
                    />
                    {renderFieldError('church_type_id')}
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('pastor_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('pastorLeader')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon
                        title={t('pastorLeader')}
                        message={t('helpPastorLeader')}
                      />
                    </View>
                    <ElementDropdown
                      data={pastorOpts}
                      value={values.pastor_id as any}
                      onChange={v => {
                        setFieldValue('pastor_id', v as any);
                        setInvalid(prev => ({...prev, pastor_id: false}));
                        clearFieldError('pastor_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.pastor_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.pastor_id}
                      onSearchText={async text => {
                        setPastorQuery(text);
                        await loadPastors(1, text);
                      }}
                      onEndReached={async () => {
                        if (pastorHasNext) {
                          await loadPastors(pastorPage + 1, pastorQuery);
                        }
                      }}
                    />
                    {renderFieldError('pastor_id')}
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('church_network_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('churchNetwork')}{' '}
                      </Text>
                      <HelpIcon
                        title={t('churchNetwork')}
                        message={t('helpChurchNetwork')}
                      />
                    </View>
                    <ElementDropdown
                      data={churchNetworkOptions}
                      value={values.church_network_id as any}
                      onChange={v => {
                        setFieldValue('church_network_id', v as any);
                        setInvalid(prev => ({
                          ...prev,
                          church_network_id: false,
                        }));
                        clearFieldError('church_network_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.church_network_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.church_network_id}
                      onSearchText={async _text => {
                        try {
                          const res = await api.get('church-networks', {params: {sort_by: 'name', sort_desc: false}});
                          const items = ((res.data?.data ?? []) as any[]).map(
                            i => ({label: i.name, value: String(i.id)}),
                          );
                          // @ts-ignore
                          churchNetworkOptions.splice(
                            0,
                            churchNetworkOptions.length,
                            ...items,
                          );
                        } catch {}
                      }}
                    />
                    {renderFieldError('church_network_id')}
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('church_region_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('apostolicRegion')}{' '}
                      </Text>
                      <HelpIcon
                        title={t('apostolicRegion')}
                        message={t('helpApostolicRegion')}
                      />
                    </View>
                    <ElementDropdown
                      data={churchRegionOptions}
                      value={values.church_region_id as any}
                      onChange={v => {
                        setFieldValue('church_region_id', v as any);
                        setInvalid(prev => ({
                          ...prev,
                          church_region_id: false,
                        }));
                        clearFieldError('church_region_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.church_region_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.church_region_id}
                      onSearchText={async _text => {
                        try {
                          const res = await api.get('church-regions', {params: {sort_by: 'name', sort_desc: false}});
                          const items = ((res.data?.data ?? []) as any[]).map(
                            i => ({label: i.name, value: String(i.id)}),
                          );
                          // @ts-ignore
                          churchRegionOptions.splice(
                            0,
                            churchRegionOptions.length,
                            ...items,
                          );
                        } catch {}
                      }}
                    />
                    {renderFieldError('church_region_id')}
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('geographical_region_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('geographicalRegion')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon
                        title={t('geographicalRegion')}
                        message={t('helpGeographicalRegion')}
                      />
                    </View>
                    <ElementDropdown
                      data={geographicalRegionOptions}
                      value={values.geographical_region_id as any}
                      renderItem={createHierarchyDropdownRenderItem(C) as any}
                      onChange={v => {
                        setFieldValue('geographical_region_id', v as any);
                        setInvalid(prev => ({
                          ...prev,
                          geographical_region_id: false,
                        }));
                        clearFieldError('geographical_region_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.geographical_region_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.geographical_region_id}
                    />
                    {renderFieldError('geographical_region_id')}
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('language_region_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('languageRegion')}{' '}
                      </Text>
                      <HelpIcon
                        title={t('languageRegion')}
                        message={t('helpLanguageRegion')}
                      />
                    </View>
                    <ElementDropdown
                      data={languageRegionOptions}
                      value={values.language_region_id as any}
                      onChange={v => {
                        setFieldValue('language_region_id', v as any);
                        setInvalid(prev => ({
                          ...prev,
                          language_region_id: false,
                        }));
                        clearFieldError('language_region_id');
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.language_region_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.language_region_id}
                    />
                    {renderFieldError('language_region_id')}
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('sensitiveNation')}?
                      </Text>
                      <HelpIcon
                        title={t('sensitiveNation')}
                        message={t('helpSensitiveNation')}
                      />
                    </View>
                    <ElementDropdown
                      data={[
                        {label: t('yes'), value: 'Yes'},
                        {label: t('no'), value: 'No'},
                      ]}
                      value={values.sensitive_nation as any}
                      onChange={v =>
                        setFieldValue('sensitive_nation', (v as string) || '')
                      }
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: C.inputBorder,
                        } as any
                      }
                    />
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('country_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <Text
                      style={[formStyles.label, {color: C.textSecondary}]}
                      category="label">
                      {t('nation')}{' '}
                      <Text style={{color: '#c00000'}}>*</Text>
                    </Text>
                    <ElementDropdown
                      data={countryOpts}
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
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.country_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.country_id}
                      onFocus={async () => {
                        if (countryOpts.length === 0) {
                          await loadCountries(1);
                        }
                      }}
                      onSearchText={async text => {
                        setCountryQuery(text);
                        await loadCountries(1, text);
                      }}
                      onEndReached={async () => {
                        if (countryHasNext) {
                          await loadCountries(countryPage + 1, countryQuery);
                        }
                      }}
                    />
                    {renderFieldError('country_id')}
                  </View>
                </View>

                {values.country_id ? (
                  <View>
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                        <Text
                          style={[
                            formStyles.label,
                            {color: C.textSecondary},
                          ]}
                          category="label">
                          {t('cityTownVillage')}
                        </Text>
                        <HelpIcon
                          title={t('cityTownVillage')}
                          message={t('helpCity')}
                        />
                      </View>
                      <ElementDropdown
                        data={cityOptions}
                        value={values.city_id as any}
                        onChange={v => setFieldValue('city_id', v as any)}
                        placeholder={t('selectOption')}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: C.inputBorder,
                          } as any
                        }
                      />
                    </View>
                  </View>
                ) : null}

                <View
                  onLayout={e =>
                    setFieldPos('currency_id', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('currency')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon
                        title={t('currency')}
                        message={t('helpCurrency')}
                      />
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
                      containerStyle={
                        {
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.currency_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.currency_id}
                      onSearchText={async _text => {
                        try {
                          const res = await api.get('currencies', {params: {sort_by: 'name', sort_desc: false}});
                          const items = (
                            (res.data?.data?.items ?? []) as any[]
                          ).map((i: any) => ({
                            label: `${i.name} (${i.three_letter_code})`,
                            value: String(i.id),
                          }));
                          // @ts-ignore
                          localCurrencyOptions.splice(
                            0,
                            localCurrencyOptions.length,
                            ...items,
                          );
                        } catch {}
                      }}
                    />
                    {renderFieldError('currency_id')}
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('churchPhoto')}
                        <Text style={formStyles.subLabel}>
                          {' '}
                          [{t('max5mb')}]
                        </Text>
                      </Text>
                      <HelpIcon
                        title={t('churchPhoto')}
                        message={t('helpChurchPhoto')}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleImagePick()}
                      style={
                        [
                          formStyles.avatarSquare as any,
                          {
                            backgroundColor: C.inputBg,
                            borderColor: C.inputBorder,
                          },
                        ] as any
                      }>
                      {imagePath ? (
                        <>
                          <Image
                            source={{uri: imagePath}}
                            style={formStyles.avatarImage as any}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={clearImage}
                            style={formStyles.avatarClose as any}>
                            <Text style={{color: '#fff'}}>✗</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <Text
                            style={
                              [
                                formStyles.avatarPlus as any,
                                {color: C.textSecondary},
                              ] as any
                            }>
                            +
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <View>
                    <Text
                      style={[formStyles.label, {color: C.textSecondary}]}
                      category="label">
                      {t('serviceAddress')}
                    </Text>
                    <AppInput
                      value={values.service_address_street}
                      onChangeText={handleChange('service_address_street')}
                      onBlur={handleBlur('service_address_street')}
                    />
                  </View>
                </View>
                <View>
                  <View>
                    <Text
                      style={[formStyles.label, {color: C.textSecondary}]}
                      category="label">
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

                <View
                  onLayout={e =>
                    setFieldPos('email_address', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('emailAddress')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                    </View>
                    <AppInput
                      autoCapitalize="none"
                      value={values.email_address}
                      onChangeText={(t: string) => {
                        setFieldValue('email_address', t);
                        setInvalid(prev => ({...prev, email_address: false}));
                        clearFieldError('email_address');
                      }}
                      onBlur={handleBlur('email_address')}
                      error={!!invalid?.email_address}
                    />
                    {renderFieldError('email_address')}
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('website')}
                      </Text>
                      <HelpIcon
                        title={t('website')}
                        message={t('helpWebsite')}
                      />
                    </View>
                    <AppInput
                      autoCapitalize="none"
                      value={values.website}
                      onChangeText={handleChange('website')}
                      onBlur={handleBlur('website')}
                    />
                  </View>
                </View>
                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('facebook')}
                      </Text>
                      <HelpIcon
                        title={t('facebook')}
                        message={t('helpFacebook')}
                      />
                    </View>
                    <AppInput
                      autoCapitalize="none"
                      value={values.facebook}
                      onChangeText={handleChange('facebook')}
                      onBlur={handleBlur('facebook')}
                    />
                  </View>
                </View>
                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        Instagram
                      </Text>
                      <HelpIcon
                        title="Instagram"
                        message={t('helpInstagram')}
                      />
                    </View>
                    <AppInput
                      autoCapitalize="none"
                      value={values.instagram}
                      onChangeText={handleChange('instagram')}
                      onBlur={handleBlur('instagram')}
                    />
                  </View>
                </View>
                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        X
                      </Text>
                      <HelpIcon
                        title="X"
                        message={t('helpX')}
                      />
                    </View>
                    <AppInput
                      autoCapitalize="none"
                      value={values.twitter}
                      onChangeText={handleChange('twitter')}
                      onBlur={handleBlur('twitter')}
                    />
                  </View>
                </View>

                <View
                  onLayout={e =>
                    setFieldPos('date_of_birth', e.nativeEvent.layout.y)
                  }>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('dob')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                      <HelpIcon
                        title={t('dob')}
                        message={t('helpDob')}
                      />
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
                  onPress={() => handleSubmit()}
                  variant="primary"
                  style={globalStyles.mainButton}>
                  {t('save')}
                </AppButton>
              </View>
                  </Col>
                </Row>
              </Grid>
            )}
          </Formik>
        </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}

// Duplicate legacy block removed
