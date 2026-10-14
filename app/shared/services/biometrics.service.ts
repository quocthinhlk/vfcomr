/**
 * Centralized biometric login (Face ID / Touch ID / Fingerprint) support,
 * built on react-native-keychain.
 *
 * Design: biometrics never replace the password API. After a normal
 * username/password login, the already-issued session token can be stored
 * behind a biometric-gated Keychain/Keystore entry. App launches with a stored
 * session go straight to the app; after the user logs out, a successful
 * biometric prompt on the Login screen unlocks that token and resumes the
 * "token in AsyncStorage" session — without ever touching or persisting the
 * user's password.
 *
 * Mirrors the lazy-load / typed-result conventions used in
 * app/shared/services/permissions.service.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert, Platform} from 'react-native';
import api from '../../config/api';

export type BiometryKind = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Biometrics';

export type BiometricCapability = {
  /** True when the device has usable biometric hardware for this feature. */
  available: boolean;
  biometryType: BiometryKind | null;
};

export type BiometricAuthFailureReason =
  | 'cancelled'
  | 'failed'
  | 'lockout'
  | 'unavailable'
  | 'not_enrolled'
  | 'permission_denied';

export type BiometricLoginResult =
  | {success: true; token: string; username: string}
  | {success: false; reason: BiometricAuthFailureReason; error?: string};

export type BiometricSessionResumeResult =
  | {success: true}
  | {
      success: false;
      reason: BiometricAuthFailureReason | 'session_invalid';
      error?: string;
    };

const KEYCHAIN_SERVICE = 'vfcomr.biometric_login';
const ENABLED_STORAGE_KEY = '@vfcomr/biometric_login_enabled';
const PROMPTED_STORAGE_KEY = '@vfcomr/biometric_login_prompted';
/** Non-secret profile shown on the Login screen for the biometric account. */
const SAVED_ACCOUNT_STORAGE_KEY = '@vfcomr/biometric_saved_account';

export type BiometricSavedAccount = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type KeychainModule = typeof import('react-native-keychain');

let keychainModule: KeychainModule | null | undefined;

function getKeychain(): KeychainModule | null {
  if (keychainModule === undefined) {
    try {
      keychainModule = require('react-native-keychain');
    } catch (e) {
      if (__DEV__) {
        console.warn('[biometrics.service] react-native-keychain not linked:', e);
      }
      keychainModule = null;
    }
  }
  return keychainModule ?? null;
}

function mapBiometryType(type: unknown): BiometryKind | null {
  switch (type) {
    case 'FaceID':
      return 'FaceID';
    case 'TouchID':
      return 'TouchID';
    case 'Fingerprint':
    case 'Face':
    case 'Iris':
    case 'OpticID':
      return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
    default:
      return null;
  }
}

function classifyBiometricError(error: unknown): BiometricAuthFailureReason {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code =
    typeof error === 'object' &&
    error != null &&
    'code' in error &&
    (typeof (error as {code?: unknown}).code === 'string' ||
      typeof (error as {code?: unknown}).code === 'number')
      ? String((error as {code: string | number}).code).toLowerCase()
      : '';

  const haystack = `${code} ${message}`;

  if (
    haystack.includes('cancel') ||
    haystack.includes('user_cancel') ||
    haystack.includes('usercancel') ||
    haystack.includes('-128') ||
    haystack.includes('laerror.user.cancel')
  ) {
    return 'cancelled';
  }

  if (
    haystack.includes('lockout') ||
    haystack.includes('locked out') ||
    haystack.includes('too many') ||
    haystack.includes('biometry_lockout')
  ) {
    return 'lockout';
  }

  if (
    haystack.includes('not enrolled') ||
    haystack.includes('not_enrolled') ||
    haystack.includes('no biometry') ||
    haystack.includes('no fingerprints') ||
    haystack.includes('biometry_not_enrolled')
  ) {
    return 'not_enrolled';
  }

  if (
    haystack.includes('permission') ||
    haystack.includes('not authorized') ||
    haystack.includes('not_available') ||
    haystack.includes('passcode not set')
  ) {
    return 'permission_denied';
  }

  if (
    haystack.includes('unavailable') ||
    haystack.includes('not available') ||
    haystack.includes('not supported')
  ) {
    return 'unavailable';
  }

  return 'failed';
}

/** Maps a biometric failure reason to a translation key. */
export function getBiometricErrorTranslationKey(
  reason: BiometricAuthFailureReason | 'session_invalid',
):
  | 'biometricCancelled'
  | 'biometricFailed'
  | 'biometricLockout'
  | 'biometricUnavailable'
  | 'biometricNotEnrolled'
  | 'biometricPermissionDenied'
  | 'biometricSessionExpired' {
  switch (reason) {
    case 'cancelled':
      return 'biometricCancelled';
    case 'lockout':
      return 'biometricLockout';
    case 'unavailable':
      return 'biometricUnavailable';
    case 'not_enrolled':
      return 'biometricNotEnrolled';
    case 'permission_denied':
      return 'biometricPermissionDenied';
    case 'session_invalid':
      return 'biometricSessionExpired';
    case 'failed':
    default:
      return 'biometricFailed';
  }
}

/** Checks whether the device supports biometric hardware usable for login. */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  const keychain = getKeychain();
  if (!keychain) {
    return {available: false, biometryType: null};
  }
  try {
    const type = await keychain.getSupportedBiometryType();
    const biometryType = mapBiometryType(type);
    return {available: biometryType != null, biometryType};
  } catch (e) {
    console.warn('[biometrics.service] getSupportedBiometryType failed:', e);
    return {available: false, biometryType: null};
  }
}

/** Human-readable biometry name for UI copy (Face ID / Touch ID stay in English, per platform convention). */
export function getBiometryDisplayName(
  biometryType: BiometryKind | null,
  t: (key: 'fingerprint' | 'biometrics') => string,
): string {
  switch (biometryType) {
    case 'FaceID':
      return 'Face ID';
    case 'TouchID':
      return 'Touch ID';
    case 'Fingerprint':
      return t('fingerprint');
    default:
      return t('biometrics');
  }
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

function buildDisplayName(user: any, fallbackUsername: string): string {
  const fullName = typeof user?.name === 'string' ? user.name.trim() : '';
  if (fullName) {
    const prefix = (user?.prefix || '').toString().trim();
    return prefix ? `${prefix} ${fullName}` : fullName;
  }
  return fallbackUsername;
}

export async function getBiometricSavedAccount(): Promise<BiometricSavedAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ACCOUNT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as BiometricSavedAccount;
    if (!parsed?.username) {
      return null;
    }
    return {
      username: String(parsed.username),
      displayName: String(parsed.displayName || parsed.username),
      avatarUrl: parsed.avatarUrl ? String(parsed.avatarUrl) : null,
    };
  } catch {
    return null;
  }
}

async function saveBiometricAccountProfile(account: BiometricSavedAccount): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch (e) {
    console.warn('[biometrics.service] saveBiometricAccountProfile failed:', e);
  }
}

async function clearBiometricAccountProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVED_ACCOUNT_STORAGE_KEY);
  } catch (e) {
    console.warn('[biometrics.service] clearBiometricAccountProfile failed:', e);
  }
}

/** Resolves profile fields used on the Login "saved account" card. */
export async function resolveBiometricAccountProfile(
  fallbackUsername: string,
): Promise<BiometricSavedAccount> {
  try {
    const res = await api.get('users/me');
    const user = res?.data?.data;
    const username = user?.username || fallbackUsername;
    return {
      username: String(username),
      displayName: buildDisplayName(user, String(username)),
      avatarUrl: user?.photo_url ? String(user.photo_url) : null,
    };
  } catch (e) {
    console.warn('[biometrics.service] resolveBiometricAccountProfile failed:', e);
    return {
      username: fallbackUsername,
      displayName: fallbackUsername,
      avatarUrl: null,
    };
  }
}

/** True when a biometric-gated session credential exists in Keychain/Keystore. */
export async function hasBiometricCredentialRegistered(): Promise<boolean> {
  const keychain = getKeychain();
  if (!keychain) {
    return false;
  }
  try {
    return await keychain.hasGenericPassword({service: KEYCHAIN_SERVICE});
  } catch (e) {
    console.warn('[biometrics.service] hasBiometricCredentialRegistered failed:', e);
    return false;
  }
}

/**
 * Login-screen visibility for the saved biometric account + button.
 * Does not start authentication — the user must tap the biometric button.
 */
export async function getBiometricLoginPresentation(): Promise<{
  available: boolean;
  biometryType: BiometryKind | null;
  savedAccount: BiometricSavedAccount | null;
}> {
  const capability = await getBiometricCapability();
  if (!capability.available || !(await isBiometricLoginEnabled())) {
    return {
      available: false,
      biometryType: capability.biometryType,
      savedAccount: null,
    };
  }

  const savedAccount =
    (await getBiometricSavedAccount()) ??
    ({
      username: '',
      displayName: 'Account',
      avatarUrl: null,
    } as BiometricSavedAccount);

  return {
    available: true,
    biometryType: capability.biometryType,
    savedAccount,
  };
}

/** @deprecated Prefer getBiometricLoginPresentation() */
export async function canShowBiometricLoginButton(): Promise<{
  visible: boolean;
  biometryType: BiometryKind | null;
}> {
  const presentation = await getBiometricLoginPresentation();
  return {
    visible: presentation.available,
    biometryType: presentation.biometryType,
  };
}

/** Tracks whether we already asked the user once about enabling biometric login. */
export async function hasPromptedBiometricEnrollment(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PROMPTED_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markBiometricEnrollmentPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(PROMPTED_STORAGE_KEY, 'true');
  } catch (e) {
    console.warn('[biometrics.service] markBiometricEnrollmentPrompted failed:', e);
  }
}

/**
 * Clears the "already asked" flag so the user is offered biometric login
 * again on their next successful manual login. Used when a session is
 * force-invalidated (expired/invalid token) rather than deliberately
 * disabled by the user, so the earlier one-time prompt doesn't permanently
 * suppress future offers.
 */
export async function resetBiometricEnrollmentPrompt(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROMPTED_STORAGE_KEY);
  } catch (e) {
    console.warn('[biometrics.service] resetBiometricEnrollmentPrompt failed:', e);
  }
}

/**
 * Stores the session token behind a biometric-gated Keychain entry.
 * Does not flip the enabled preference — callers decide when enrollment is complete.
 */
async function storeBiometricCredential(username: string, token: string): Promise<boolean> {
  const keychain = getKeychain();
  if (!keychain) {
    return false;
  }
  try {
    await keychain.setGenericPassword(username, token, {
      service: KEYCHAIN_SERVICE,
      accessControl: keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (e) {
    console.warn('[biometrics.service] storeBiometricCredential failed:', e);
    return false;
  }
}

/**
 * Registers biometric login only after a successful system biometric prompt.
 * Never stores the password. On cancel/failure, leaves biometric login disabled.
 * When `account` is provided, it becomes the Login-screen "saved account".
 */
export async function enableBiometricLogin(
  username: string,
  token: string,
  promptTitle: string,
  account?: BiometricSavedAccount,
): Promise<'success' | 'cancelled' | 'failed'> {
  const keychain = getKeychain();
  if (!keychain) {
    return 'failed';
  }

  const stored = await storeBiometricCredential(username, token);
  if (!stored) {
    return 'failed';
  }

  try {
    const verified = await keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: {title: promptTitle},
    });
    if (!verified) {
      await keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
      return 'cancelled';
    }
    await AsyncStorage.setItem(ENABLED_STORAGE_KEY, 'true');
    await saveBiometricAccountProfile(
      account ?? {
        username,
        displayName: username,
        avatarUrl: null,
      },
    );
    return 'success';
  } catch (e) {
    try {
      await keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    } catch (resetError) {
      console.warn('[biometrics.service] enableBiometricLogin cleanup failed:', resetError);
    }
    const reason = classifyBiometricError(e);
    if (reason === 'cancelled') {
      return 'cancelled';
    }
    console.warn('[biometrics.service] enableBiometricLogin verify failed:', e);
    return 'failed';
  }
}

/**
 * Removes the biometric-gated credential and disables the preference.
 * Safe to call even if biometric login was never enabled.
 */
export async function disableBiometricLogin(): Promise<void> {
  const keychain = getKeychain();
  try {
    if (keychain) {
      await keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    }
  } catch (e) {
    console.warn('[biometrics.service] disableBiometricLogin reset failed:', e);
  } finally {
    try {
      await AsyncStorage.setItem(ENABLED_STORAGE_KEY, 'false');
    } catch (e) {
      console.warn('[biometrics.service] disableBiometricLogin storage update failed:', e);
    }
    await clearBiometricAccountProfile();
  }
}

export type EnableBiometricLoginOutcome =
  | {success: true}
  | {success: false; reason: 'unavailable' | 'no_session' | 'failed' | 'cancelled'};

/**
 * Used by the Settings toggle: protects the *current* session token (already
 * in AsyncStorage) behind biometrics after a successful system biometric prompt.
 */
export async function enableBiometricLoginForCurrentSession(
  promptTitle: string,
): Promise<EnableBiometricLoginOutcome> {
  const capability = await getBiometricCapability();
  if (!capability.available) {
    return {success: false, reason: 'unavailable'};
  }

  const token = await AsyncStorage.getItem('token');
  if (!token) {
    return {success: false, reason: 'no_session'};
  }

  const account = await resolveBiometricAccountProfile('omr_user');
  const outcome = await enableBiometricLogin(
    account.username,
    token,
    promptTitle,
    account,
  );
  if (outcome === 'success') {
    return {success: true};
  }
  return {success: false, reason: outcome};
}

/**
 * After a successful password login, keep the Keychain credential in sync when
 * biometric login is already enabled (new session token replaces the old one).
 * Also replaces the saved-account profile with the newly signed-in user.
 */
export async function refreshBiometricLoginCredential(
  username: string,
  token: string,
): Promise<void> {
  if (!(await isBiometricLoginEnabled())) {
    return;
  }
  const ok = await storeBiometricCredential(username, token);
  if (!ok) {
    console.warn('[biometrics.service] refreshBiometricLoginCredential failed');
    return;
  }
  const account = await resolveBiometricAccountProfile(username);
  await saveBiometricAccountProfile(account);
}

/**
 * One-time post-login offer. Never enables biometric login itself — only points
 * the user to Settings when they tap "Go to Settings".
 */
export async function promptOfferBiometricLoginSettingsAfterLogin(params: {
  username: string;
  token: string;
  title: string;
  message: string;
  notNowLabel: string;
  goToSettingsLabel: string;
  onGoToSettings: () => void;
}): Promise<void> {
  const capability = await getBiometricCapability();
  if (!capability.available) {
    return;
  }
  if (await isBiometricLoginEnabled()) {
    const saved = await getBiometricSavedAccount();
    // After "Switch Account", a different user may sign in with password.
    // Keep the previous biometric account until that user enables biometrics
    // in Settings (which replaces the stored credential).
    if (saved?.username && saved.username !== params.username) {
      return;
    }
    await refreshBiometricLoginCredential(params.username, params.token);
    return;
  }
  if (await hasPromptedBiometricEnrollment()) {
    return;
  }

  await markBiometricEnrollmentPrompted();

  await new Promise<void>(resolve => {
    Alert.alert(params.title, params.message, [
      {text: params.notNowLabel, style: 'cancel', onPress: () => resolve()},
      {
        text: params.goToSettingsLabel,
        onPress: () => {
          params.onGoToSettings();
          resolve();
        },
      },
    ]);
  });
}

/**
 * Triggers the native biometric prompt (Face ID / Touch ID / Fingerprint) and
 * resolves with the protected session token on success. Never throws — callers
 * should fall back to username/password login.
 */
export async function authenticateWithBiometrics(
  promptTitle: string,
): Promise<BiometricLoginResult> {
  const keychain = getKeychain();
  if (!keychain) {
    return {success: false, reason: 'unavailable', error: 'unavailable'};
  }
  try {
    const result = await keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: {title: promptTitle},
    });
    if (!result) {
      return {success: false, reason: 'cancelled'};
    }
    return {success: true, token: result.password, username: result.username};
  } catch (e) {
    const reason = classifyBiometricError(e);
    const message = e instanceof Error ? e.message : String(e);
    return {success: false, reason, error: message};
  }
}

/** Lightweight check that the stored session token is still accepted by the API. */
export async function isStoredSessionTokenValid(): Promise<boolean> {
  try {
    await api.get('users/me');
    return true;
  } catch (error: any) {
    const status = error?.response?.status ?? error?.status;
    // Only a definitive auth rejection should force a fresh login; network/5xx
    // errors shouldn't lock the user out of an otherwise valid session.
    if (status === 401 || status === 403) {
      return false;
    }
    return true;
  }
}

/**
 * Full biometric login path used by the Login screen: unlock the Keychain
 * token, restore it into AsyncStorage, validate with the API. On expired /
 * invalid session, clears biometrics so the user must sign in with password.
 */
export async function resumeSessionWithBiometrics(
  promptTitle: string,
): Promise<BiometricSessionResumeResult> {
  const biometricResult = await authenticateWithBiometrics(promptTitle);
  if (!biometricResult.success) {
    return {
      success: false,
      reason: biometricResult.reason,
      error: biometricResult.error,
    };
  }

  try {
    await AsyncStorage.setItem('token', biometricResult.token);
  } catch (e) {
    console.warn('[biometrics.service] failed to restore token to AsyncStorage:', e);
    return {success: false, reason: 'failed'};
  }

  const tokenStillValid = await isStoredSessionTokenValid();
  if (!tokenStillValid) {
    await AsyncStorage.removeItem('token');
    await disableBiometricLogin();
    await resetBiometricEnrollmentPrompt();
    return {success: false, reason: 'session_invalid'};
  }

  // Backfill / refresh the Login "saved account" card after a successful unlock.
  const account = await resolveBiometricAccountProfile(biometricResult.username);
  await saveBiometricAccountProfile(account);

  return {success: true};
}
