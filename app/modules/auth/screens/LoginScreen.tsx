// modules/auth/screens/LoginScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Text } from '@ui-kitten/components';
import { globalStyles } from '../../../shared/styles/global';
import { authStyles } from '../styles';
import { authImages } from '../config/auth.constants';
import { useLoginForm } from '../hooks/useLoginForm';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../config/navigation';
import { LANGUAGES } from '../../../config/languages';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { COLORS } from '../../../shared/constants/colors';
import LanguageSelectModal from '../../../shared/components/LanguageSelectModal';
import { fs, ws, hs, ms, rs } from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import { SaveButton } from '../../../shared/components/ActionButtons';

export default function LoginScreen() {
  const { navigate } = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedLanguage, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const C = useThemedColors();
  const [langDropdownVisible, setLangDropdownVisible] = useState(false);
  const selectedIndex = Math.max(LANGUAGES.findIndex(l => l.code === selectedLanguage), 0);
  const {
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    showPassword,
    setShowPassword,
    errorMessage,
    handleLogin,
  } = useLoginForm();
  const passwordInputRef = useRef<TextInput>(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[authStyles.container, { backgroundColor: C.background }]}
      >
        <View style={authStyles.logoContainer}>
          <Image source={authImages.logo} style={authStyles.logo} />
          <Text category="h1" style={[authStyles.title, { color: C.textPrimary }]}>{t('login')}</Text>
          <Text style={[authStyles.subTitle, { color: C.textSecondary }]}>{t('welcomeBack')}</Text>

        </View>

        <AppInput
          placeholder={t('username')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          containerStyle={{ width: '100%', marginBottom: ms(15) }}
        />

        <View style={[authStyles.passwordInputContainer, { marginBottom: ms(15) }]}>
          <AppInput
            ref={passwordInputRef}
            placeholder={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            containerStyle={{ width: '100%' }}
          />
          <TouchableOpacity
            onPress={() => {
              setShowPassword((v) => !v);
              setTimeout(() => passwordInputRef.current?.focus(), 0);
            }}
            style={authStyles.passwordToggle}
          >
            <Image
              source={showPassword ? authImages.eye : authImages.blind}
              style={authStyles.passwordToggleIcon}
            />
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={{ width: '100%', marginTop: ms(10), marginBottom: ms(6) }}>
            <Text style={[authStyles.errorText, { color: COLORS.danger }]}>
              {t(errorMessage as any)}
            </Text>
          </View>
        )}

        <View style={{ width: '100%', marginTop: ms(10) }}>
          <SaveButton
            label={isLoading ? t('loggingIn') : t('login')}
            onPress={handleLogin}
            disabled={isLoading}
            style={{ flex: 0 }}
          />
        </View>
        <TouchableOpacity
          style={authStyles.forgotPassword}
          onPress={() => navigate('ForgotPassword')}
          activeOpacity={0.7}
        >
          <Text style={authStyles.forgotPasswordTxt}>Forgot your password?</Text>
        </TouchableOpacity>
        <View style={styles.bottomSection}>
          <View style={styles.languageSelect}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setLangDropdownVisible(true)}
              activeOpacity={0.7}>
              <View style={styles.languageButtonContent}>
                <Image
                  source={LANGUAGES[selectedIndex].flag}
                  style={styles.languageIcon}
                />
                <Text style={[styles.languageText, { color: C.textPrimary }]}>
                  {LANGUAGES[selectedIndex].label}
                </Text>
              </View>
            </TouchableOpacity>

            <LanguageSelectModal
              visible={langDropdownVisible}
              selectedLanguageCode={selectedLanguage}
              onRequestClose={() => setLangDropdownVisible(false)}
              onSelectLanguage={(code) => { setLanguage(code); setLangDropdownVisible(false); }}
            />
          </View>
          <Text style={[styles.versionText, { color: C.textSecondary }]}>
            OMR version 4.0 Beta 1
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginTop: ms(16),
  },
  languageSelect: {
    marginRight: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%'
  },
  versionText: {
    marginTop: ms(12),
    fontSize: fs(10),
    fontStyle: 'italic',
  },
  languageButton: {},
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageIcon: {
    width: ws(20),
    height: hs(20),
    marginRight: ms(6),
    resizeMode: 'contain',
  },
  languageText: {
    fontSize: fs(15),
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: rs(12),
    borderWidth: 0,
    paddingVertical: ms(8),
    paddingHorizontal: ms(8),
    minWidth: ws(220),
    maxWidth: ws(320),
    maxHeight: hs(400),
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: rs(12),
    shadowOffset: { width: 0, height: hs(6) },
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(12),
    paddingHorizontal: ms(12),
    width: '100%',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(53,99,233,0.08)',
    borderRadius: rs(8),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(8),
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  dropdownClose: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
  },
  dropdownCloseText: {
    fontSize: fs(16),
  },
  dropdownList: {
    paddingVertical: ms(4),
  },
  flagIcon: {
    width: ws(28),
    height: hs(18),
    marginRight: ms(10),
    resizeMode: 'contain',
  },
  languageOptionText: {
    fontSize: fs(16),
  },
  languageOptionTextActive: {
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 'auto',
    fontSize: fs(16),
    color: COLORS.successColor,
    paddingHorizontal: ms(4),
  },
  checkIconPlaceholder: {
    marginLeft: 'auto',
    width: ws(16),
    height: hs(16),
  },
});