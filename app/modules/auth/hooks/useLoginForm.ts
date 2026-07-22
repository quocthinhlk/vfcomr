import { useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { login } from '../services/auth.service';
import { AuthContext, navigationRef } from '../../../config/navigation';
import { requestNotificationPermissionAfterLogin } from '../../../shared/services/permissions.service';
import {
  BiometricSavedAccount,
  BiometryKind,
  disableBiometricLogin,
  getBiometricCapability,
  getBiometricErrorTranslationKey,
  getBiometricLoginPresentation,
  getBiometryDisplayName,
  promptOfferBiometricLoginSettingsAfterLogin,
  resetBiometricEnrollmentPrompt,
  resumeSessionWithBiometrics,
} from '../../../shared/services/biometrics.service';
import { useTranslation } from '../../../shared/hooks/useTranslation';

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'loginFailed';
  }

  const backendMessage = error.response?.data?.message;
  const status = error.response?.status;

  if (
    backendMessage === 'sql: no rows in result set' ||
    status === 401 ||
    status === 404
  ) {
    return 'invalidCredentials';
  }

  return 'loginFailed';
}

function navigateToBiometricSettings() {
  const tryNavigate = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('SettingsGeneral');
      return true;
    }
    return false;
  };

  if (tryNavigate()) {
    return;
  }

  // Authenticated stack may still be mounting after setIsAuthenticated(true).
  setTimeout(() => {
    if (!tryNavigate()) {
      setTimeout(tryNavigate, 300);
    }
  }, 100);
}

export function useLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometryType, setBiometryType] = useState<BiometryKind | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [savedAccount, setSavedAccount] = useState<BiometricSavedAccount | null>(null);
  /** When true, Login shows the saved biometric account UI (not auto Face ID). */
  const [useSavedAccount, setUseSavedAccount] = useState(false);
  const { setIsAuthenticated } = useContext(AuthContext);
  const { t } = useTranslation();

  const biometryName = getBiometryDisplayName(biometryType, t);
  const showBiometricButton = useSavedAccount && savedAccount != null;

  const handleBiometricLogin = useCallback(async () => {
    if (isBiometricLoading || isLoading || !useSavedAccount) {
      return;
    }

    setErrorMessage('');
    setIsBiometricLoading(true);
    try {
      const result = await resumeSessionWithBiometrics(t('biometricPromptTitle'));
      if (result.success) {
        setIsAuthenticated(true);
        return;
      }

      if (result.reason === 'session_invalid') {
        setUseSavedAccount(false);
        setSavedAccount(null);
      }

      setErrorMessage(getBiometricErrorTranslationKey(result.reason));
    } catch (err) {
      console.warn('Biometric login failed:', err);
      setErrorMessage('biometricFailed');
    } finally {
      setIsBiometricLoading(false);
    }
  }, [isBiometricLoading, isLoading, setIsAuthenticated, t, useSavedAccount]);

  const handleSwitchAccount = useCallback(() => {
    // Clear biometric enrollment so Settings toggle turns off and Login
    // returns to the normal username/password UI. Also reset the one-time
    // offer flag so the next successful password login asks again.
    void (async () => {
      try {
        await disableBiometricLogin();
        await resetBiometricEnrollmentPrompt();
      } catch (err) {
        console.warn('Switch account: clear biometric enrollment failed:', err);
      }
    })();
    setUseSavedAccount(false);
    setSavedAccount(null);
    setUsername('');
    setPassword('');
    setErrorMessage('');
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const presentation = await getBiometricLoginPresentation();
      if (!mounted) {
        return;
      }

      setBiometryType(presentation.biometryType);
      setSavedAccount(presentation.savedAccount);
      setUseSavedAccount(presentation.available);
      // Never auto-start Face ID / Fingerprint — wait for an explicit tap.
    })().catch(err => console.warn('Biometric login bootstrap failed:', err));

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
    setErrorMessage('');

    const loginUsername =
      useSavedAccount && savedAccount?.username
        ? savedAccount.username
        : username;

    if (!loginUsername || !password) {
      setErrorMessage('enterUsernameAndPassword');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login with username:', loginUsername);
      const response = await login({ username: loginUsername, password });
      console.log('Login successful, response:', response);
      setIsAuthenticated(true);
      void requestNotificationPermissionAfterLogin().catch(err =>
        console.warn('Post-login notification permission:', err),
      );

      const token = response?.data?.token;
      if (token) {
        void (async () => {
          const capability = await getBiometricCapability();
          const name = getBiometryDisplayName(capability.biometryType, t);
          // Offer Settings once for first-time setup; if already enabled, this
          // refreshes the Keychain session token + saved account after password login.
          await promptOfferBiometricLoginSettingsAfterLogin({
            username: loginUsername,
            token,
            title: t('enableBiometricLoginTitle'),
            message: t('enableBiometricLoginMessage').replace(/{biometryName}/g, name),
            notNowLabel: t('notNow'),
            goToSettingsLabel: t('goToSettings'),
            onGoToSettings: navigateToBiometricSettings,
          });
        })().catch(err => console.warn('Post-login biometric settings offer:', err));
      }
    } catch (error: unknown) {
      if (__DEV__) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const data = axios.isAxiosError(error) ? error.response?.data : undefined;
        console.log('Login failed for username:', loginUsername);
        console.log('Error status:', status);
        console.log('Error data:', data != null ? JSON.stringify(data) : undefined);
      }
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
}
