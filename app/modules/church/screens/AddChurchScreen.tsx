import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
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
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {Formik, FormikProps} from 'formik';
import {AddChurchFormValues, useFormOptions} from './utils/addChurch.utils';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import HelpIcon from '../../../shared/components/HelpIcon';
import api from '../../../config/api';
import {addChurch} from '../services/church.service';
import {createCity} from '../services/city.service';
import {useNavigation} from '@react-navigation/native';
import {Alert} from 'react-native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {ms, fs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {getLanguageById} from '../../language/services/language.service';
import {useLatestRequest} from '../hooks/useLatestRequest';
import {fillTemplate, formatYmd, splitApiFieldErrors} from '../utils/churchForm';

/** Fields that show their own error under the input (anything else is alerted). */
const FIELDS_WITH_ERROR_TEXT = new Set([
  'name',
  'is_msc',
  'is_first_msc',
  'msc_parent_id',
  'language_id',
  'church_type_id',
  'pastor_id',
  'church_network_id',
  'church_region_id',
  'geographical_region_id',
  'language_region_id',
  'country_id',
  'currency_id',
  'new_city_name',
  'email_address',
  'date_of_birth',
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddChurchScreen() {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const {begin, debounce, cancel} = useLatestRequest();
  const formikRef = useRef<FormikProps<AddChurchFormValues>>(null);
  // Photo uploaded by an earlier, failed save: reused instead of uploading again.
  const uploadedPhotoRef = useRef<{source: string; path: string} | null>(null);
  const {
    motherChurchOptions,
    churchTypeOptions,
    churchNetworkOptions,
    pastorOptions,
    pastorHasNext: pastorOptionsHasNext,
    languageOptions,
    churchRegionOptions,
    geographicalRegionOptions,
    languageRegionOptions,
    countryOptions,
    localCurrencyOptions,
    error: optionsError,
    reload: reloadOptions,
  } = useFormOptions();

  // Church photo: enforce 16:9 crop ratio (e.g. 1600x900)
  const {imagePath, handleImagePick, clearImage} = useImagePicker({
    width: 1600,
    height: 900,
  });
  const [cityOptions, setCityOptions] = useState<{label: string; value: string}[]>([]);
  const [isAddingNewCity, setIsAddingNewCity] = useState(false);
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
      is_first_msc: t('isThisFirstMsc'),
      msc_parent_id: t('mscDesignatedParent'),
      church_type_id: t('churchType') || 'Church Type',
      pastor_id: t('pastorLeader') || 'Pastor Leader',
      geographical_region_id: t('geographicalRegion') || 'Geographical Region',
      country_id: t('nation') || 'Nation',
      new_city_name: t('cityTownVillage') || 'City / Town / Village',
      currency_id: t('currency') || 'Currency',
      email_address: t('emailAddress') || 'Email Address',
      date_of_birth: t('dob') || 'Date of Birth',
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

  // Latest country only: a slower response for the previous country must not
  // fill the list (a city of another country would then be saved).
  const loadCities = async (countryId: string | number) => {
    const isLatest = begin('cities');
    setCityOptions([]);
    try {
      const res = await api.get(`cities/country/${countryId}`, {params: {sort_by: 'name', sort_desc: false}});
      if (!isLatest()) {
        return;
      }
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
    const isLatest = begin('language');
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
      if (!isLatest()) {
        return;
      }
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
    const isLatest = begin('mother');
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
      if (!isLatest()) {
        return;
      }
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
    const isLatest = begin('pastor');
    try {
      const res = await api.get('users/pastors', {
        params: {page, limit: PAGE_LIMIT, sort_by: 'name', sort_desc: false, ...(name?.trim() ? {name: name.trim()} : {})},
      });
      if (!isLatest()) {
        return;
      }
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
    const isLatest = begin('country');
    try {
      const res = await api.get('countries', {
        params: {page, limit: 1000, sort_by: 'name', sort_desc: false, ...(name?.trim() ? {name: name.trim()} : {})},
      });
      if (!isLatest()) {
        return;
      }
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
      setPastorHasNext(pastorOptionsHasNext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastorOptions, pastorOptionsHasNext]);
  useEffect(() => {
    if (!countryQuery && countryPage === 1) {
      setCountryOpts(countryOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryOptions]);

  const loadTokenRef = useRef(0);

  // Optional create-mode defaults (network and regions). Applied only to fields
  // the user hasn't filled yet: re-initialising the form here (as before) wiped
  // anything typed while the request was in flight.
  const loadInitial = async () => {
    const token = ++loadTokenRef.current;
    const mounted = () => token === loadTokenRef.current;
    try {
      const res = await api.get('churches/defaults');
      if (!mounted()) {
        return;
      }
      const defaults = res?.data?.data;
      if (!defaults) {
        return;
      }
      const fields = {
        church_network_id: defaults.church_network_id,
        church_region_id: defaults.church_region_id,
        geographical_region_id: defaults.geographical_region_id,
        language_region_id: defaults.language_region_id,
      } as const;
      const form = formikRef.current;
      if (!form) {
        setInitialFormValues(prev => {
          const next = {...prev};
          (Object.keys(fields) as (keyof typeof fields)[]).forEach(key => {
            if (fields[key]) {
              next[key] = String(fields[key]);
            }
          });
          return next;
        });
        return;
      }
      (Object.keys(fields) as (keyof typeof fields)[]).forEach(key => {
        if (fields[key] && !form.values[key]) {
          form.setFieldValue(key, String(fields[key]));
        }
      });
    } catch (error) {
      console.error('Error loading church defaults:', error);
    }
  };

  const retryInitialLoad = () => Promise.all([reloadOptions(), loadInitial()]);

  useEffect(() => {
    loadInitial();
    return () => {
      // Ignore the in-flight request after unmount.
      loadTokenRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    new_city_name: '',
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
          title={t('addNewChurch')}
          showMenu={false}
        />
        {optionsError ? (
          <ApiErrorState error={optionsError} onRetry={retryInitialLoad} />
        ) : (
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
            innerRef={formikRef}
            initialValues={initialFormValues}
            onSubmit={async (values, {setFieldValue: setFormValue}) => {
              try {
                setFieldErrorText({});
                const newInvalid: Record<string, boolean> = {};
                newInvalid.name = !values.name?.trim();
                newInvalid.church_type_id = !values.church_type_id;
                newInvalid.pastor_id = !values.pastor_id;
                newInvalid.geographical_region_id = !values.geographical_region_id;
                newInvalid.country_id = !values.country_id;
                newInvalid.currency_id = !values.currency_id;
                const email = values.email_address?.trim() || '';
                newInvalid.email_address = !email || !EMAIL_PATTERN.test(email);
                newInvalid.date_of_birth = !values.date_of_birth;
                newInvalid.is_first_msc =
                  values.is_msc === 'Yes' && !values.is_first_msc;
                newInvalid.msc_parent_id =
                  values.is_msc === 'Yes' &&
                  values.is_first_msc === 'No' &&
                  !values.msc_parent_id;
                if (isAddingNewCity) {
                  newInvalid.new_city_name = !values.new_city_name?.trim();
                }
                setInvalid(newInvalid);
                const newFieldErrors: Record<string, string> = {};
                Object.keys(newInvalid).forEach(k => {
                  if (newInvalid[k]) {
                    newFieldErrors[k] =
                      k === 'email_address' && email
                        ? t('invalidEmailFormat')
                        : requiredFieldMessageForKey(k);
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
                  'new_city_name',
                  'email_address',
                  'date_of_birth',
                ].find(k => newInvalid[k]);
                if (firstInvalidKey) {
                  scrollToField(firstInvalidKey);
                  return;
                }
                let resolvedCityId: number | null = values.city_id
                  ? Number(values.city_id)
                  : null;
                if (isAddingNewCity) {
                  try {
                    const cityName = values.new_city_name.trim();
                    const createdCity = await createCity({
                      name: cityName,
                      country_id: Number(values.country_id),
                    });
                    resolvedCityId = createdCity.id;
                    // A later failure (upload / save) must not create it again on
                    // retry: from now on the form simply has this city selected.
                    const cityValue = String(createdCity.id);
                    setCityOptions(prev =>
                      prev.some(o => o.value === cityValue)
                        ? prev
                        : [...prev, {label: createdCity.name || cityName, value: cityValue}],
                    );
                    setIsAddingNewCity(false);
                    setFormValue('city_id', cityValue);
                    setFormValue('new_city_name', '');
                  } catch (cityErr: any) {
                    Alert.alert(
                      t('error'),
                      cityErr?.response?.data?.message ||
                        cityErr?.message ||
                        t('failedToCreateCity'),
                    );
                    return;
                  }
                }
                let uploadedPhotoPath: string | null = null;
                if (imagePath && uploadedPhotoRef.current?.source === imagePath) {
                  uploadedPhotoPath = uploadedPhotoRef.current.path;
                } else if (imagePath) {
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
                  if (!uploadedPhotoPath) {
                    throw new Error(t('photoUploadFailed'));
                  }
                  uploadedPhotoRef.current = {source: imagePath, path: uploadedPhotoPath};
                }
                const payload: any = {
                  name: values.name.trim(),
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
                  city_id: resolvedCityId,
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
                  email_address: values.email_address.trim(),
                  website: values.website,
                  facebook: values.facebook,
                  instagram: values.instagram,
                  twitter: values.twitter,
                  date_of_birth: formatYmd(values.date_of_birth),
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
                await addChurch(payload);
                markDataChanged('churches');
                Alert.alert(t('success'), t('churchCreatedSuccess'));
                // navigate() would push a new list on top of this filled form
                // (React Navigation 7): Back would then show it again and a
                // second Save would create a duplicate church.
                navigation.popTo('Churches');
              } catch (e: any) {
                const {fieldErrors, otherMessages} = splitApiFieldErrors(
                  e?.response?.data?.errors,
                  FIELDS_WITH_ERROR_TEXT,
                );
                const fieldKeys = Object.keys(fieldErrors);
                if (fieldKeys.length > 0) {
                  setInvalid(prev => ({
                    ...prev,
                    ...Object.fromEntries(fieldKeys.map(k => [k, true])),
                  }));
                  setFieldErrorText(fieldErrors);
                  scrollToField(fieldKeys[0]);
                }
                // Errors without a field on this form (and other failures) would
                // otherwise leave Save looking like it did nothing.
                if (otherMessages.length > 0 || fieldKeys.length === 0) {
                  Alert.alert(
                    t('error'),
                    otherMessages.join('\n') ||
                      e?.response?.data?.message ||
                      e?.message ||
                      t('failedToCreateChurch'),
                  );
                }
              }
            }}>
            {({values, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting}) => (
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
                      maxLength={10}
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
                      <HelpIcon title={t('multiServiceChurchMsc')} message={t('helpIsMsc')} />
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
                          {t('isThisFirstMsc')} <Text style={{color: '#c00000'}}>*</Text>
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
                      onSearchText={text => {
                        setMotherQuery(text);
                        if (!text.trim()) {
                          cancel('mother');
                          setMotherSearchOptions([]);
                          setMotherSearchPage(1);
                          setMotherSearchHasNext(false);
                          return;
                        }
                        debounce('mother', () => {
                          loadMotherSearchResults(1, text);
                        });
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
                          {t('mscDesignatedParent')} <Text style={{color: '#c00000'}}>*</Text>
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
                        onSearchText={text => {
                          setMotherQuery(text);
                          if (!text.trim()) {
                            cancel('mother');
                            setMotherSearchOptions([]);
                            setMotherSearchPage(1);
                            setMotherSearchHasNext(false);
                            return;
                          }
                          debounce('mother', () => {
                            loadMotherSearchResults(1, text);
                          });
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
                      onSearchText={text => {
                        setLangQuery(text);
                        if (!text.trim()) {
                          cancel('language');
                          setLangSearchOptions([]);
                          setLangSearchPage(1);
                          setLangSearchHasNext(false);
                          return;
                        }
                        debounce('language', () => {
                          loadLanguageSearchResults(1, text);
                        });
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
                      onSearchText={text => {
                        setPastorQuery(text);
                        debounce('pastor', () => {
                          loadPastors(1, text);
                        });
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
                        setFieldValue('city_id', '');
                        setFieldValue('new_city_name', '');
                        setIsAddingNewCity(false);
                        setInvalid(prev => ({
                          ...prev,
                          country_id: false,
                          city_id: false,
                          new_city_name: false,
                        }));
                        clearFieldError('country_id');
                        clearFieldError('city_id');
                        clearFieldError('new_city_name');
                        const id = v as any;
                        if (id) {
                          loadCities(id);
                        } else {
                          setCityOptions([]);
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
                  <View
                    onLayout={e =>
                      setFieldPos('new_city_name', e.nativeEvent.layout.y)
                    }>
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: ms(4),
                        }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexShrink: 1,
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
                        <TouchableOpacity
                          onPress={() => {
                            if (isAddingNewCity) {
                              setIsAddingNewCity(false);
                              setFieldValue('new_city_name', '');
                              setInvalid(prev => ({
                                ...prev,
                                new_city_name: false,
                              }));
                              clearFieldError('new_city_name');
                              return;
                            }
                            setIsAddingNewCity(true);
                            setFieldValue('city_id', '');
                            setInvalid(prev => ({
                              ...prev,
                              city_id: false,
                              new_city_name: false,
                            }));
                            clearFieldError('city_id');
                            clearFieldError('new_city_name');
                          }}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                          <Text
                            style={{
                              color: COLORS.mainColor,
                              fontSize: fs(13),
                              fontWeight: '600',
                            }}>
                            {isAddingNewCity
                              ? t('selectFromList')
                              : t('addNewCity')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <ElementDropdown
                        data={cityOptions}
                        value={values.city_id as any}
                        disabled={isAddingNewCity}
                        onChange={v => {
                          setFieldValue('city_id', v as any);
                          setInvalid(prev => ({...prev, city_id: false}));
                          clearFieldError('city_id');
                        }}
                        placeholder={t('selectOption')}
                        containerStyle={
                          {
                            backgroundColor: C.inputBg,
                            borderColor: invalid?.city_id
                              ? '#db2d2d'
                              : C.inputBorder,
                          } as any
                        }
                      />
                      {isAddingNewCity ? (
                        <View style={{marginTop: ms(8)}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('city')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <AppInput
                            autoCapitalize="words"
                            value={values.new_city_name}
                            placeholder={t('enterNewCityName')}
                            onChangeText={(text: string) => {
                              setFieldValue('new_city_name', text);
                              setInvalid(prev => ({...prev, new_city_name: false}));
                              clearFieldError('new_city_name');
                            }}
                            error={!!invalid?.new_city_name}
                          />
                          {renderFieldError('new_city_name')}
                        </View>
                      ) : null}
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
                  style={globalStyles.mainButton}
                  loading={isSubmitting}
                  disabled={isSubmitting}>
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
        )}
      </Layout>
    </SafeAreaView>
  );
}

// Duplicate legacy block removed
