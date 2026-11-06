import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useSubmitOnce} from '../../../shared/hooks/useSubmitOnce';
import {useKeepFocusedInputVisible} from '../../../shared/hooks/useKeepFocusedInputVisible';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import {SaveButton} from '../../../shared/components/ActionButtons';
import {FormField} from '../../../shared/components/crud';
import {COLORS} from '../../../shared/constants/colors';
import {
  createOmrSupportRequest,
  getOmrSupportIntro,
  getSupportContact,
} from '../services/omrsupport.service';
import {useNavigation} from '@react-navigation/native';
import {
  getApiErrorMessage,
  getApiValidationErrors,
} from '../../../shared/utils/apiErrorHandler';
import {
  SupportErrors,
  SupportField,
  SupportValues,
  buildSupportPayload,
  contactFromProfile,
  shouldShowEditEmail,
  validateSupport,
} from '../utils/omrSupport.utils';

const FIELDS: SupportField[] = ['name', 'email', 'subject', 'message'];

export const OmrSupportScreen = () => {
  const C = useThemedColors();
  const navigation = useNavigation<any>();
  const {t, selectedLanguage} = useTranslation();
  const [title, setTitle] = useState('');
  const [introMessage, setIntroMessage] = useState('');
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [introError, setIntroError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<SupportValues>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<SupportErrors>({});
  // Server-side messages (already translated by the API) per field.
  const [serverErrors, setServerErrors] = useState<Partial<Record<SupportField, string>>>({});
  const scrollRef = useRef<ScrollView>(null);
  const inputRefs = useRef<Partial<Record<SupportField, TextInput | null>>>({});
  const fieldY = useRef<Partial<Record<SupportField, number>>>({});
  const mountedRef = useRef(true);
  // Signed-in user, for the server's "edit your e-mail" link.
  const userIdRef = useRef<number | null>(null);
  const [showEditEmail, setShowEditEmail] = useState(false);
  // Android 15+ (edge-to-edge): keep the focused field above the keyboard.
  useKeepFocusedInputVisible(scrollRef);
  // One request at a time: a fast double tap sent two support e-mails.
  const submitOnce = useSubmitOnce();

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // The welcome text comes translated from the API: reload it when the app
  // language changes (it stayed in the old language).
  const loadIntro = useCallback(async () => {
    try {
      setLoadingIntro(true);
      const data = await getOmrSupportIntro();
      if (!mountedRef.current) {
        return;
      }
      setTitle(data?.title || '');
      setIntroMessage(data?.message || '');
      setIntroError(null);
    } catch (error) {
      if (mountedRef.current) {
        setIntroMessage('');
        setIntroError(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingIntro(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  useEffect(() => {
    loadIntro();
  }, [loadIntro]);

  // Prefill the name from the profile, as the web does. The e-mail is typed
  // by the user and checked by the server against the OMR records.
  useEffect(() => {
    getSupportContact()
      .then(user => {
        const contact = contactFromProfile(user);
        userIdRef.current = contact.id;
        if (mountedRef.current) {
          setValues(prev => ({...prev, name: prev.name || contact.name}));
        }
      })
      .catch(() => {});
  }, []);

  const openEditProfile = async () => {
    let id = userIdRef.current;
    if (id == null) {
      id = await getSupportContact()
        .then(user => contactFromProfile(user).id)
        .catch(() => null);
      userIdRef.current = id;
    }
    if (id == null) {
      Alert.alert(t('error') || 'Error', t('unknownError'));
      return;
    }
    navigation.navigate('EditProfile', {id});
  };

  const setField = (field: SupportField) => (text: string) => {
    setValues(prev => ({...prev, [field]: text}));
    setErrors(prev => (prev[field] ? {...prev, [field]: undefined} : prev));
    setServerErrors(prev => (prev[field] ? {...prev, [field]: undefined} : prev));
    if (field === 'email') {
      setShowEditEmail(false);
    }
  };

  const labels: Record<SupportField, string> = {
    name: t('omrSupportNameLabel'),
    email: t('email'),
    subject: t('omrSupportSubjectLabel'),
    message: t('omrSupportMessageLabel'),
  };
  const errorText = (field: SupportField) =>
    serverErrors[field] ||
    (errors[field] === 'required'
      ? t('fieldIsRequired').replace('{field}', labels[field])
      : undefined);

  const scrollToField = (field: SupportField) => {
    const y = fieldY.current[field];
    if (y != null) {
      scrollRef.current?.scrollTo({y: Math.max(0, y - ms(16)), animated: true});
    }
  };

  const onSubmit = submitOnce(async () => {
    const nextErrors = validateSupport(values);
    setErrors(nextErrors);
    setServerErrors({});
    setShowEditEmail(false);
    const first = FIELDS.find(f => nextErrors[f]);
    if (first) {
      // Was hard-coded English ("Name is a required field") with no scroll.
      scrollToField(first);
      return;
    }
    try {
      setSubmitting(true);
      await createOmrSupportRequest(buildSupportPayload(values));
      Alert.alert(t('success') || 'Success', t('omrSupportSendSuccess'));
      if (mountedRef.current) {
        // Keep who is writing; clear the request itself.
        setValues(prev => ({...prev, subject: '', message: ''}));
      }
    } catch (error: any) {
      const validation = getApiValidationErrors(error) as
        | Partial<Record<string, string>>
        | null
        | undefined;
      const mapped: Partial<Record<SupportField, string>> = {};
      FIELDS.forEach(f => {
        if (validation?.[f]) {
          mapped[f] = validation[f];
        }
      });
      if (Object.keys(mapped).length) {
        setServerErrors(mapped);
        // E-mail not in the OMR records: the server asks for an edit link.
        setShowEditEmail(!!mapped.email && shouldShowEditEmail(validation));
        scrollToField(FIELDS.find(f => mapped[f]) as SupportField);
        return;
      }
      // Errors on fields this form does not have used to vanish silently.
      Alert.alert(
        t('error') || 'Error',
        getApiErrorMessage(error, t) || t('omrSupportSendFailed'),
      );
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  });

  const renderField = (
    field: SupportField,
    props: Partial<React.ComponentProps<typeof AppInput>> = {},
  ) => (
    <View
      key={field}
      onLayout={e => {
        fieldY.current[field] = e.nativeEvent.layout.y;
      }}>
      <FormField label={labels[field]} required error={errorText(field)}>
        <AppInput
          ref={r => {
            inputRefs.current[field] = r;
          }}
          value={values[field]}
          onChangeText={setField(field)}
          error={!!errorText(field)}
          editable={!submitting}
          accessibilityLabel={`${labels[field]}, ${t('required')}`}
          {...props}
        />
      </FormField>
    </View>
  );

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('omrSupport') || title} />
        {/* There was no keyboard handling: on iOS (and Android 15+) the
            message box and the Send button stayed under the keyboard. */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets>
            <View style={[styles.card, {borderColor: C.inputBorder, backgroundColor: C.surface}]}>
              {loadingIntro ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={COLORS.mainColor} />
                </View>
              ) : introError ? (
                <ApiErrorState compact error={introError} onRetry={loadIntro} />
              ) : (
                <>
                  <Text style={[styles.title, {color: C.textPrimary}]}>
                    {title || t('omrSupport')}
                  </Text>
                  {introMessage ? (
                    <Text style={[styles.text, {color: C.textSecondary}]}>{introMessage}</Text>
                  ) : null}
                </>
              )}
            </View>

            <View style={[styles.card, {borderColor: C.inputBorder, backgroundColor: C.surface}]}>
              <Text style={[styles.formTitle, {color: C.textPrimary}]}>
                {t('omrSupportContactSupport')}
              </Text>
              {renderField('name', {
                autoCapitalize: 'words',
                autoComplete: 'name',
                returnKeyType: 'next',
                maxLength: 255,
                onSubmitEditing: () => inputRefs.current.email?.focus(),
              })}
              {renderField('email', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoCorrect: false,
                autoComplete: 'email',
                returnKeyType: 'next',
                maxLength: 255,
                onSubmitEditing: () => inputRefs.current.subject?.focus(),
              })}
              {showEditEmail ? (
                <TouchableOpacity
                  onPress={openEditProfile}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  accessibilityRole="link"
                  style={styles.editProfileWrap}>
                  <Text style={styles.editProfileLink}>{t('editProfile')}</Text>
                </TouchableOpacity>
              ) : null}
              {renderField('subject', {
                autoCapitalize: 'sentences',
                returnKeyType: 'next',
                maxLength: 255,
                onSubmitEditing: () => inputRefs.current.message?.focus(),
              })}
              {renderField('message', {
                multiline: true,
                autoCapitalize: 'sentences',
                style: styles.messageInput,
                containerStyle: styles.messageContainer,
              })}

              <SaveButton
                label={submitting ? t('omrSupportSending') : t('omrSupportSendRequest')}
                onPress={onSubmit}
                disabled={submitting}
                style={styles.submitButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(8),
    paddingBottom: ms(20),
  },
  card: {
    borderWidth: 1,
    borderRadius: rs(10),
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    marginBottom: ms(12),
  },
  loadingWrap: {
    paddingVertical: ms(16),
    alignItems: 'center',
  },
  title: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: ms(10),
  },
  formTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(10),
  },
  messageContainer: {
    paddingRight: ms(6),
  },
  messageInput: {
    // AppInput has a one-line height: grow with the text instead.
    height: undefined,
    minHeight: hs(120),
    maxHeight: hs(260),
    textAlignVertical: 'top',
    paddingTop: ms(10),
  },
  editProfileWrap: {
    alignSelf: 'flex-end',
    marginTop: -ms(8),
    marginBottom: ms(12),
  },
  editProfileLink: {
    fontSize: fs(13),
    fontWeight: '600',
    color: COLORS.mainColor,
  },
  submitButton: {
    width: '100%',
  },
  text: {
    fontSize: fs(14),
    lineHeight: fs(20),
  },
});

export default OmrSupportScreen;
