/**
 * Centralized runtime permissions (camera, photos, notifications, location)
 * using react-native-permissions + optional FCM token via @react-native-firebase/messaging.
 *
 * UX: call these helpers only when a feature needs them — not on cold start.
 */

import {Alert, Platform} from 'react-native';
import {
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
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

const isGranted = (status: PermissionStatus): boolean =>
  status === RESULTS.GRANTED || status === RESULTS.LIMITED;

const isBlocked = (status: PermissionStatus): boolean => status === RESULTS.BLOCKED;

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
  await openSettings();
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
    {text: openLabel, onPress: () => openSettings().catch(() => {})},
  ]);
}

async function runRequest(
  permission: Permission,
  feature: PermissionFeature,
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const showAlert = options?.showAlertIfBlocked !== false;
  let current = await check(permission);
  if (isGranted(current)) {
    return {status: current, granted: true, blocked: false};
  }
  if (isBlocked(current)) {
    if (showAlert) {
      showBlockedPermissionAlert(feature, options?.blockedCopy);
    }
    return {status: current, granted: false, blocked: true};
  }
  current = await request(permission);
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

function androidPhotoPermission(): Permission {
  return androidApiLevel() >= 33
    ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
    : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
}

function iosCameraPermission(): Permission {
  return PERMISSIONS.IOS.CAMERA;
}

function iosPhotoPermission(): Permission {
  return PERMISSIONS.IOS.PHOTO_LIBRARY;
}

function locationWhenInUsePermission(): Permission {
  return Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
}

// ---------------------------------------------------------------------------
// Public API — request when the feature is about to run
// ---------------------------------------------------------------------------

export async function checkCameraPermission(): Promise<PermissionRequestResult> {
  const p = Platform.OS === 'ios' ? iosCameraPermission() : PERMISSIONS.ANDROID.CAMERA;
  const status = await check(p);
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

export async function requestCameraPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const p = Platform.OS === 'ios' ? iosCameraPermission() : PERMISSIONS.ANDROID.CAMERA;
  return runRequest(p, 'camera', options);
}

export async function checkPhotoPermission(): Promise<PermissionRequestResult> {
  const p = Platform.OS === 'ios' ? iosPhotoPermission() : androidPhotoPermission();
  const status = await check(p);
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

export async function requestPhotoPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const p = Platform.OS === 'ios' ? iosPhotoPermission() : androidPhotoPermission();
  return runRequest(p, 'photo', options);
}

export async function checkLocationPermission(): Promise<PermissionRequestResult> {
  const p = locationWhenInUsePermission();
  const status = await check(p);
  return {
    status,
    granted: isGranted(status),
    blocked: isBlocked(status),
  };
}

export async function requestLocationPermission(
  options?: {showAlertIfBlocked?: boolean; blockedCopy?: Partial<OpenSettingsAlertCopy>},
): Promise<PermissionRequestResult> {
  const p = locationWhenInUsePermission();
  return runRequest(p, 'location', options);
}

export async function checkNotificationPermission(): Promise<PermissionRequestResult> {
  const {status} = await checkNotifications();
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
  const showAlert = options?.showAlertIfBlocked !== false;
  const pre = await checkNotifications();
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

  const post = await requestNotifications(['alert', 'badge', 'sound']);
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
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
    return await messaging().getToken();
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
  const pre = await checkNotifications();
  if (isGranted(pre.status)) {
    const fcmToken = await tryGetFcmToken();
    return {status: pre.status, granted: true, blocked: false, fcmToken};
  }
  if (isBlocked(pre.status)) {
    return {status: pre.status, granted: false, blocked: true, fcmToken: null};
  }
  return requestNotificationPermission({showAlertIfBlocked: false});
}
