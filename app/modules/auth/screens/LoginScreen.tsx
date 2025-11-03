// modules/auth/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Button, Input, Text } from '@ui-kitten/components';
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
    handleLogin,
  } = useLoginForm();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[authStyles.container, { backgroundColor: C.background }]}>
        <View style={authStyles.logoContainer}>
          <Image source={authImages.logo} style={authStyles.logo} />
          <Text category="h1" style={[authStyles.title, { color: C.textPrimary }]}>{t('login')}</Text>
          <Text style={[authStyles.subTitle, { color: C.textSecondary }]}>{t('welcomeBack')}</Text>

        </View>

        <Input
          placeholder={t('username')}
          value={username}
          onChangeText={setUsername}
          style={[globalStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
          textStyle={{ color: C.inputText }}
          placeholderTextColor={C.textSecondary}
          autoCapitalize="none"
        />

        <View style={authStyles.passwordInputContainer}>
          <Input
            placeholder={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={[globalStyles.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
            textStyle={{ color: C.inputText }}
            placeholderTextColor={C.textSecondary}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={authStyles.passwordToggle}
          >
            <Image
              source={showPassword ? authImages.eye : authImages.blind}
              style={authStyles.passwordToggleIcon}
            />
          </TouchableOpacity>
        </View>

        <Button
          onPress={handleLogin}
          disabled={isLoading}
          style={globalStyles.button}
        >
          {isLoading ? t('loggingIn') : t('login')}
        </Button>
        {/* <TouchableOpacity style={authStyles.forgotPassword} onPress={() => navigate('ForgotPassword')}>
          <Text style={authStyles.forgotPasswordTxt}>Forgot your password?</Text>
        </TouchableOpacity> */}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
  },
  languageSelect: {
    marginRight: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%'
  },
  languageButton: {},
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
    resizeMode: 'contain',
  },
  languageText: {
    fontSize: 15,
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 220,
    maxWidth: 320,
    maxHeight: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: '100%',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(53,99,233,0.08)',
    borderRadius: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dropdownCloseText: {
    fontSize: 16,
  },
  dropdownList: {
    paddingVertical: 4,
  },
  flagIcon: {
    width: 28,
    height: 18,
    marginRight: 10,
    resizeMode: 'contain',
  },
  languageOptionText: {
    fontSize: 16,
  },
  languageOptionTextActive: {
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 'auto',
    fontSize: 16,
    color: COLORS.successColor,
    paddingHorizontal: 4,
  },
  checkIconPlaceholder: {
    marginLeft: 'auto',
    width: 16,
    height: 16,
  },
});