import React, {useEffect, useMemo, useRef, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  ActivityIndicator,
  ScrollView,
  View,
  Alert,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {globalStyles} from '../../../shared/styles/global';
import {churchStyles} from '../styles';
import {formStyles} from '../../../shared/styles/form';
import {Header} from '../../../shared/components/Header';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {Formik} from 'formik';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import HelpIcon from '../../../shared/components/HelpIcon';
import api from '../../../config/api';
import {useNavigation, useRoute} from '@react-navigation/native';
import {addChurch, getChurchDetail} from '../services/church.service';
import {createCity} from '../services/city.service';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {AddChurchFormValues, useFormOptions} from './utils/addChurch.utils';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {Col, Row, Grid} from 'react-native-easy-grid';
import {ms, hs, fs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {createHierarchyDropdownRenderItem} from '../../../shared/utils/hierarchyDropdown';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {useLatestRequest} from '../hooks/useLatestRequest';
import {fillTemplate, formatYmd, parseYmd, splitApiFieldErrors} from '../utils/churchForm';

/** Fields that show their own error under the input (anything else is alerted). */
const FIELDS_WITH_ERROR_TEXT = new Set([
  'name',
  'enable_cpm',
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
const PASTOR_PAGE_LIMIT = 10;
type Option = {label: string; value: string};

export const AddCloneChurchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const C = useThemedColors();
  const sourceId: number | null = route?.params?.id ?? null;
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
      is_first_msc: t('isThisFirstMsc'),
      enable_cpm: t('houseCp') || 'House C.P.',
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

  const {imagePath, handleImagePick, clearImage} = useImagePicker({
    width: 1600,
    height: 900,
  });
  const {begin, debounce} = useLatestRequest();
  // Photo uploaded by an earlier, failed save: reused instead of uploading again.
  const uploadedPhotoRef = useRef<{source: string; path: string} | null>(null);
  const [cityOptions, setCityOptions] = useState<{label: string; value: string}[]>([]);
  const [isAddingNewCity, setIsAddingNewCity] = useState(false);
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

  // Pastor list: first page from the options hook, then server search / paging
  // (the dropdown used to offer only the first 10 pastors, and the source
  // church's pastor was not shown when it wasn't among them).
  const [pastorOpts, setPastorOpts] = useState<Option[]>([]);
  const [pastorPage, setPastorPage] = useState(1);
  const [pastorHasNext, setPastorHasNext] = useState(false);
  const [pastorQuery, setPastorQuery] = useState('');
  const [selectedPastor, setSelectedPastor] = useState<Option | null>(null);
  useEffect(() => {
    if (!pastorQuery) {
      setPastorOpts(pastorOptions);
      setPastorPage(1);
      setPastorHasNext(pastorOptionsHasNext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastorOptions, pastorOptionsHasNext]);
  const loadPastors = async (page: number, name: string) => {
    const isLatest = begin('pastor');
    try {
      const res = await api.get('users/pastors', {
        params: {
          page,
          limit: PASTOR_PAGE_LIMIT,
          sort_by: 'name',
          sort_desc: false,
          ...(name.trim() ? {name: name.trim()} : {}),
        },
      });
      if (!isLatest()) {
        return;
      }
      const items: Option[] = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setPastorOpts(prev => (page === 1 ? items : [...prev, ...items]));
      setPastorPage(page);
      setPastorHasNext(!!res.data?.data?.has_next);
    } catch {}
  };
  const pastorDropdownData = useMemo(() => {
    if (!selectedPastor || pastorOpts.some(o => o.value === selectedPastor.value)) {
      return pastorOpts;
    }
    return [selectedPastor, ...pastorOpts];
  }, [pastorOpts, selectedPastor]);

  const [sourceLoaded, setSourceLoaded] = useState(!sourceId);
  const [initialFormValues, setInitialFormValues] = useState<AddChurchFormValues>({
    name: '', short_name: '', is_msc: '', is_first_msc: '', enable_cpm: '', parent_id: '', msc_parent_id: '',
    language_id: '', church_type_id: '', pastor_id: '', church_network_id: '',
    church_region_id: '', geographical_region_id: '', language_region_id: '',
    sensitive_nation: '', country_id: '', currency_id: '', city_id: '', new_city_name: '',
    photo_dir: '', service_address_street: '', service_address_postal_code: '',
    mailing_address_postal_code: '', office_address_street: '', office_address_postal_code: '',
    office_phone: '', office_fax: '', email_address: '', website: '',
    facebook: '', instagram: '', twitter: '', date_of_birth: null,
  });

  // Source church failed to load: show a retryable error instead of a blank clone form.
  const [loadError, setLoadError] = useState<unknown>(null);
  const loadTokenRef = useRef(0);

  const loadSource = async () => {
      if (!sourceId) {
        return;
      }
      const token = ++loadTokenRef.current;
      try {
        const d = await getChurchDetail(sourceId);
        if (token !== loadTokenRef.current) {
          return;
        }
        if (!d) {
          // Nothing to clone from: show the retryable error, not an endless spinner.
          setLoadError(new Error(t('noDataFound')));
          return;
        }
        setLoadError(null);
        const name = (d.name || '').trim();
        const shortName = (d.short_name || '').trim();
        const makeCopyShort = (s: string) => {
          const cleanedBase = s.replace(/\s*\d+$/, '').trim();
          const allowedBaseLen = Math.max(0, 10 - 5);
          const base = cleanedBase.slice(0, allowedBaseLen);
          if (!base) {
            return 'copy'.slice(0, 10);
          }
          return `${base} copy`;
        };
        setInitialFormValues({
          name: name ? `${name} copy` : '',
          short_name: shortName ? makeCopyShort(shortName) : '',
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
          new_city_name: '',
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
          date_of_birth: parseYmd(d.date_of_birth),
        });
        if (d.pastor_id) {
          setSelectedPastor({
            value: String(d.pastor_id),
            label: d.pastor_name || String(d.pastor_id),
          });
        }
        setSourceLoaded(true);
        if (d.country_id) {
          await loadCities(d.country_id);
        }
      } catch (e) {
        if (token === loadTokenRef.current) {
          setLoadError(e);
        }
      }
  };

  useEffect(() => {
    loadSource();
    return () => {
      // Invalidate the in-flight request (unmount / source change).
      loadTokenRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('addNewClonedChurch')} showMenu={false} />
        {loadError || optionsError ? (
          <ApiErrorState
            error={loadError || optionsError}
            onRetry={() =>
              Promise.all([
                optionsError ? reloadOptions() : undefined,
                loadError ? loadSource() : undefined,
              ])
            }
          />
        ) : !sourceLoaded ? (
          <ActivityIndicator color={COLORS.mainColor} style={{marginTop: ms(40)}} />
        ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={
            Platform.OS === 'ios'
              ? hs(64)
              : (StatusBar.currentHeight || 0) + hs(50)
          }
          style={{flex: 1}}>
          <ScrollView
            ref={scrollRef}

            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="always"
            contentContainerStyle={{paddingBottom: ms(24)}}>

            <Formik<AddChurchFormValues>
              enableReinitialize
              initialValues={{...initialFormValues}}
              onSubmit={async (values, {setFieldValue: setFormValue}) => {
                try {
                  setFieldErrorText({});
                  const newInvalid: Record<string, boolean> = {};
                  newInvalid.name = !values.name?.trim();
                  newInvalid.enable_cpm = !values.enable_cpm;
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
                    'name', 'enable_cpm', 'church_type_id',
                    'pastor_id',
                    'geographical_region_id', 'country_id',
                    'currency_id', 'new_city_name', 'email_address', 'date_of_birth',
                    'is_first_msc', 'msc_parent_id',
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
                      // A later failure must not create it again on retry: from
                      // now on the form simply has this city selected.
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

                  const toNum = (v: any) =>
                    v !== undefined && v !== null && String(v).trim() !== ''
                      ? Number(v)
                      : undefined;
                  const toStr = (v: any) =>
                    typeof v === 'string' ? v.trim() : v;
                  const ensureShortWithCopy = (s: string) => {
                    const cleanedBase = s.replace(/\s*\d+$/, '').trim();
                    const allowedBaseLen = Math.max(0, 10 - 5);
                    const base = cleanedBase.endsWith(' copy')
                      ? cleanedBase.replace(/\s+copy$/, '')
                      : cleanedBase;
                    const trimmedBase = base.slice(0, allowedBaseLen);
                    if (!trimmedBase) {
                      return 'copy'.slice(0, 10);
                    }
                    return `${trimmedBase} copy`;
                  };
                  const shortName = ensureShortWithCopy(values.short_name || '');

                  let uploadedPhotoPath: string | undefined;
                  if (imagePath && uploadedPhotoRef.current?.source === imagePath) {
                    uploadedPhotoPath = uploadedPhotoRef.current.path;
                  } else if (imagePath) {
                    const form = new FormData();
                    const fileName = imagePath.split('/').pop() || 'photo.jpg';
                    form.append('file', {uri: imagePath, name: fileName, type: 'image/jpeg'} as any);
                    form.append('entity_type', 'churches');
                    form.append('alt_text', values.name || 'church photo');
                    const uploadRes = await api.post('images/upload', form, {
                      headers: {'Content-Type': 'multipart/form-data'},
                    });
                    uploadedPhotoPath = uploadRes?.data?.data?.path;
                    if (!uploadedPhotoPath) {
                      throw new Error(t('photoUploadFailed'));
                    }
                    uploadedPhotoRef.current = {source: imagePath, path: uploadedPhotoPath};
                  }

                  const raw: any = {
                    name: toStr(values.name),
                    short_name: toStr(shortName),
                    is_msc: values.is_msc === 'Yes',
                    is_first_msc:
                      values.is_msc === 'Yes' && values.is_first_msc === 'Yes',
                    enable_cpm: values.enable_cpm ? values.enable_cpm === 'Yes' : false,
                    parent_id: toNum(values.parent_id),
                    msc_parent_id:
                      values.is_msc === 'Yes' && values.is_first_msc === 'No'
                        ? toNum(values.msc_parent_id) ?? 0
                        : 0,
                    language_id: toNum(values.language_id),
                    church_type_id: toNum(values.church_type_id),
                    pastor_id: toNum(values.pastor_id),
                    church_network_id: toNum(values.church_network_id),
                    church_region_id: toNum(values.church_region_id),
                    geographical_region_id: toNum(values.geographical_region_id) ?? 0,
                    language_region_id: toNum(values.language_region_id) ?? 0,
                    country_id: toNum(values.country_id),
                    city_id: toNum(resolvedCityId),
                    currency_id: toNum(values.currency_id),
                    sensitive_nation: values.sensitive_nation === 'Yes',
                    photo: uploadedPhotoPath,
                    service_address_street: toStr(values.service_address_street),
                    service_address_postal_code: toStr(values.service_address_postal_code),
                    mailing_address_postal_code: toStr(values.mailing_address_postal_code),
                    office_address_street: toStr(values.office_address_street),
                    office_address_postal_code: toStr(values.office_address_postal_code),
                    office_phone: toStr(values.office_phone),
                    office_fax: toStr(values.office_fax),
                    email_address: toStr(values.email_address),
                    website: toStr(values.website),
                    facebook: toStr(values.facebook),
                    instagram: toStr(values.instagram),
                    twitter: toStr(values.twitter),
                    // Local calendar date: toISOString() shifted it to the previous
                    // day east of UTC (e.g. Vietnam).
                    date_of_birth: formatYmd(values.date_of_birth) ?? undefined,
                    service_venue: '',
                    church_planting_projection_id: 0,
                    photo_dir: toStr(values.photo_dir),
                    mailing_address_street: '',
                    property: '',
                  };
                  const payload: any = Object.fromEntries(
                    Object.entries(raw).filter(([_, v]) => v !== undefined),
                  );
                  await addChurch(payload);
                  markDataChanged('churches');
                  Alert.alert(t('success'), t('cloneChurchSuccess'));
                  // navigate() would push a new list on top of this filled form
                  // (React Navigation 7): Back + Save would clone it twice.
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
                  if (otherMessages.length > 0 || fieldKeys.length === 0) {
                    Alert.alert(
                      t('error'),
                      otherMessages.join('\n') ||
                        e?.response?.data?.message ||
                        e?.message ||
                        t('failedToCloneChurch'),
                    );
                  }
                }
              }}>
              {({values, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting}) => (
                <Grid>
                  <Row>
                    <Col>
                  <View style={{gap: ms(12)}}>

                    {/* Church Name */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('name', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('churchName')} <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon title={t('churchName')} message={t('helpChurchName')} />
                        </View>
                        <AppInput
                          autoCapitalize="words"
                          value={values.name}
                          onChangeText={v => {
                            setFieldValue('name', v);
                            setInvalid(prev => ({...prev, name: false}));
                            clearFieldError('name');
                          }}
                          onBlur={handleBlur('name')}
                          error={!!invalid?.name}
                        />
                        {renderFieldError('name')}
                      </View>
                    </View>

                    {/* Short Name */}
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('shortName')}
                            <Text style={formStyles.subLabel}> [{t('only10Chars')}]</Text>
                          </Text>
                          <HelpIcon title={t('shortName')} message={t('helpShortName')} />
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

                    {/* MSC */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('is_msc', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('isMultiServiceChurchMsc')}
                          </Text>
                          <HelpIcon title={t('multiServiceChurchMsc')} message={t('helpIsMsc')} />
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
                      <View
                        style={churchStyles.row}
                        onLayout={e =>
                          setFieldPos('is_first_msc', e.nativeEvent.layout.y)
                        }>
                        <View style={churchStyles.input}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('isThisFirstMsc')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <ElementDropdown
                            data={[
                              {label: t('yes'), value: 'Yes'},
                              {label: t('no'), value: 'No'},
                            ]}
                            value={values.is_first_msc as any}
                            onChange={v => {
                              setFieldValue('is_first_msc', (v as string) || '');
                              setInvalid(prev => ({
                                ...prev,
                                is_first_msc: false,
                              }));
                              clearFieldError('is_first_msc');
                              const next = (v as string) || '';
                              if (next !== 'No') {
                                setFieldValue('msc_parent_id', '');
                                setInvalid(prev => ({
                                  ...prev,
                                  msc_parent_id: false,
                                }));
                                clearFieldError('msc_parent_id');
                              }
                            }}
                            placeholder={t('selectOption')}
                            containerStyle={{
                              backgroundColor: C.inputBg,
                              borderColor: invalid?.is_first_msc
                                ? '#db2d2d'
                                : C.inputBorder,
                            } as any}
                            error={!!invalid?.is_first_msc}
                          />
                          {renderFieldError('is_first_msc')}
                        </View>
                      </View>
                    )}

                    {/* House C.P. */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('enable_cpm', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('houseCp')}? <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon title={t('houseCp')} message={t('helpEnableCp')} />
                        </View>
                        <ElementDropdown
                          data={[{label: t('yes'), value: 'Yes'}, {label: t('no'), value: 'No'}]}
                          value={values.enable_cpm as any}
                          onChange={v => {
                            setFieldValue('enable_cpm', (v as string) || '');
                            setInvalid(prev => ({...prev, enable_cpm: false}));
                            clearFieldError('enable_cpm');
                          }}
                          placeholder={t('selectOption')}
                          containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.enable_cpm ? '#db2d2d' : C.inputBorder} as any}
                          error={!!invalid?.enable_cpm}
                        />
                        {renderFieldError('enable_cpm')}
                      </View>
                    </View>

                    {/* Language */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('language_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('language')}
                          </Text>
                          <HelpIcon title={t('language')} message={t('helpLanguage')} />
                        </View>
                        <ElementDropdown
                          data={languageOptions}
                          value={values.language_id as any}
                          onChange={v => {
                            setFieldValue('language_id', v as any);
                            setInvalid(prev => ({...prev, language_id: false}));
                            clearFieldError('language_id');
                          }}
                          placeholder={t('selectOption')}
                          containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.language_id ? '#db2d2d' : C.inputBorder} as any}
                          error={!!invalid?.language_id}
                        />
                        {renderFieldError('language_id')}
                      </View>
                    </View>

                    {/* Mother Church */}
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('motherChurch')}
                          </Text>
                          <HelpIcon title={t('motherChurch')} message={t('helpMotherChurch')} />
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
                      <View
                        style={churchStyles.row}
                        onLayout={e =>
                          setFieldPos('msc_parent_id', e.nativeEvent.layout.y)
                        }>
                        <View style={churchStyles.input}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('mscDesignatedParent')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <ElementDropdown
                            data={motherChurchOptions}
                            value={values.msc_parent_id as any}
                            onChange={v => {
                              setFieldValue('msc_parent_id', v as any);
                              setInvalid(prev => ({
                                ...prev,
                                msc_parent_id: false,
                              }));
                              clearFieldError('msc_parent_id');
                            }}
                            placeholder={t('selectOption')}
                            containerStyle={{
                              backgroundColor: C.inputBg,
                              borderColor: invalid?.msc_parent_id
                                ? '#db2d2d'
                                : C.inputBorder,
                            } as any}
                            error={!!invalid?.msc_parent_id}
                          />
                          {renderFieldError('msc_parent_id')}
                        </View>
                      </View>
                    )}

                    {/* Church Type */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('church_type_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('churchType')} <Text style={{color: '#c00000'}}>*</Text>
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

                    {/* Pastor Leader */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('pastor_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('pastorLeader')} <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon title={t('pastorLeader')} message={t('helpPastorLeader')} />
                        </View>
                        <ElementDropdown
                          data={pastorDropdownData}
                          value={values.pastor_id as any}
                          onChange={v => {
                            setFieldValue('pastor_id', v as any);
                            setSelectedPastor(
                              pastorDropdownData.find(o => o.value === String(v)) ?? null,
                            );
                            setInvalid(prev => ({...prev, pastor_id: false}));
                            clearFieldError('pastor_id');
                          }}
                          placeholder={t('selectOption')}
                          containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.pastor_id ? '#db2d2d' : C.inputBorder} as any}
                          error={!!invalid?.pastor_id}
                          onSearchText={text => {
                            setPastorQuery(text);
                            debounce('pastor', () => {
                              loadPastors(1, text);
                            });
                          }}
                          onEndReached={() => {
                            if (pastorHasNext) {
                              loadPastors(pastorPage + 1, pastorQuery);
                            }
                          }}
                        />
                        {renderFieldError('pastor_id')}
                      </View>
                    </View>

                    {/* Church Network */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('church_network_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
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
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('church_region_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
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
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('geographical_region_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('geographicalRegion')} <Text style={{color: '#c00000'}}>*</Text>
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
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('language_region_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
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
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('sensitiveNation')}?
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
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('country_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                          {t('nation')} <Text style={{color: '#c00000'}}>*</Text>
                        </Text>
                        <ElementDropdown
                          data={countryOptions}
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
                          containerStyle={{backgroundColor: C.inputBg, borderColor: invalid?.country_id ? '#db2d2d' : C.inputBorder} as any}
                          error={!!invalid?.country_id}
                        />
                        {renderFieldError('country_id')}
                      </View>
                    </View>

                    {/* City */}
                    {values.country_id ? (
                      <View
                        style={churchStyles.row}
                        onLayout={e =>
                          setFieldPos('new_city_name', e.nativeEvent.layout.y)
                        }>
                        <View style={churchStyles.input}>
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
                              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                                {t('cityTownVillage')}
                              </Text>
                              <HelpIcon title={t('cityTownVillage')} message={t('helpCity')} />
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
                            containerStyle={{backgroundColor: C.inputBg, borderColor: C.inputBorder} as any}
                          />
                          {isAddingNewCity ? (
                            <View style={{marginTop: ms(8)}}>
                              <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
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

                    {/* Currency */}
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('currency_id', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('currency')} <Text style={{color: '#c00000'}}>*</Text>
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
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('churchPhoto')}
                          </Text>
                          <HelpIcon title={t('churchPhoto')} message={t('helpChurchPhoto')} />
                        </View>
                        <TouchableOpacity
                          onPress={() => handleImagePick()}
                          style={[formStyles.avatarSquare as any, {backgroundColor: C.inputBg, borderColor: C.inputBorder}] as any}>
                          {imagePath ? (
                            <>
                              <Image source={{uri: imagePath}} style={formStyles.avatarImage as any} resizeMode="cover" />
                              <TouchableOpacity onPress={clearImage} style={formStyles.avatarClose as any}>
                                <Text style={{color: '#fff'}}>✗</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Text style={[formStyles.avatarPlus as any, {color: C.textSecondary}] as any}>+</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Service Postal Code */}
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
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
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('email_address', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('emailAddress')} <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                        </View>
                        <AppInput
                          value={values.email_address}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onChangeText={v => {
                            setFieldValue('email_address', v);
                            setInvalid(prev => ({...prev, email_address: false}));
                            clearFieldError('email_address');
                          }}
                          onBlur={handleBlur('email_address')}
                          error={!!invalid?.email_address}
                        />
                        {renderFieldError('email_address')}
                      </View>
                    </View>

                    {/* Website */}
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
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
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
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
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
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
                    <View style={churchStyles.row}>
                      <View style={churchStyles.input}>
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
                    <View
                      style={churchStyles.row}
                      onLayout={e => setFieldPos('date_of_birth', e.nativeEvent.layout.y)}>
                      <View style={churchStyles.input}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
                            {t('dob')} <Text style={{color: '#c00000'}}>*</Text>
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
};
