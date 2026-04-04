import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import {SaveButton} from '../../../shared/components/ActionButtons';
import {COLORS} from '../../../shared/constants/colors';
import {createOmrSupportRequest, getOmrSupportIntro} from '../services/omrsupport.service';

export const OmrSupportScreen = () => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [title, setTitle] = useState('OMR Support');
  const [introMessage, setIntroMessage] = useState('');
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    subject?: string;
    message?: string;
  }>({});

  useEffect(() => {
    const loadIntro = async () => {
      try {
        setLoadingIntro(true);
        const data = await getOmrSupportIntro();
        if (data?.title) {
          setTitle(data.title);
        }
        setIntroMessage(data?.message || '');
      } catch {
        setIntroMessage('');
      } finally {
        setLoadingIntro(false);
      }
    };
    loadIntro();
  }, []);

  const onSubmit = async () => {
    const nextErrors: {[key: string]: string} = {};
    if (!name.trim()) {
      nextErrors.name = 'Name is a required field';
    }
    if (!subject.trim()) {
      nextErrors.subject = 'Subject is a required field';
    }
    if (!message.trim()) {
      nextErrors.message = 'Message is a required field';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      setSubmitting(true);
      setFieldErrors({});
      await createOmrSupportRequest({
        name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      Alert.alert(t('success') || 'Success', t('omrSupportSendSuccess'));
      setName('');
      setSubject('');
      setMessage('');
    } catch (error: any) {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        setFieldErrors({
          name:
            typeof validationErrors?.name === 'string'
              ? validationErrors.name
              : undefined,
          subject:
            typeof validationErrors?.subject === 'string'
              ? validationErrors.subject
              : undefined,
          message:
            typeof validationErrors?.message === 'string'
              ? validationErrors.message
              : undefined,
        });
        return;
      }
      const apiMessage = error?.response?.data?.message;
      Alert.alert(t('error') || 'Error', apiMessage || t('omrSupportSendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('omrSupport') || title} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.card, {borderColor: C.inputBorder, backgroundColor: C.surface}]}>
            {loadingIntro ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.mainColor} />
              </View>
            ) : (
              <>
                <Text style={[styles.title, {color: C.textPrimary}]}>
                  {title || t('omrSupport') || 'OMR Support'}
                </Text>
                <Text style={[styles.text, {color: C.textSecondary}]}>
                  {introMessage || '-'}
                </Text>
              </>
            )}
          </View>

          <View style={[styles.card, {borderColor: C.inputBorder, backgroundColor: C.surface}]}>
            <Text style={[styles.formTitle, {color: C.textPrimary}]}>
              {t('omrSupportContactSupport')}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, {color: C.textSecondary}]}>
                {t('omrSupportNameLabel')}
              </Text>
              <AppInput
                value={name}
                onChangeText={value => {
                  setName(value);
                  if (value.trim()) {
                    setFieldErrors(prev => ({...prev, name: undefined}));
                  }
                }}
                autoCapitalize="words"
                error={!!fieldErrors.name}
              />
              {fieldErrors.name ? (
                <Text style={styles.errorText}>{fieldErrors.name}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, {color: C.textSecondary}]}>
                {t('omrSupportSubjectLabel')}
              </Text>
              <AppInput
                value={subject}
                onChangeText={value => {
                  setSubject(value);
                  if (value.trim()) {
                    setFieldErrors(prev => ({...prev, subject: undefined}));
                  }
                }}
                autoCapitalize="sentences"
                error={!!fieldErrors.subject}
              />
              {fieldErrors.subject ? (
                <Text style={styles.errorText}>{fieldErrors.subject}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, {color: C.textSecondary}]}>
                {t('omrSupportMessageLabel')}
              </Text>
              <AppInput
                value={message}
                onChangeText={value => {
                  setMessage(value);
                  if (value.trim()) {
                    setFieldErrors(prev => ({...prev, message: undefined}));
                  }
                }}
                multiline
                style={styles.messageInput}
                autoCapitalize="sentences"
                error={!!fieldErrors.message}
              />
              {fieldErrors.message ? (
                <Text style={styles.errorText}>{fieldErrors.message}</Text>
              ) : null}
            </View>

            <SaveButton
              label={submitting ? t('omrSupportSending') : t('omrSupportSendRequest')}
              onPress={onSubmit}
              disabled={submitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  scroll: {
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
  fieldGroup: {
    marginBottom: ms(12),
  },
  label: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  messageInput: {
    height: hs(120),
    textAlignVertical: 'top',
    paddingTop: ms(10),
  },
  submitButton: {
    width: '100%',
  },
  text: {
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  errorText: {
    marginTop: ms(6),
    fontSize: fs(12),
    color: '#db2d2d',
  },
});
