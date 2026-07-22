// modules/auth/screens/LoginScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Text } from '@ui-kitten/components';
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
import { BiometricSvgIcon } from '../../../shared/components/icons';

const blankAvatar = require('../../../assets/images/blank-avatar.png');

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
    showBiometricButton,
    useSavedAccount,
    savedAccount,
    biometryType,
    biometryName,
    isBiometricLoading,
    handleBiometricLogin,
    handleSwitchAccount,
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

        {useSavedAccount && savedAccount ? (
          <View
            style={[
              styles.savedAccountCard,
              {backgroundColor: C.surface, borderColor: COLORS.mainColor},
            ]}>
            <View style={styles.savedAccountTextWrap}>
              <Text style={[styles.savedAccountName, {color: C.textPrimary}]} numberOfLines={2}>
                {savedAccount.displayName}
              </Text>
              {!!savedAccount.username && (
                <Text style={[styles.savedAccountUsername, {color: C.textSecondary}]} numberOfLines={1}>
                  {savedAccount.username}
                </Text>
              )}
            </View>
            <Image
              source={savedAccount.avatarUrl ? {uri: savedAccount.avatarUrl} : blankAvatar}
              style={styles.savedAccountAvatar}
            />
          </View>
        ) : (
          <AppInput
            placeholder={t('username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            containerStyle={{ width: '100%', marginBottom: ms(15) }}
          />
        )}

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
          <View style={{ width: '100%', marginTop: ms(4), marginBottom: ms(6) }}>
            <Text style={[authStyles.errorText, { color: COLORS.danger }]}>
              {t(errorMessage as any)}
            </Text>
          </View>
        )}

        <View style={{ width: '100%', marginTop: ms(10) }}>
          <SaveButton
            label={isLoading ? t('loggingIn') : t('login')}
            onPress={handleLogin}
            disabled={isLoading || isBiometricLoading}
            style={{ flex: 0 }}
          />
        </View>

        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            onPress={() => navigate('ForgotPassword')}
            activeOpacity={0.7}
            style={styles.secondaryAction}>
            <Text style={[styles.secondaryActionText, {color: COLORS.mainColor}]}>
              {t('forgotPassword')}
            </Text>
          </TouchableOpacity>
          {useSavedAccount && savedAccount && (
            <TouchableOpacity
              onPress={handleSwitchAccount}
              activeOpacity={0.7}
              style={styles.secondaryAction}>
              <Text style={[styles.secondaryActionText, {color: COLORS.mainColor}]}>
                {t('switchAccount')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showBiometricButton && (
          <TouchableOpacity
            style={styles.biometricRow}
            onPress={handleBiometricLogin}
            disabled={isLoading || isBiometricLoading}
            activeOpacity={0.8}>
            <View
              style={[
                styles.biometricIconCircle,
                {
                  borderColor: COLORS.mainColor,
                  opacity: isLoading || isBiometricLoading ? 0.5 : 1,
                },
              ]}>
              <BiometricSvgIcon
                biometryType={biometryType}
                width={ws(22)}
                height={hs(22)}
                color={COLORS.mainColor}
              />
            </View>
            <Text
              style={[
                styles.biometricLabel,
                {
                  color: COLORS.mainColor,
                  opacity: isLoading || isBiometricLoading ? 0.5 : 1,
                },
              ]}>
              {isBiometricLoading
                ? t('loggingIn')
                : t('loginWithBiometrics').replace('{biometryName}', biometryName)}
            </Text>
          </TouchableOpacity>
        )}

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
  savedAccountCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rs(6),
    paddingVertical: ms(8),
    paddingHorizontal: ms(10),
    marginBottom: ms(12),
  },
  savedAccountTextWrap: {
    flex: 1,
    paddingRight: ms(8),
  },
  savedAccountName: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  savedAccountUsername: {
    marginTop: ms(2),
    fontSize: fs(11),
  },
  savedAccountAvatar: {
    width: ws(36),
    height: ws(36),
    borderRadius: ws(18),
    backgroundColor: COLORS.lightGray,
  },
  secondaryActionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: ms(14),
  },
  secondaryAction: {
    paddingVertical: ms(4),
  },
  secondaryActionText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  biometricRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(28),
    gap: ms(12),
  },
  biometricIconCircle: {
    width: ws(44),
    height: ws(44),
    borderRadius: ws(22),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricLabel: {
    fontSize: fs(14),
    fontWeight: '600',
  },
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
});
