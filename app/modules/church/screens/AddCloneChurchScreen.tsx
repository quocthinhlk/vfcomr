import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Input, Button } from '@ui-kitten/components';
import { globalStyles } from '../../../shared/styles/global';
import { churchStyles } from '../styles';
import { Header } from '../../../shared/components/Header';
import { BackButton } from '../../../shared/components/BackButton';
import { Formik } from 'formik';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import HelpIcon from '../../../shared/components/HelpIcon';
import api from '../../../config/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addChurch, getChurchDetail } from '../services/church.service';
import { useImagePicker } from '../../church/hooks/useImagePicker';
import { AddChurchFormValues, useFormOptions } from './utils/addChurch.utils';
import { useThemedColors } from '../../../shared/styles/theme';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';

export const AddCloneChurchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const C = useThemedColors();
  const sourceId: number | null = route?.params?.id ?? null;
  const scrollRef = useRef<ScrollView>(null);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const setFieldPos = (key: string, y: number) => setFieldY(prev => (prev[key] === y ? prev : { ...prev, [key]: y }));
  const scrollToField = (key: string) => { const y = fieldY[key] ?? 0; scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true }); };

  const { motherChurchOptions, churchTypeOptions, churchNetworkOptions, pastorOptions, languageOptions, churchRegionOptions, geographicalRegionOptions, languageRegionOptions, countryOptions, localCurrencyOptions } = useFormOptions();
  // Church photo: enforce 16:9 crop ratio (e.g. 1600x900)
  const { imagePath, handleImagePick, clearImage } = useImagePicker({ width: 1600, height: 900 });
  const [cityOptions, setCityOptions] = useState<{ label: string; value: string }[]>([]);
  const loadCities = async (countryId: string | number) => {
    try {
      const res = await api.get(`cities/country/${countryId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCityOptions(list.map((x: any) => ({ label: x.name, value: String(x.id) })));
    } catch {}
  };

  const [initialFormValues, setInitialFormValues] = useState<AddChurchFormValues>({
    name: '', short_name: '', is_msc: '', enable_cpm: '', parent_id: '', language_id: '', church_type_id: '', pastor_id: '', church_network_id: '', church_region_id: '', geographical_region_id: '', language_region_id: '', sensitive_nation: '', country_id: '', currency_id: '', city_id: '', photo_dir: '', service_address_street: '', service_address_postal_code: '', mailing_address_postal_code: '', office_address_street: '', office_address_postal_code: '', office_phone: '', office_fax: '', email_address: '', website: '', facebook: '', instagram: '', twitter: '', date_of_birth: null,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!sourceId) return;
      try {
        const d = await getChurchDetail(sourceId);
        if (!mounted || !d) return;
        const name = (d.name || '').trim();
        const shortName = (d.short_name || '').trim();
        const makeCopyShort = (s: string) => {
          // Ensure result ends with ' copy' and total length <= 8
          // Remove trailing digits and spaces from base
          const cleanedBase = s.replace(/\s*\d+$/, '').trim();
          const allowedBaseLen = Math.max(0, 8 - 5); // space + 'copy' = 5
          const base = cleanedBase.slice(0, allowedBaseLen);
          if (!base) return 'copy'.slice(0, 8); // fallback when base empty
          return `${base} copy`;
        };
        setInitialFormValues({
          name: name ? `${name} copy` : '',
          short_name: shortName ? makeCopyShort(shortName) : '',
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
        if (d.country_id) { await loadCities(d.country_id); }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [sourceId]);

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
    <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
    <Header title={t('addNewClonedChurch')} showMenu={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : ((StatusBar.currentHeight || 0) + 50)}
          style={{ flex: 1 }}
        >
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="always" contentContainerStyle={{ paddingBottom: 24 }}>

          <Formik<AddChurchFormValues>
            enableReinitialize
            initialValues={{ ...initialFormValues }}
            onSubmit={async (values) => {
              try {
                const newInvalid: Record<string, boolean> = {};
                newInvalid.name = !values.name;
                newInvalid.is_msc = !values.is_msc;
                newInvalid.enable_cpm = !values.enable_cpm;
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
                const firstInvalidKey = ['name','is_msc','enable_cpm','language_id','church_type_id','pastor_id','church_network_id','church_region_id','geographical_region_id','language_region_id','country_id','currency_id','email_address','date_of_birth'].find(k => newInvalid[k]);
                if (firstInvalidKey) { scrollToField(firstInvalidKey); Alert.alert(t('validation'), t('fillRequiredFields')); return; }

                const toNum = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? Number(v) : undefined);
                const toStr = (v: any) => (typeof v === 'string' ? v.trim() : v);
                const ensureShortWithCopy = (s: string) => {
                  const cleanedBase = s.replace(/\s*\d+$/, '').trim();
                  const allowedBaseLen = Math.max(0, 8 - 5);
                  const base = cleanedBase.endsWith(' copy') ? cleanedBase.replace(/\s+copy$/, '') : cleanedBase;
                  const trimmedBase = base.slice(0, allowedBaseLen);
                  if (!trimmedBase) return 'copy'.slice(0, 8);
                  return `${trimmedBase} copy`;
                };
                const shortName = ensureShortWithCopy(values.short_name || '');
                // upload church picture first if selected
                let uploadedPhotoPath: string | undefined;
                if (imagePath) {
                  const form = new FormData();
                  const fileName = imagePath.split('/').pop() || 'photo.jpg';
                  form.append('file', { uri: imagePath, name: fileName, type: 'image/jpeg' } as any);
                  form.append('entity_type', 'churches');
                  form.append('alt_text', values.name || 'church photo');
                  const uploadRes = await api.post('images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                  uploadedPhotoPath = uploadRes?.data?.data?.path;
                }

                const raw: any = {
                  name: toStr(values.name),
                  short_name: toStr(shortName),
                  is_msc: values.is_msc === 'Yes',
                  is_first_msc: false,
                  enable_cpm: values.enable_cpm ? values.enable_cpm === 'Yes' : false,
                  parent_id: toNum(values.parent_id),
                  language_id: toNum(values.language_id),
                  church_type_id: toNum(values.church_type_id),
                  pastor_id: toNum(values.pastor_id),
                  church_network_id: toNum(values.church_network_id),
                  church_region_id: toNum(values.church_region_id),
                  geographical_region_id: toNum(values.geographical_region_id) ?? 0,
                  language_region_id: toNum(values.language_region_id) ?? 0,
                  country_id: toNum(values.country_id),
                  city_id: toNum(values.city_id),
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
                  twitter: toStr(values.twitter),
                  date_of_birth: values.date_of_birth ? values.date_of_birth.toISOString().split('T')[0] : undefined,
                  // fields required by API schema with default values
                  service_venue: '',
                  church_planting_projection_id: 0,
                  msc_parent_id: 0,
                  photo_dir: toStr(values.photo_dir),
                  mailing_address_street: '',
                  property: '',
                };
                const payload: any = Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== undefined));
                // debug: inspect payload & response
                try { console.log('createChurch payload', payload); } catch {}
                const res = await addChurch(payload);
        try { console.log('createChurch response', res); } catch {}
        Alert.alert(t('success'), 'Church cloned successfully');
                navigation.navigate('Churches');
              } catch (e: any) {
                let msg = e?.response?.data?.message || e?.message || 'Failed to clone church';
                const extra = e?.response?.data && typeof e.response.data !== 'string' ? `\n${JSON.stringify(e.response.data)}` : '';
                Alert.alert('Error', `${msg}${extra}`);
              }
            }}
          >
            {({ values, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
              <View>
                <View style={churchStyles.row} onLayout={e => setFieldPos('name', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('churchName')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('churchName')} message={t('helpChurchName')} size={13} offsetY={-2} />
                    </View>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.name ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="words"
                      value={values.name}
                      onChangeText={t => { setFieldValue('name', t); setInvalid(prev => ({ ...prev, name: false })); }}
                      onBlur={handleBlur('name')}
                      status={invalid?.name ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('shortName')} [{t('only8Chars')}]</Text>
                      <HelpIcon title={t('shortName')} message={t('helpShortName')} size={13} offsetY={-2} />
                    </View>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.short_name}
                      onChangeText={handleChange('short_name')}
                      onBlur={handleBlur('short_name')}
                    />
                  </View>
                </View>

                <View style={churchStyles.row} onLayout={e => setFieldPos('is_msc', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('msc')}? <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('msc')} message={t('helpIsMsc')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={[{ label: t('yes'), value: 'Yes' }, { label: t('no'), value: 'No' }]} value={values.is_msc as any} onChange={v => { setFieldValue('is_msc', (v as string) || ''); setInvalid(prev => ({ ...prev, is_msc: false })); }} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.is_msc ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.is_msc} />
                  </View>
                </View>

                <View style={churchStyles.row} onLayout={e => setFieldPos('enable_cpm', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('houseCp')}? <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('houseCp')} message={t('helpEnableCp')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={[{ label: t('yes'), value: 'Yes' }, { label: t('no'), value: 'No' }]} value={values.enable_cpm as any} onChange={v => { setFieldValue('enable_cpm', (v as string) || ''); setInvalid(prev => ({ ...prev, enable_cpm: false })); }} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.enable_cpm ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.enable_cpm} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('language')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('language')} message={t('helpLanguage')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={languageOptions} value={values.language_id as any} onChange={v => { setFieldValue('language_id', v as any); setInvalid(prev => ({ ...prev, language_id: false })); }} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.language_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.language_id} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('motherChurch')}</Text>
                      <HelpIcon title={t('motherChurch')} message={t('helpMotherChurch')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={motherChurchOptions} value={values.parent_id as any} onChange={v => setFieldValue('parent_id', v as any)} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('churchType')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('churchType')} message={t('helpChurchType')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={churchTypeOptions} value={values.church_type_id as any} onChange={v => { setFieldValue('church_type_id', v as any); setInvalid(prev => ({ ...prev, church_type_id: false })); }} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.church_type_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.church_type_id} />
                  </View>
                </View>

                <View style={churchStyles.row} onLayout={e => setFieldPos('pastor_id', e.nativeEvent.layout.y)}>
                    <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('pastorLeader')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('pastorLeader')} message={t('helpPastorLeader')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown
                      data={pastorOptions}
                      value={values.pastor_id as any}
                      onChange={v => { setFieldValue('pastor_id', v as any); setInvalid(prev => ({ ...prev, pastor_id: false })); }}
                      placeholder="Select option"
                      containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.pastor_id ? '#db2d2d' : C.inputBorder } as any}
                      error={!!invalid?.pastor_id}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('churchNetwork')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('churchNetwork')} message={t('helpChurchNetwork')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={churchNetworkOptions} value={values.church_network_id as any} onChange={v => { setFieldValue('church_network_id', v as any); setInvalid(prev => ({ ...prev, church_network_id: false })); }} placeholder="Select option" containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.church_network_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.church_network_id} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('apostolicRegion')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('apostolicRegion')} message={t('helpApostolicRegion')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={churchRegionOptions} value={values.church_region_id as any} onChange={v => { setFieldValue('church_region_id', v as any); setInvalid(prev => ({ ...prev, church_region_id: false })); }} placeholder="Select option" containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.church_region_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.church_region_id} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('geographicalRegion')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('geographicalRegion')} message={t('helpGeographicalRegion')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={geographicalRegionOptions} value={values.geographical_region_id as any} onChange={v => { setFieldValue('geographical_region_id', v as any); setInvalid(prev => ({ ...prev, geographical_region_id: false })); }} placeholder="Select option" containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.geographical_region_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.geographical_region_id} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('languageRegion')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('languageRegion')} message={t('helpLanguageRegion')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={languageRegionOptions} value={values.language_region_id as any} onChange={v => { setFieldValue('language_region_id', v as any); setInvalid(prev => ({ ...prev, language_region_id: false })); }} placeholder="Select option" containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.language_region_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.language_region_id} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('sensitiveNation')}?</Text>
                      <HelpIcon title={t('sensitiveNation')} message={t('helpSensitiveNation')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={[{ label: t('yes'), value: 'Yes' }, { label: t('no'), value: 'No' }]} value={values.sensitive_nation as any} onChange={v => setFieldValue('sensitive_nation', (v as string) || '')} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                      {t('country')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <ElementDropdown data={countryOptions} value={values.country_id as any} onChange={v => { setFieldValue('country_id', v as any); setInvalid(prev => ({ ...prev, country_id: false })); const id = v as any; if (id) loadCities(id); }} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.country_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.country_id} />
                  </View>
                </View>

                {values.country_id ? (
                  <View style={churchStyles.row}>
                    <View style={churchStyles.input}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('city')}</Text>
                        <HelpIcon title={t('city')} message={t('helpCity')} size={13} offsetY={-2} />
                      </View>
                      <ElementDropdown data={cityOptions} value={values.city_id as any} onChange={v => setFieldValue('city_id', v as any)} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: C.inputBorder } as any} />
                    </View>
                  </View>
                ) : null}

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('currency')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('currency')} message={t('helpCurrency')} size={13} offsetY={-2} />
                    </View>
                    <ElementDropdown data={localCurrencyOptions} value={values.currency_id as any} onChange={v => { setFieldValue('currency_id', v as any); setInvalid(prev => ({ ...prev, currency_id: false })); }} placeholder={t('selectOption')} containerStyle={{ ...(churchStyles.input as any), backgroundColor: C.inputBg, borderColor: invalid?.currency_id ? '#db2d2d' : C.inputBorder } as any} error={!!invalid?.currency_id} />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('churchPhoto')}</Text>
                      <HelpIcon title={t('churchPhoto')} message={t('helpChurchPhoto')} size={13} offsetY={-2} />
                    </View>
                    <TouchableOpacity onPress={() => handleImagePick()} style={[churchStyles.avatarSquare as any, { backgroundColor: C.inputBg, borderColor: C.inputBorder }] as any}>
                      {imagePath ? (
                        <>
                          <Image source={{ uri: imagePath }} style={churchStyles.avatarImage as any} resizeMode="cover" />
                          <TouchableOpacity onPress={clearImage} style={churchStyles.avatarClose as any}><Text style={{ color: '#fff' }}>✗</Text></TouchableOpacity>
                        </>
                      ) : (<><Text style={[churchStyles.avatarPlus as any, { color: C.textSecondary }] as any}>+</Text></>)}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('servicePostalCode')}</Text>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.service_address_postal_code}
                      onChangeText={handleChange('service_address_postal_code')}
                      onBlur={handleBlur('service_address_postal_code')}
                    />
                  </View>
                </View>

                <View style={churchStyles.row} onLayout={e => setFieldPos('email_address', e.nativeEvent.layout.y)}>
                  <View style={churchStyles.input}>
                    <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                      {t('emailAddress')} <Text style={{ color: '#c00000' }}>*</Text>
                    </Text>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: invalid?.email_address ? '#db2d2d' : C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      value={values.email_address}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onChangeText={t => { setFieldValue('email_address', t); setInvalid(prev => ({ ...prev, email_address: false })); }}
                      onBlur={handleBlur('email_address')}
                      status={invalid?.email_address ? 'danger' : 'basic'}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('website')}</Text>
                      <HelpIcon title={t('website')} message={t('helpWebsite')} size={13} offsetY={-2} />
                    </View>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.website}
                      onChangeText={handleChange('website')}
                      onBlur={handleBlur('website')}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">{t('facebook')}</Text>
                      <HelpIcon title={t('facebook')} message={t('helpFacebook')} size={13} offsetY={-2} />
                    </View>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.facebook}
                      onChangeText={handleChange('facebook')}
                      onBlur={handleBlur('facebook')}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">Instagram</Text>
                      <HelpIcon title="Instagram" message={t('helpInstagram')} size={13} offsetY={-2} />
                    </View>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.instagram}
                      onChangeText={handleChange('instagram')}
                      onBlur={handleBlur('instagram')}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">X</Text>
                      <HelpIcon title="X" message={t('helpX')} size={13} offsetY={-2} />
                    </View>
                    <Input
                      style={[churchStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
                      textStyle={churchStyles.inputTextStyle}
                      autoCapitalize="none"
                      value={values.twitter}
                      onChangeText={handleChange('twitter')}
                      onBlur={handleBlur('twitter')}
                    />
                  </View>
                </View>

                <View style={churchStyles.row}>
                  <View style={churchStyles.input}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[churchStyles.label, { color: C.textSecondary }]} category="label">
                        {t('dob')} <Text style={{ color: '#c00000' }}>*</Text>
                      </Text>
                      <HelpIcon title={t('dob')} message={t('helpDob')} size={13} offsetY={-2} />
                    </View>
                    <DateTripleDropdown
                      value={values.date_of_birth}
                      onChange={d => { setFieldValue('date_of_birth', d); setInvalid(prev => ({ ...prev, date_of_birth: false })); }}
                      yearRange={50}
                      startYear={new Date().getFullYear() - 50}
                      error={!!invalid?.date_of_birth}
                    />
                  </View>
                </View>

                <Button onPress={() => handleSubmit()} style={[globalStyles.button, { marginTop: 16 }]}>{t('save')}</Button>
              </View>
            )}
          </Formik>
      </ScrollView>
        </KeyboardAvoidingView>
    </Layout>
  </SafeAreaView>
); 
};