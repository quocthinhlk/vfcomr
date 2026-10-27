import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar, StyleSheet } from 'react-native';
import { COLORS } from '../../../shared/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text } from '@ui-kitten/components';
import { globalStyles } from '../../../shared/styles/global';
import { formStyles } from '../../../shared/styles/form';
import { Header } from '../../../shared/components/Header';
import { BackButton } from '../../../shared/components/BackButton';
import { Formik } from 'formik';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../../config/api';
import { isSuperAdmin, resolveRoleIdFromUser } from '../../../shared/utils/permissions';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { Col, Row, Grid } from 'react-native-easy-grid';
import AppInput from '../../../shared/components/AppInput';
import AppButton from '../../../shared/components/AppButton';
import { ms, hs, fs } from '../../../shared/utils/scale';
import { changeMyPassword } from '../services/user.service';
import ApiErrorState from '../../../shared/components/ApiErrorState';

export default function ChangePasswordForOtherUserScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | null = route?.params?.id ?? null;
  const { t } = useTranslation();
  const C = useThemedColors();
  
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Validation + scroll
  const scrollRef = useRef<ScrollView>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  // Inline message per field (client validation or the API's answer).
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : { ...prev, [key]: y }));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - ms(20)), animated: true });
  };
  const clearError = (key: string) =>
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));

  // users/me decides whether "old password" is required; if it fails, show a
  // retryable error rather than guessing the wrong form.
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('users/me');
      if (!mountedRef.current) {
        return;
      }
      // Some accounts expose only role_id: reading role.id alone left a Super
      // Admin treated as a regular user (asked for the other user's old password).
      setCurrentUserRoleId(resolveRoleIdFromUser(res?.data?.data));
      const meId = Number(res?.data?.data?.id);
      if (Number.isFinite(meId)) setCurrentUserId(meId);
      setLoadError(null);
    } catch (e) {
      if (mountedRef.current) {
        setLoadError(e);
      }
    }
    if (mountedRef.current) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadCurrentUser();
    return () => { mountedRef.current = false; };
  }, [loadCurrentUser]);

  const isSuperAdminUser = isSuperAdmin(currentUserRoleId || undefined);
  // Own password → users/me/password (always asks for the old one).
  // Someone else's → users/{id}/password, unchanged.
  const isSelf = userId == null || (currentUserId != null && Number(userId) === currentUserId);
  const needsOldPassword = isSelf || !isSuperAdminUser;

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
        <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
          <BackButton title={t('changePassword')} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        </Layout>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
        <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
          <Header title={t('changePassword')} />
          <ApiErrorState error={loadError} onRetry={loadCurrentUser} />
        </Layout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
      <Header title={t('changePassword')} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={
            Platform.OS === 'ios'
              ? hs(64)
              : (StatusBar.currentHeight || 0) + hs(50)
          }
          style={{ flex: 1 }}
        >
          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="always" contentContainerStyle={{ paddingBottom: 24 }}>
            
            <Formik
              initialValues={{
                old_password: '',
                new_password: '',
                repeat_new_password: '',
              }}
              onSubmit={async (values) => {
                // Client validation: show the reason under each field.
                const nextErrors: Record<string, string> = {};
                if (needsOldPassword && !values.old_password) {
                  nextErrors.old_password = t('oldPasswordRequired');
                }
                if (!values.new_password) {
                  nextErrors.new_password = t('newPasswordRequired');
                }
                if (!values.repeat_new_password) {
                  nextErrors.repeat_new_password = t('repeatPasswordRequired');
                } else if (values.new_password && values.new_password !== values.repeat_new_password) {
                  nextErrors.repeat_new_password = t('passwordsDoNotMatch');
                }
                setErrors(nextErrors);
                const orderedKeys = ['old_password', 'new_password', 'repeat_new_password'];
                const firstInvalidKey = orderedKeys.find(k => nextErrors[k]);
                if (firstInvalidKey) {
                  scrollToField(firstInvalidKey);
                  return;
                }

                try {
                  if (isSelf) {
                    await changeMyPassword({
                      old_password: values.old_password,
                      new_password: values.new_password,
                      repeat_new_password: values.repeat_new_password,
                    });
                  } else {
                    if (!userId) {
                      Alert.alert(t('error'), t('userIDMissing'));
                      return;
                    }
                    const payload: any = {
                      new_password: values.new_password,
                      repeat_new_password: values.repeat_new_password,
                    };
                    // Only include old_password if not super admin
                    if (!isSuperAdminUser) {
                      payload.old_password = values.old_password;
                    }
                    await api.post(`users/${userId}/password`, payload);
                  }
                  Alert.alert(t('success'), t('passwordChangedSuccess'));

                  const routes = navigation.getState()?.routes ?? [];
                  const cameFromUser = routes
                    .slice(0, -1)
                    .some((routeEntry: {name?: string}) => routeEntry.name === 'User');

                  if (cameFromUser && userId && typeof navigation.popTo === 'function') {
                    navigation.popTo('User', {
                      userId,
                      refetchKey: Date.now(),
                    });
                  } else if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else if (userId) {
                    navigation.navigate('User', {userId});
                  }
                } catch (e: any) {
                  const data = e?.response?.data;
                  const message: string = data?.message || e?.message || t('failedToChangePassword');
                  // 422 {errors: {repeat_new_password: "..."}} → under the matching field.
                  const apiErrors = data?.errors && typeof data.errors === 'object' ? data.errors : null;
                  const fieldErrors: Record<string, string> = {};
                  if (apiErrors) {
                    for (const key of orderedKeys) {
                      if (apiErrors[key]) {
                        fieldErrors[key] =
                          key === 'repeat_new_password' && /equal/i.test(String(apiErrors[key]))
                            ? t('passwordsDoNotMatch')
                            : String(apiErrors[key]);
                      }
                    }
                  } else if (/old password/i.test(message)) {
                    // 400 "Old password is incorrect"
                    fieldErrors.old_password = t('oldPasswordIncorrect');
                  }
                  const firstApiKey = orderedKeys.find(k => fieldErrors[k]);
                  if (firstApiKey) {
                    setErrors(fieldErrors);
                    scrollToField(firstApiKey);
                    return;
                  }
                  // Errors for fields this form doesn't show (e.g. `password`).
                  const otherMessages = apiErrors
                    ? Object.values(apiErrors)
                        .flat()
                        .map(v => String(v ?? '').trim())
                        .filter(Boolean)
                    : [];
                  Alert.alert(t('error'), otherMessages.join('\n') || message);
                }
              }}
            >
              {({ values, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
                <Grid>
                  {needsOldPassword && (
                    <Row>
                      <Col>
                        <View onLayout={e => setFieldPos('old_password', e.nativeEvent.layout.y)}>
                          <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                            {t('oldPassword')} <Text status="danger">*</Text>
                          </Text>
                          <AppInput
                            value={values.old_password}
                            onChangeText={text => { setFieldValue('old_password', text); clearError('old_password'); }}
                            onBlur={handleBlur('old_password')}
                            secureTextEntry
                            autoCapitalize="none"
                            error={!!errors.old_password}
                            textContentType="password"
                          />
                          {errors.old_password ? (
                            <Text style={[styles.fieldError, { color: C.error || '#d92d20' }]}>{errors.old_password}</Text>
                          ) : null}
                        </View>
                      </Col>
                    </Row>
                  )}

                  <Row>
                    <Col>
                      <View onLayout={e => setFieldPos('new_password', e.nativeEvent.layout.y)}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                          {t('newPassword')} <Text status="danger">*</Text>
                        </Text>
                        <AppInput
                          value={values.new_password}
                          onChangeText={text => { setFieldValue('new_password', text); clearError('new_password'); }}
                          onBlur={handleBlur('new_password')}
                          secureTextEntry
                          autoCapitalize="none"
                          error={!!errors.new_password}
                          textContentType="newPassword"
                        />
                        {errors.new_password ? (
                          <Text style={[styles.fieldError, { color: C.error || '#d92d20' }]}>{errors.new_password}</Text>
                        ) : null}
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <View onLayout={e => setFieldPos('repeat_new_password', e.nativeEvent.layout.y)}>
                        <Text style={[formStyles.label, { color: C.textSecondary }]} category="label">
                          {t('repeatNewPassword')} <Text status="danger">*</Text>
                        </Text>
                        <AppInput
                          value={values.repeat_new_password}
                          onChangeText={text => { setFieldValue('repeat_new_password', text); clearError('repeat_new_password'); }}
                          onBlur={handleBlur('repeat_new_password')}
                          secureTextEntry
                          autoCapitalize="none"
                          error={!!errors.repeat_new_password}
                          textContentType="newPassword"
                        />
                        {errors.repeat_new_password ? (
                          <Text style={[styles.fieldError, { color: C.error || '#d92d20' }]}>{errors.repeat_new_password}</Text>
                        ) : null}
                      </View>
                    </Col>
                  </Row>

                  <Row>
                    <Col>
                      <AppButton
                        onPress={() => handleSubmit()}
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        variant="primary"
                        style={globalStyles.mainButton}
                      >
                        {t('changePassword')}
                      </AppButton>
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

const styles = StyleSheet.create({
  fieldError: {
    marginTop: ms(4),
    fontSize: fs(12),
    lineHeight: fs(16),
  },
});
