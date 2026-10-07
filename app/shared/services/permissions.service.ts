/**
 * Centralized runtime permissions (camera, photos, notifications, location)
 * using react-native-permissions + optional FCM token via @react-native-firebase/messaging.
 *
 * UX: call these helpers only when a feature needs them — not on cold start.
 */

import {Alert, Linking, Platform} from 'react-native';
import type {Permission, PermissionStatus} from 'react-native-permissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PermissionFeature = 'camera' | 'photo' | 'notification' | 'location';

export type PermissionRequestResult = {
  status: PermissionStatus;
  /** True when the user can use the feature (includes iOS photo `limited`). */
  granted: boolean;
  /** OS will not show the dialog again; user must use Settings. */
  blocked: boolean;
};

export type NotificationPermissionResult = PermissionRequestResult & {
  /** FCM device token when messaging is configured and permission allows push. */
  fcmToken: string | null;
};

type RNPermissionsModule = typeof import('react-native-permissions');

const UNAVAILABLE_RESULT: PermissionRequestResult = {
  status: 'unavailable',
  granted: false,
  blocked: false,
};

function unavailableNotificationResult(): NotificationPermissionResult {
  return {...UNAVAILABLE_RESULT, fcmToken: null};
}

function isRNPermissionsLinked(): boolean {
  try {
    const {TurboModuleRegistry} = require('react-native') as typeof import('react-native');
    return TurboModuleRegistry.get('RNPermissions') != null;
  } catch {
    return false;
  }
}

let rnPermissionsModule: RNPermissionsModule | null = null;

function getRNPermissions(): RNPermissionsModule | null {
  if (!isRNPermissionsLinked()) {
    return null;
  }
  if (!rnPermissionsModule) {
    rnPermissionsModule = require('react-native-permissions');
  }
  return rnPermissionsModule;
}

const isGranted = (status: PermissionStatus): boolean =>
  status === 'granted' || status === 'limited';

const isBlocked = (status: PermissionStatus): boolean => status === 'blocked';

// ---------------------------------------------------------------------------
// Settings + blocked UX
// ---------------------------------------------------------------------------

export type OpenSettingsAlertCopy = {
  title: string;
  message: string;
  cancel: string;
  openSettings: string;
};

const defaultBlockedCopy: Record<PermissionFeature, OpenSettingsAlertCopy> = {
  camera: {
    title: 'Camera access needed',
    message:
      'Camera access is turned off for this app. You can enable it in system settings.',
    cancel: 'Cancel',
    openSettings: 'Open Settings',
  },
  photo: {
    title: 'Photo library access needed',
    message:
      'Photo library access is turned off for this app. You can enable it in system settings.',
    cancel: 'Cancel',
    openSettings: 'Open Settings',
  },
  notification: {
    title: 'Notifications disabled',
    message:
      'Notifications are blocked for this app. Enable them in system settings to receive alerts.',
    cancel: 'Cancel',
    openSettings: 'Open Settings',
  },
  location: {
    title: 'Location access needed',
    message:
      'Location access is turned off for this app. You can enable it in system settings.',
    cancel: 'Cancel',
    openSettings: 'Open Settings',
  },
};

/** Opens the app’s page in system settings (iOS / Android). */
export async function openAppSettings(): Promise<void> {
  const rn = getRNPermissions();
  if (rn) {
    await rn.openSettings();
    return;
  }
  await Linking.openSettings();
}

/**
 * Presents Cancel + Open Settings when a permission is blocked / permanently denied.
 */
export function showBlockedPermissionAlert(
  feature: PermissionFeature,
  copy?: Partial<OpenSettingsAlertCopy>,
): void {
  const base = defaultBlockedCopy[feature];
  const title = copy?.title ?? base.title;
  const message = copy?.message ?? base.message;
  const cancel = copy?.cancel ?? base.cancel;
  const openLabel = copy?.openSettings ?? base.openSettings;
  Alert.alert(title, message, [
    {text: cancel, style: 'cancel'},
    {text: openLabel, onPress: () => void openAppSettings()},
  ]);
}

async function runRequest(
  permission: Permission,
  feature: PermissionFeature,
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }

  const showAlert = options?.showAlertIfBlocked !== false;
  let current = await rn.check(permission);
  if (isGranted(current)) {
    return {status: current, granted: true, blocked: false};
  }
  if (isBlocked(current)) {
    if (showAlert) {
      showBlockedPermissionAlert(feature, options?.blockedCopy);
    }
    return {status: current, granted: false, blocked: true};
  }
  current = await rn.request(permission);
  const granted = isGranted(current);
  const blocked = isBlocked(current);
  if (blocked && showAlert) {
    showBlockedPermissionAlert(feature, options?.blockedCopy);
  }
  return {status: current, granted, blocked};
}

function androidApiLevel(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }
  const v = Platform.Version;
  return typeof v === 'number' ? v : parseInt(String(v), 10) || 0;
}

function androidPhotoPermission(rn: RNPermissionsModule): Permission {
  return androidApiLevel() >= 33
    ? rn.PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
    : rn.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
}

function iosCameraPermission(rn: RNPermissionsModule): Permission {
  return rn.PERMISSIONS.IOS.CAMERA;
}

function iosPhotoPermission(rn: RNPermissionsModule): Permission {
  return rn.PERMISSIONS.IOS.PHOTO_LIBRARY;
}

function locationWhenInUsePermission(rn: RNPermissionsModule): Permission {
  return Platform.OS === 'ios'
    ? rn.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : rn.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
}

// ---------------------------------------------------------------------------
// Public API — request when the feature is about to run
// ---------------------------------------------------------------------------

export async function checkCameraPermission(): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const p = Platform.OS === 'ios' ? iosCameraPermission(rn) : rn.PERMISSIONS.ANDROID.CAMERA;
  const status = await rn.check(p);
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

export async function requestCameraPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const p = Platform.OS === 'ios' ? iosCameraPermission(rn) : rn.PERMISSIONS.ANDROID.CAMERA;
  return runRequest(p, 'camera', options);
}

export async function checkPhotoPermission(): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const p = Platform.OS === 'ios' ? iosPhotoPermission(rn) : androidPhotoPermission(rn);
  const status = await rn.check(p);
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

export async function requestPhotoPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const p = Platform.OS === 'ios' ? iosPhotoPermission(rn) : androidPhotoPermission(rn);
  return runRequest(p, 'photo', options);
}

export async function checkLocationPermission(): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const p = locationWhenInUsePermission(rn);
  const status = await rn.check(p);
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

export async function requestLocationPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const p = locationWhenInUsePermission(rn);
  return runRequest(p, 'location', options);
}

export async function checkNotificationPermission(): Promise<PermissionRequestResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return UNAVAILABLE_RESULT;
  }
  const {status} = await rn.checkNotifications();
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

/**
 * Requests push notification permission (Android 13+ POST_NOTIFICATIONS + iOS alert).
 * Optionally retrieves an FCM token when Firebase is configured.
 */
export async function requestNotificationPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<NotificationPermissionResult> {
  const rn = getRNPermissions();
  if (!rn) {
    return unavailableNotificationResult();
  }

  const showAlert = options?.showAlertIfBlocked !== false;
  const pre = await rn.checkNotifications();
  if (isGranted(pre.status)) {
    const fcmToken = await tryGetFcmToken();
    return {status: pre.status, granted: true, blocked: false, fcmToken};
  }
  if (isBlocked(pre.status)) {
    if (showAlert) {
      showBlockedPermissionAlert('notification', options?.blockedCopy);
    }
    return {status: pre.status, granted: false, blocked: true, fcmToken: null};
  }

  const post = await rn.requestNotifications(['alert', 'badge', 'sound']);
  const granted = isGranted(post.status);
  const blocked = isBlocked(post.status);
  if (blocked && showAlert) {
    showBlockedPermissionAlert('notification', options?.blockedCopy);
  }
  const fcmToken = granted ? await tryGetFcmToken() : null;
  return {status: post.status, granted, blocked, fcmToken};
}

async function tryGetFcmToken(): Promise<string | null> {
  try {
    // Lazy so JS bundle loads if native Firebase isn’t linked yet.
    const messaging = require('@react-native-firebase/messaging').default;
    const {registerDeviceToken, waitForPendingTokenDeletion} =
      require('./notifications.service') as typeof import('./notifications.service');
    // Right after a logout → login, don't fetch the token that is being deleted.
    await waitForPendingTokenDeletion();
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token: string = await messaging().getToken();
    try {
      if (token) {
        void registerDeviceToken(token);
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[permissions.service] Failed to register device token:', e);
      }
    }
    return token;
  } catch (e) {
    console.warn('[permissions.service] FCM getToken skipped:', e);
    return null;
  }
}

/**
 * Call after login / onboarding — does not prompt if notifications are already granted.
 * Does not show blocked alert by default (non-intrusive after login).
 */
export async function requestNotificationPermissionAfterLogin(): Promise<NotificationPermissionResult> {
  const rn = getRNPermissions();
  if (!rn) {
    if (__DEV__) {
      console.warn(
        '[permissions.service] RNPermissions not linked; skipping post-login notification prompt',
      );
    }
    return unavailableNotificationResult();
  }

  const pre = await rn.checkNotifications();
  if (isGranted(pre.status)) {
    const fcmToken = await tryGetFcmToken();
    return {status: pre.status, granted: true, blocked: false, fcmToken};
  }
  if (isBlocked(pre.status)) {
    return {status: pre.status, granted: false, blocked: true, fcmToken: null};
  }
  return requestNotificationPermission({showAlertIfBlocked: false});
}
