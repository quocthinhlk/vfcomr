import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Image,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Input, Button, Layout, Datepicker, Text} from '@ui-kitten/components';
import DateTripleDropdown from '../../../shared/components/DateTripleDropdown';
import {BackButton} from '../../../shared/components/BackButton';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import CountryPicker, {
  Country,
  CountryCode,
} from 'react-native-country-picker-modal';
import {resolveByCallingCodePrefix} from '../config/phone';
import {formStyles} from '../../../shared/styles/form';
import {getChurchesList} from '../../church/services/church.service';
import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';
import {getUserById, updateUser} from '../services/user.service';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useImagePicker} from '../../church/hooks/useImagePicker';
import {authImages} from '../../auth/config/auth.constants';
import {Formik} from 'formik';
import {COLORS} from '../../../shared/constants/colors';
import HelpIcon from '../../../shared/components/HelpIcon';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {Col, Row, Grid} from 'react-native-easy-grid';

export default function EditProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const userId = Number(route.params?.id);
  const {t} = useTranslation();
  const C = useThemedColors();
  const cpTheme: any = {
    primaryColor: C.textPrimary,
    primaryColorVariant: C.textSecondary,
    backgroundColor: C.surface,
    onBackgroundTextColor: C.textPrimary,
    filterPlaceholderTextColor: C.textSecondary,
  };

  const {imagePath, handleImagePick, clearImage} = useImagePicker();

  const scrollRef = useRef<ScrollView>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<any | null>(null);

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
  const [churchQuery, setChurchQuery] = useState<string>('');

  const clearInvalid = (key: string) =>
    setInvalid(prev => ({...prev, [key]: false}));
  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : {...prev, [key]: y}));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({y: Math.max(0, y - 20), animated: true});
  };

  const formatPhoneReadable = (digits: string) => {
    if (!digits) {return '';}
    const only = String(digits).replace(/\D/g, '').slice(0, 15);
    return only.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

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
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const [form, userRes] = await Promise.all([
          api.get('/users/form-data'),
          getUserById(userId),
        ]);
        if (!mounted) {return;}
        const d = form.data?.data || {};
        setPrefixOptions(d?.prefixes || []);
        setRoleOptions(d?.roles || []);
        setCredentialOptions(d?.credentials || []);

        // languages
        try {
          const lg = await api.get('/language-regions');
          const arr = Array.isArray(lg.data?.data) ? lg.data.data : [];
          const roots = arr.filter(
            (x: any) => x.parent_id == null && !x.disabled,
          );
          setLanguageOptions(roots.map((x: any) => ({id: x.id, name: x.name})));
        } catch {}

        // countries (kept for existing phone prefix resolution if needed)
        try {
          const ct = await api.get('/countries?limit=1000');
          const items = ct?.data?.data?.items ?? [];
          setCountryOptions(items.map((x: any) => ({id: x.id, name: x.name})));
        } catch {}

        // derive phone country/flag by mapping calling code prefix; fallback to SG if empty
        const u = userRes?.data;
        const rawDigits = (u?.mobile_phone || '').replace(/\D/g, '');
        let resolvedCca2: string | undefined;
        let resolvedCode: string | undefined;
        let subscriberDigits = '';
        if (!rawDigits) {
          // keep defaults (SG +65) and empty input
          subscriberDigits = '';
        } else {
          const got = resolveByCallingCodePrefix(rawDigits);
          if (got.callingCode) {resolvedCode = got.callingCode;}
          if (got.cca2) {resolvedCca2 = got.cca2;}

          if (resolvedCode) {
            subscriberDigits = rawDigits.slice(resolvedCode.length);
          } else {
            // no match, treat first 2 digits as code (user-specified rule) and remainder as subscriber
            resolvedCode = rawDigits.slice(0, 2);
            subscriberDigits = rawDigits.slice(2);
          }

          // if not found, leave defaults; mapping already tries longest prefix

          if (resolvedCca2) {setCountryCode(resolvedCca2 as CountryCode);}
          if (resolvedCode) {setCallingCode(resolvedCode);}
        }

        // map user to initial with subscriber only in input
        setInitial({
          username: u?.username || '',
          password: '',
          prefix: u?.prefix || '',
          title: (u as any)?.title || '',
          first_name: u?.first_name || '',
          last_name: u?.last_name || '',
          role_id: u?.role?.id ?? null,
          user_photo: u?.user_photo || '',
          photo_url: (u as any)?.photo_url || '',
          sensitive_nation: !!u?.sensitive_nation,
          language_id: u?.language_id ?? null,
          church_id: u?.church_id ?? null,
          email_address: u?.email_address || '',
          mobile_phone: subscriberDigits,
          credentials: u?.credentials || '',
          credentials_number: u?.credentials_number || '',
          credentials_form:
            (u as any)?.credentials_form || (u as any)?.credentials_from || '',
          credentials_expiry_date: u?.credentials_expiry_date
            ? new Date(u.credentials_expiry_date)
            : null,
        });
      } catch (e) {
        Alert.alert(t('error'), t('failedToChangePassword'));
      } finally {
        if (mounted) {setLoading(false);}
      }
    }
    run();
    loadChurches(1);
    return () => {
      mounted = false;
    };
  }, [userId, loadChurches]);

  if (loading || !initial) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
          <BackButton title={t('editProfile')} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{color: C.textPrimary}}>{t('loading')}</Text>
          </ScrollView>
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
            Platform.OS === 'ios' ? 64 : (StatusBar.currentHeight || 0) + 50
          }
          style={{flex: 1}}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="always"
            contentContainerStyle={{paddingBottom: 24}}>
            <Formik
              enableReinitialize
              initialValues={initial}
              onSubmit={async values => {
                const sens = !!values.sensitive_nation;
                const newInvalid: Record<string, boolean> = {};
                newInvalid.username = !values.username;
                newInvalid.title = !values.title;
              newInvalid.first_name = !values.first_name;
              newInvalid.role_id = values.role_id == null;
              newInvalid.language_id = values.language_id == null;
              newInvalid.church_id = values.church_id == null;
                if (!sens) {
                  newInvalid.email_address = !values.email_address;
                  newInvalid.mobile_phone = !values.mobile_phone;
                }
                setInvalid(newInvalid);
                const firstInvalidKey = [
                  'username',
                  'title',
                  'first_name',
                  'role_id',
                  'language_id',
                  'church_id',
                  'email_address',
                  'mobile_phone',
                ].find(k => (newInvalid as any)[k]);
                if (firstInvalidKey) {
                  scrollToField(firstInvalidKey);
                  Alert.alert(t('validation'), t('fillRequiredFields'));
                  return;
                }

                const formattedPhone = (() => {
                  const digits = (values.mobile_phone || '').replace(/\D/g, '');
                  return digits ? `+${callingCode}${digits}` : '';
                })();

                // If a new image was selected, upload it first to get the server path
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
                    form.append(
                      'alt_text',
                      `${values.first_name || ''} ${
                        values.last_name || ''
                      }`.trim(),
                    );
                    const uploadRes = await api.post('images/upload', form, {
                      headers: {'Content-Type': 'multipart/form-data'},
                    });
                    uploadedUserPhotoPath = uploadRes?.data?.data?.path || null;
                  }
                } catch (e) {
                  // if upload fails, proceed without changing the photo
                }

                const payload: any = {
                  username: values.username,
                  prefix: values.prefix,
                  title: values.title,
                  first_name: values.first_name,
                  last_name: values.last_name,
                  role_id: values.role_id,
                  sensitive_nation: sens,
                language_id: values.language_id,
                  church_id: values.church_id,
                  email_address: values.email_address,
                  mobile_phone: formattedPhone,
                  credentials: values.credentials,
                  credentials_number: values.credentials_number,
                  credentials_form: values.credentials_form,
                  credentials_expiry_date: values.credentials_expiry_date
                    ? `${values.credentials_expiry_date.getFullYear()}-${String(
                        values.credentials_expiry_date.getMonth() + 1,
                      ).padStart(2, '0')}-${String(
                        values.credentials_expiry_date.getDate(),
                      ).padStart(2, '0')}`
                    : null,
                };
                // Decide which user_photo to send (only when needed)
                if (uploadedUserPhotoPath) {
                  payload.user_photo = uploadedUserPhotoPath;
                } else if (
                  values.user_photo &&
                  typeof values.user_photo === 'string' &&
                  !values.user_photo.startsWith('http')
                ) {
                  // keep existing stored path if present and not a URL
                  payload.user_photo = values.user_photo;
                }
                if ((values as any).password) {
                  payload.password = (values as any).password;
                }

                try {
                  await updateUser(userId, payload);
                  Alert.alert(t('success'), t('profileUpdatedSuccess'));
                  navigation.goBack();
                } catch (error: any) {
                  Alert.alert(
                    t('error'),
                    error?.response?.data?.message ||
                      error.message ||
                      t('couldNotUpdateUser'),
                  );
                }
              }}>
              {({
                values,
                handleChange,
                handleBlur,
                handleSubmit,
                setFieldValue,
              }) => (
                <Grid>
                  <Row>
                    <Col>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                          marginBottom: 12,
                        }}>
                        <Button
                          size="small"
                          appearance="outline"
                          onPress={() =>
                            navigation.navigate(
                              'ChangePasswordForOtherUser' as any,
                              {
                                id: userId,
                              },
                            )
                          }>
                          {t('changePassword')}
                        </Button>
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('prefix', e.nativeEvent.layout.y)
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('prefix')}
                        </Text>
                        <ElementDropdown
                          data={useMemo(
                            () =>
                              prefixOptions.map(p => ({
                                label: p,
                                value: p,
                              })),
                            [prefixOptions],
                          )}
                          value={values.prefix as any}
                          onChange={v =>
                            setFieldValue('prefix', (v as string) || '')
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('first_name', e.nativeEvent.layout.y)
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('firstName')}{' '}
                          <Text style={{color: '#c00000'}}>*</Text>
                        </Text>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: invalid.first_name
                                ? '#db2d2d'
                                : C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('title', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('ministryTitle')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon
                            title={t('ministryTitle')}
                            message={t('helpMinistryTitle')}
                            size={16}
                            offsetY={-2}
                          />
                        </View>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: invalid.title
                                ? '#db2d2d'
                                : C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
                          value={values.title}
                          autoCapitalize="words"
                          onChangeText={t => {
                            setFieldValue('title', t);
                            clearInvalid('title');
                          }}
                          onBlur={handleBlur('title')}
                          status={invalid.title ? 'danger' : 'basic'}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('last_name', e.nativeEvent.layout.y)
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('lastName')}
                        </Text>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
                          value={values.last_name}
                          autoCapitalize="words"
                          onChangeText={handleChange('last_name')}
                          onBlur={handleBlur('last_name')}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('username', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('username')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon
                            title={t('username')}
                            message={t('usernameHelp')}
                            size={16}
                            offsetY={-2}
                          />
                        </View>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: invalid.username
                                ? '#db2d2d'
                                : C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
                          value={values.username}
                          autoCapitalize="none"
                          disabled
                          onChangeText={t => {
                            setFieldValue('username', t);
                            clearInvalid('username');
                          }}
                          onBlur={handleBlur('username')}
                          status={invalid.username ? 'danger' : 'basic'}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('role_id', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('omrStatus')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon
                            title={t('omrStatus')}
                            message={t('helpOmrStatus')}
                            size={16}
                            offsetY={-2}
                          />
                        </View>
                        <ElementDropdown
                          data={useMemo(
                            () =>
                              roleOptions.map(r => ({
                                label: r.name,
                                value: r.id,
                              })),
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
                          containerStyle={
                            {
                              ...formStyles.input,
                              borderColor: invalid.role_id
                                ? '#db2d2d'
                                : C.inputBorder,
                              backgroundColor: C.inputBg,
                            } as any
                          }
                          error={!!invalid.role_id}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('user_photo', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('userPhoto')}
                            <Text style={formStyles.subLabel}>
                              {' '}
                              [{t('max5mb')}]
                            </Text>
                          </Text>
                          <HelpIcon
                            title={t('userPhoto')}
                            message={t('helpUserPhoto')}
                            size={16}
                            offsetY={-2}
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
                          {imagePath ||
                          (values as any).photo_url ||
                          values.user_photo ? (
                            <>
                              <Image
                                source={
                                  imagePath
                                    ? {uri: imagePath}
                                    : (values as any).photo_url
                                    ? {uri: (values as any).photo_url}
                                    : values.user_photo &&
                                      values.user_photo.startsWith('http')
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos(
                            'sensitive_nation',
                            e.nativeEvent.layout.y,
                          )
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('sensitiveNation')}
                          </Text>
                          <HelpIcon
                            title={t('sensitiveNation')}
                            message={t('helpSensitiveNation')}
                            size={16}
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
                          containerStyle={
                            {
                              ...(formStyles.input as any),
                              backgroundColor: C.inputBg,
                              borderColor: C.inputBorder,
                            } as any
                          }
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('language_id', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('language')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon
                            title={t('language')}
                            message={t('helpUserLanguage')}
                            size={16}
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
                          containerStyle={
                            {
                              ...formStyles.input,
                              borderColor: invalid.language_id
                                ? '#db2d2d'
                                : C.inputBorder,
                              backgroundColor: C.inputBg,
                            } as any
                          }
                          error={!!invalid.language_id}
                        />
                      </View>
                    </Col>
                  </Row>

                  {/* Country field removed as requested */}

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('church_id', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('church')}{' '}
                            <Text style={{color: '#c00000'}}>*</Text>
                          </Text>
                          <HelpIcon
                            title={t('church')}
                            message={t('helpUserChurch')}
                            size={16}
                            offsetY={-2}
                          />
                        </View>
                        <ElementDropdown
                          data={useMemo(
                            () =>
                              churchItems.map(c => ({
                                label: c.name,
                                value: c.id,
                              })),
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
                          containerStyle={
                            {
                              ...formStyles.input,
                              borderColor: invalid.church_id
                                ? '#db2d2d'
                                : C.inputBorder,
                              backgroundColor: C.inputBg,
                            } as any
                          }
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('email_address', e.nativeEvent.layout.y)
                        }>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text
                            style={[formStyles.label, {color: C.textSecondary}]}
                            category="label">
                            {t('emailAddress')}{' '}
                            {!values.sensitive_nation ? (
                              <Text style={{color: '#c00000'}}>*</Text>
                            ) : null}
                          </Text>
                          <HelpIcon
                            title={t('emailAddress')}
                            message={t('infoEmailAddress')}
                            size={16}
                            offsetY={-2}
                          />
                        </View>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: invalid.email_address
                                ? '#db2d2d'
                                : C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('mobile_phone', e.nativeEvent.layout.y)
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('mobilePhone')}{' '}
                          {!values.sensitive_nation ? (
                            <Text style={{color: '#c00000'}}>*</Text>
                          ) : null}
                        </Text>
                        <View
                          style={[
                            formStyles.input,
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              height: 44,
                              paddingHorizontal: 8,
                              borderWidth: 1,
                              borderRadius: 6,
                              borderColor: invalid.mobile_phone
                                ? '#db2d2d'
                                : C.inputBorder,
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
                          <Text
                            style={{
                              marginLeft: 8,
                              fontSize: 16,
                              color: C.textPrimary,
                            }}>
                            +{callingCode}
                          </Text>
                          <TextInput
                            style={{
                              flex: 1,
                              marginLeft: 8,
                              fontSize: 16,
                              color: C.inputText,
                            }}
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos('credentials', e.nativeEvent.layout.y)
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('credentials')}
                        </Text>
                        <ElementDropdown
                          data={useMemo(
                            () =>
                              credentialOptions.map(c => ({
                                label: c,
                                value: c,
                              })),
                            [credentialOptions],
                          )}
                          value={values.credentials as any}
                          onChange={v => {
                            setFieldValue('credentials', (v as string) || '');
                            clearInvalid('credentials');
                          }}
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
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos(
                            'credentials_number',
                            e.nativeEvent.layout.y,
                          )
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('credentialsNumber')}
                        </Text>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
                          value={values.credentials_number}
                          autoCapitalize="none"
                          onChangeText={handleChange('credentials_number')}
                          onBlur={handleBlur('credentials_number')}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos(
                            'credentials_form',
                            e.nativeEvent.layout.y,
                          )
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('credentialsFrom')}
                        </Text>
                        <Input
                          style={[
                            formStyles.input,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: C.inputBorder,
                              color: C.inputText,
                            },
                          ]}
                          textStyle={formStyles.inputTextStyle}
                          value={values.credentials_form}
                          autoCapitalize="none"
                          onChangeText={handleChange('credentials_form')}
                          onBlur={handleBlur('credentials_form')}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View
                        onLayout={e =>
                          setFieldPos(
                            'credentials_expiry_date',
                            e.nativeEvent.layout.y,
                          )
                        }>
                        <Text
                          style={[formStyles.label, {color: C.textSecondary}]}
                          category="label">
                          {t('credentialsExpiry')}
                        </Text>
                        <DateTripleDropdown
                          value={values.credentials_expiry_date}
                          onChange={d =>
                            setFieldValue('credentials_expiry_date', d)
                          }
                          yearRange={50}
                        />
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <Button
                        onPress={() => handleSubmit()}
                        style={globalStyles.mainButton}>
                        {t('save')}
                      </Button>
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
