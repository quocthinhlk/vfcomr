import React, {useEffect, useRef, useState} from 'react';
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

  // Lazy-load states for paginated dropdowns
  const [langOptions, setLangOptions] = useState<{label: string; value: string}[]>(languageOptions);
  const [langPage, setLangPage] = useState(1);
  const [langHasNext, setLangHasNext] = useState(false);
  const [langQuery, setLangQuery] = useState('');

  const [motherOptions, setMotherOptions] = useState<{label: string; value: string}[]>(motherChurchOptions);
  const [motherPage, setMotherPage] = useState(1);
  const [motherHasNext, setMotherHasNext] = useState(false);
  const [motherQuery, setMotherQuery] = useState('');

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
  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({y: Math.max(0, y - ms(20)), animated: true});
  };
  const clearInvalid = (key: string) => setInvalid(prev => ({...prev, [key]: false}));

  const loadCities = async (countryId: string | number) => {
    try {
      const res = await api.get(`cities/country/${countryId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCityOptions(list.map((x: any) => ({label: x.name, value: String(x.id)})));
    } catch {}
  };

  const loadLanguages = async (page: number, name?: string) => {
    try {
      const res = await api.get('languages', {
        params: {page, limit: PAGE_LIMIT, ...(name?.trim() ? {name: name.trim()} : {})},
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

  const loadMothers = async (page: number, name?: string) => {
    try {
      const res = await api.get('churches', {
        params: {
          page,
          limit: PAGE_LIMIT,
          sort_by: 'id',
          sort_desc: true,
          ...(name?.trim() ? {name: name.trim()} : {}),
        },
      });
      const items = ((res.data?.data?.items ?? []) as any[]).map(i => ({
        label: i.name,
        value: String(i.id),
      }));
      setMotherOptions(prev => (page === 1 ? items : [...prev, ...items]));
      setMotherPage(page);
      setMotherHasNext(!!res.data?.data?.has_next);
    } catch {}
  };

  const loadPastors = async (page: number, name?: string) => {
    try {
      const res = await api.get('users/pastors', {
        params: {page, limit: PAGE_LIMIT, ...(name?.trim() ? {name: name.trim()} : {})},
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
        params: {page, limit: 1000, ...(name?.trim() ? {name: name.trim()} : {})},
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
    if (!langQuery && langPage === 1) {
      setLangOptions(languageOptions);
    }
  }, [languageOptions]);
  useEffect(() => {
    if (!motherQuery && motherPage === 1) {
      setMotherOptions(motherChurchOptions);
    }
  }, [motherChurchOptions]);
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
            enable_cpm: d.enable_cpm ? 'Yes' : 'No',
            parent_id: d.parent_id ? String(d.parent_id) : '',
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
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [initialFormValues, setInitialFormValues] = useState<AddChurchFormValues>({
    name: '',
    short_name: '',
    is_msc: '',
    enable_cpm: '',
    parent_id: '',
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
            showsVerticalScrollIndicator={false}
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
                const newInvalid: Record<string, boolean> = {};
                newInvalid.name = !values.name;
                newInvalid.is_msc = !values.is_msc;
                newInvalid.language_id = !values.language_id;
                newInvalid.church_type_id = !values.church_type_id;
                newInvalid.pastor_id = !values.pastor_id;
                newInvalid.church_network_id = !values.church_network_id;
                newInvalid.church_region_id = !values.church_region_id;
                newInvalid.geographical_region_id = !values.geographical_region_id;
                newInvalid.language_region_id = !values.language_region_id;
                newInvalid.country_id = !values.country_id;
                newInvalid.currency_id = !values.currency_id;
                newInvalid.email_address = !values.email_address;
                newInvalid.date_of_birth = !values.date_of_birth;
                setInvalid(newInvalid);
                const firstInvalidKey = [
                  'name',
                  'is_msc',
                  'language_id',
                  'church_type_id',
                  'pastor_id',
                  'church_network_id',
                  'church_region_id',
                  'geographical_region_id',
                  'language_region_id',
                  'country_id',
                  'currency_id',
                  'email_address',
                  'date_of_birth',
                ].find(k => newInvalid[k]);
                if (firstInvalidKey) {
                  scrollToField(firstInvalidKey);
                  Alert.alert('Validation', 'Please fill all required fields.');
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
                  is_first_msc: false,
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
                  msc_parent_id: 0,
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
              <View>
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
                      }}
                      onBlur={handleBlur('name')}
                      error={!!invalid?.name}
                    />
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
                        {t('msc')}?{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.is_msc
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.is_msc}
                    />
                  </View>
                </View>

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
                      data={motherOptions}
                      value={values.parent_id as any}
                      onChange={v => setFieldValue('parent_id', v as any)}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: C.inputBorder,
                        } as any
                      }
                      onSearchText={async text => {
                        setMotherQuery(text);
                        await loadMothers(1, text);
                      }}
                      onEndReached={async () => {
                        if (motherHasNext) {
                          await loadMothers(motherPage + 1, motherQuery);
                        }
                      }}
                    />
                  </View>
                </View>

                <View>
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text
                        style={[formStyles.label, {color: C.textSecondary}]}
                        category="label">
                        {t('languageUsedInTheService')}{' '}
                        <Text style={{color: '#c00000'}}>*</Text>
                      </Text>
                    </View>
                    <ElementDropdown
                      data={langOptions}
                      value={values.language_id as any}
                      onChange={v => {
                        setFieldValue('language_id', v as any);
                        setInvalid(prev => ({...prev, language_id: false}));
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.language_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.church_type_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.church_type_id}
                      onSearchText={async text => {
                        try {
                          const res = await api.get('church-types');
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
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
                        <Text style={{color: '#c00000'}}>*</Text>
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.church_network_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.church_network_id}
                      onSearchText={async _text => {
                        try {
                          const res = await api.get('church-networks');
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
                        <Text style={{color: '#c00000'}}>*</Text>
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.church_region_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.church_region_id}
                      onSearchText={async _text => {
                        try {
                          const res = await api.get('church-regions');
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
                      onChange={v => {
                        setFieldValue('geographical_region_id', v as any);
                        setInvalid(prev => ({
                          ...prev,
                          geographical_region_id: false,
                        }));
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.geographical_region_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.geographical_region_id}
                    />
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
                        <Text style={{color: '#c00000'}}>*</Text>
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.language_region_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.language_region_id}
                    />
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
                          ...(formStyles.input as any),
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
                      {t('country')}{' '}
                      <Text style={{color: '#c00000'}}>*</Text>
                    </Text>
                    <ElementDropdown
                      data={countryOpts}
                      value={values.country_id as any}
                      onChange={v => {
                        setFieldValue('country_id', v as any);
                        setInvalid(prev => ({...prev, country_id: false}));
                        const id = v as any;
                        if (id) {
                          loadCities(id);
                        }
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
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
                          {t('city')}
                        </Text>
                        <HelpIcon
                          title={t('city')}
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
                            ...(formStyles.input as any),
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
                      }}
                      placeholder={t('selectOption')}
                      containerStyle={
                        {
                          ...(formStyles.input as any),
                          backgroundColor: C.inputBg,
                          borderColor: invalid?.currency_id
                            ? '#db2d2d'
                            : C.inputBorder,
                        } as any
                      }
                      error={!!invalid?.currency_id}
                      onSearchText={async _text => {
                        try {
                          const res = await api.get('currencies');
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
                      }}
                      onBlur={handleBlur('email_address')}
                      error={!!invalid?.email_address}
                    />
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
                      }}
                      yearRange={50}
                      startYear={new Date().getFullYear() - 50}
                      error={!!invalid?.date_of_birth}
                    />
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
