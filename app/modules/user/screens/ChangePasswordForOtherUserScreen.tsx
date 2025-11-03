import React, { useEffect, useRef, useState } from 'react';
import { View, Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Input, Button } from '@ui-kitten/components';
import { globalStyles } from '../../../shared/styles/global';
import { userStyles } from '../styles';
import { Header } from '../../../shared/components/Header';
import { BackButton } from '../../../shared/components/BackButton';
import { Formik } from 'formik';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../../config/api';
import { isSuperAdmin } from '../../../shared/utils/permissions';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';

export default function ChangePasswordForOtherUserScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | null = route?.params?.id ?? null;
  const { t } = useTranslation();
  const C = useThemedColors();
  
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Validation + scroll
  const scrollRef = useRef<ScrollView>(null);
  const [fieldY, setFieldY] = useState<Record<string, number>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const setFieldPos = (key: string, y: number) =>
    setFieldY(prev => (prev[key] === y ? prev : { ...prev, [key]: y }));
  const scrollToField = (key: string) => {
    const y = fieldY[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
  };
  const clearInvalid = (key: string) => setInvalid(prev => ({ ...prev, [key]: false }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('users/me');
        if (!mounted) return;
        const r = res?.data?.data?.role?.id;
        if (typeof r === 'number') setCurrentUserRoleId(r);
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const isSuperAdminUser = isSuperAdmin(currentUserRoleId || undefined);

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
        <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
          <BackButton title={t('changePassword')} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ color: C.textPrimary }}>{t('loading')}</Text>
          </ScrollView>
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : ((StatusBar.currentHeight || 0) + 50)}
          style={{ flex: 1 }}
        >
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="always" contentContainerStyle={{ paddingBottom: 24 }}>
            
            <Formik
              initialValues={{
                old_password: '',
                new_password: '',
                repeat_new_password: '',
              }}
              onSubmit={async (values) => {
                try {
                  if (!userId) {
                    Alert.alert(t('error'), t('userIDMissing'));
                    return;
                  }

                  // Validation + mark invalid fields
                  const newInvalid: Record<string, boolean> = {};
                  if (!isSuperAdminUser) {
                    newInvalid.old_password = !values.old_password;
                  }
                  newInvalid.new_password = !values.new_password;
                  newInvalid.repeat_new_password = !values.repeat_new_password;
                  if (values.new_password && values.repeat_new_password && values.new_password !== values.repeat_new_password) {
                    newInvalid.new_password = true;
                    newInvalid.repeat_new_password = true;
                  }
                  setInvalid(newInvalid);
                  const orderedKeys = [
                    ...(isSuperAdminUser ? [] : ['old_password']),
                    'new_password',
                    'repeat_new_password',
                  ];
                  const firstInvalidKey = orderedKeys.find(k => newInvalid[k]);
                  if (firstInvalidKey) {
                    scrollToField(firstInvalidKey);
                    Alert.alert(t('validation'), t('fillRequiredFields'));
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
                  Alert.alert(t('success'), t('passwordChangedSuccess'));
                  navigation.goBack();
                } catch (e: any) {
                  const msg = e?.response?.data?.message || e?.message || t('failedToChangePassword');
                  Alert.alert(t('error'), msg);
                }
              }}
            >
              {({ values, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
                <View>
                  {!isSuperAdminUser && (
                    <View onLayout={e => setFieldPos('old_password', e.nativeEvent.layout.y)}>
                      <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">{t('oldPassword')} <Text status="danger">*</Text></Text>
                      <Input
                        style={[userStyles.input, { backgroundColor: C.inputBg, borderColor: invalid.old_password ? '#db2d2d' : C.inputBorder }]}
                        textStyle={{ color: C.inputText }}
                        value={values.old_password}
                        onChangeText={t => { setFieldValue('old_password', t); clearInvalid('old_password'); }}
                        onBlur={handleBlur('old_password')}
                        secureTextEntry
                        autoCapitalize="none"
                        status={invalid.old_password ? 'danger' : 'basic'}
                      />
                    </View>
                  )}

                  <View onLayout={e => setFieldPos('new_password', e.nativeEvent.layout.y)}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">{t('newPassword')} <Text status="danger">*</Text></Text>
                    <Input
                      style={[userStyles.input, { backgroundColor: C.inputBg, borderColor: invalid.new_password ? '#db2d2d' : C.inputBorder }]}
                      textStyle={{ color: C.inputText }}
                      value={values.new_password}
                      onChangeText={t => { setFieldValue('new_password', t); clearInvalid('new_password'); }}
                      onBlur={handleBlur('new_password')}
                      secureTextEntry
                      autoCapitalize="none"
                      status={invalid.new_password ? 'danger' : 'basic'}
                    />
                  </View>

                  <View onLayout={e => setFieldPos('repeat_new_password', e.nativeEvent.layout.y)}>
                    <Text style={[userStyles.label, { color: C.textSecondary }]} category="label">{t('repeatNewPassword')} <Text status="danger">*</Text></Text>
                    <Input
                      style={[userStyles.input, { backgroundColor: C.inputBg, borderColor: invalid.repeat_new_password ? '#db2d2d' : C.inputBorder }]}
                      textStyle={{ color: C.inputText }}
                      value={values.repeat_new_password}
                      onChangeText={t => { setFieldValue('repeat_new_password', t); clearInvalid('repeat_new_password'); }}
                      onBlur={handleBlur('repeat_new_password')}
                      secureTextEntry
                      autoCapitalize="none"
                      status={invalid.repeat_new_password ? 'danger' : 'basic'}
                    />
                  </View>

                  <Button onPress={() => handleSubmit()} style={[globalStyles.button, { marginTop: 16 }]}>
                    {t('changePassword')}
                  </Button>
                </View>
              )}
            </Formik>
          </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    </SafeAreaView>
  );
}

