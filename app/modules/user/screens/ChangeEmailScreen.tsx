import React, {useRef, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {Header} from '../../../shared/components/Header';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, hs, ms} from '../../../shared/utils/scale';
import {changeEmail} from '../services/user.service';

type FieldKey = 'old_email' | 'new_email' | 'password';
const FIELD_ORDER: FieldKey[] = ['old_email', 'new_email', 'password'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Changes the sign-in email (POST users/change-email). The API checks the
 * current email + password, so both are asked for here.
 * Params: `id` (profile to return to), `email` (prefills the current email).
 */
export default function ChangeEmailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | null = route?.params?.id ?? null;
  const {t} = useTranslation();
  const C = useThemedColors();

  const [values, setValues] = useState<Record<FieldKey, string>>({
    old_email: String(route?.params?.email ?? '').trim(),
    new_email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Partial<Record<FieldKey, number>>>({});
  const scrollToField = (key: FieldKey) => {
    scrollRef.current?.scrollTo({y: Math.max(0, (fieldY.current[key] ?? 0) - ms(20)), animated: true});
  };

  const setField = (key: FieldKey, text: string) => {
    setValues(prev => ({...prev, [key]: text}));
    setErrors(prev => (prev[key] ? {...prev, [key]: ''} : prev));
  };

  const showErrors = (next: Partial<Record<FieldKey, string>>) => {
    setErrors(next);
    const first = FIELD_ORDER.find(k => next[k]);
    if (first) {
      scrollToField(first);
    }
    return !!first;
  };

  const onSubmit = async () => {
    if (submitting) {
      return;
    }
    const oldEmail = values.old_email.trim();
    const newEmail = values.new_email.trim();

    const next: Partial<Record<FieldKey, string>> = {};
    if (!oldEmail) {
      next.old_email = t('currentEmailRequired');
    } else if (!EMAIL_RE.test(oldEmail)) {
      next.old_email = t('invalidEmailFormat');
    }
    if (!newEmail) {
      next.new_email = t('newEmailRequired');
    } else if (!EMAIL_RE.test(newEmail)) {
      next.new_email = t('invalidEmailFormat');
    } else if (newEmail.toLowerCase() === oldEmail.toLowerCase()) {
      next.new_email = t('newEmailSameAsCurrent');
    }
    if (!values.password) {
      next.password = t('passwordRequired');
    }
    if (showErrors(next)) {
      return;
    }

    setSubmitting(true);
    try {
      await changeEmail({old_email: oldEmail, new_email: newEmail, password: values.password});
      markDataChanged('users');
      Alert.alert(t('success'), t('emailChangedSuccess'));
      // Back to the profile with the new email so its field updates in place.
      const routes = navigation.getState()?.routes ?? [];
      const cameFromProfile = routes
        .slice(0, -1)
        .some((entry: {name?: string}) => entry.name === 'EditProfile');
      if (cameFromProfile && userId && typeof navigation.popTo === 'function') {
        navigation.popTo('EditProfile', {id: userId, emailChangedTo: newEmail});
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (e: any) {
      const data = e?.response?.data;
      const message: string = data?.message || e?.message || t('error');
      // 422 {errors: {field: "..."}} → under the matching field.
      const apiErrors = data?.errors && typeof data.errors === 'object' ? data.errors : null;
      const fieldErrors: Partial<Record<FieldKey, string>> = {};
      if (apiErrors) {
        FIELD_ORDER.forEach(k => {
          if (apiErrors[k]) {
            fieldErrors[k] = String(apiErrors[k]);
          }
        });
      } else if (/invalid email or password/i.test(message)) {
        // The API does not say which one is wrong; flag both, explain once.
        fieldErrors.old_email = ' ';
        fieldErrors.password = t('invalidEmailOrPassword');
      }
      if (!showErrors(fieldErrors)) {
        // Errors for fields this form doesn't show (e.g. `email`).
        const otherMessages = apiErrors
          ? Object.values(apiErrors)
              .flat()
              .map(v => String(v ?? '').trim())
              .filter(Boolean)
          : [];
        Alert.alert(t('error'), otherMessages.join('\n') || message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    key: FieldKey,
    label: string,
    inputProps: React.ComponentProps<typeof AppInput>,
  ) => {
    const message = errors[key]?.trim();
    return (
      <View onLayout={e => { fieldY.current[key] = e.nativeEvent.layout.y; }}>
        <Text style={[formStyles.label, {color: C.textSecondary}]} category="label">
          {label} <Text status="danger">*</Text>
        </Text>
        <AppInput
          value={values[key]}
          onChangeText={text => setField(key, text)}
          autoCapitalize="none"
          autoCorrect={false}
          error={!!errors[key]}
          {...inputProps}
        />
        {message ? (
          <Text style={[styles.fieldError, {color: C.error || '#d92d20'}]}>{message}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('changeEmail')} />
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={
            Platform.OS === 'ios' ? hs(64) : (StatusBar.currentHeight || 0) + hs(50)
          }
          style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentInsetAdjustmentBehavior="always"
            contentContainerStyle={styles.content}>
            <Text style={[styles.intro, {color: C.textSecondary}]}>{t('changeEmailHint')}</Text>
            {renderField('old_email', t('currentEmail'), {
              keyboardType: 'email-address',
              textContentType: 'emailAddress',
              autoComplete: 'email',
            })}
            {renderField('new_email', t('newEmail'), {
              keyboardType: 'email-address',
              textContentType: 'emailAddress',
              autoComplete: 'email',
            })}
            {renderField('password', t('password'), {
              secureTextEntry: true,
              textContentType: 'password',
              autoComplete: 'password',
              returnKeyType: 'done',
              onSubmitEditing: onSubmit,
            })}
            <AppButton
              onPress={onSubmit}
              variant="primary"
              disabled={submitting}
              style={globalStyles.mainButton}>
              {t('changeEmail')}
            </AppButton>
          </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: ms(12),
    paddingBottom: 24,
  },
  intro: {
    fontSize: fs(13),
    lineHeight: fs(19),
  },
  fieldError: {
    marginTop: ms(4),
    fontSize: fs(12),
    lineHeight: fs(16),
  },
});
