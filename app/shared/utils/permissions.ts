import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

// ---------------------------------------------------------------------------
// Image / camera permission helpers (shared across screens and hooks)
// Uses react-native-permissions only when the native module is linked; otherwise
// falls back to PermissionsAndroid (Android) or image-crop-picker prompts (iOS).
// ---------------------------------------------------------------------------

type PermissionSource = 'camera' | 'library';

function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }
  const version = Platform.Version;
  return typeof version === 'number'
    ? version
    : parseInt(String(version), 10) || 0;
}

function isRNPermissionsLinked(): boolean {
  try {
    const {TurboModuleRegistry} = require('react-native') as typeof import('react-native');
    return TurboModuleRegistry.get('RNPermissions') != null;
  } catch {
    return false;
  }
}

export const promptPermissionSettings = (
  source: PermissionSource,
  cancelText = 'Cancel',
): void => {
  const title =
    source === 'camera' ? 'Camera access needed' : 'Photo library access needed';
  const message =
    source === 'camera'
      ? 'Camera access is turned off for this app. You can enable it in system settings.'
      : 'Photo library access is turned off for this app. You can enable it in system settings.';
  Alert.alert(title, message, [
    {text: cancelText, style: 'cancel'},
    {
      text: 'Open Settings',
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
};

/** Returns true if an error thrown by react-native-image-crop-picker is permission-related. */
export const isPermissionError = (error: unknown): boolean => {
  const msg = String((error as any)?.message ?? '');
  const code = String((error as any)?.code ?? '');
  return (
    /permission|denied|not authorized|not authorised/i.test(msg) ||
    /permission/i.test(code)
  );
};

/** Returns true when the user dismissed the native image picker without selecting. */
export const isPickerCancelled = (error: unknown): boolean => {
  const code = String((error as any)?.code ?? '');
  if (code === 'E_PICKER_CANCELLED') {
    return true;
  }
  return /cancel/i.test(String((error as any)?.message ?? ''));
};

async function requestAndroidSystemPermission(
  source: PermissionSource,
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (source === 'camera') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    const permission =
      getAndroidApiLevel() >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function requestWithRNPermissions(
  source: PermissionSource,
  cancelText: string,
): Promise<boolean> {
  const {
    request,
    check,
    PERMISSIONS,
    RESULTS,
  } = require('react-native-permissions');

  const isGranted = (status: string) =>
    status === RESULTS.GRANTED || status === RESULTS.LIMITED;

  let permission: string;
  if (Platform.OS === 'ios') {
    permission =
      source === 'camera'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.IOS.PHOTO_LIBRARY;
  } else {
    permission =
      source === 'camera'
        ? PERMISSIONS.ANDROID.CAMERA
        : getAndroidApiLevel() >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  }

  let status = await check(permission);
  if (isGranted(status)) {
    return true;
  }
  if (status === RESULTS.BLOCKED) {
    promptPermissionSettings(source, cancelText);
    return false;
  }

  status = await request(permission);
  if (isGranted(status)) {
    return true;
  }
  if (status === RESULTS.BLOCKED) {
    promptPermissionSettings(source, cancelText);
  }
  return false;
}

/**
 * Requests camera or photo library access when the user is about to pick/take a photo.
 */
export const ensureAndroidPermission = async (
  source: PermissionSource,
  cancelText = 'Cancel',
): Promise<boolean> => {
  try {
    if (isRNPermissionsLinked()) {
      return await requestWithRNPermissions(source, cancelText);
    }

    if (Platform.OS === 'ios') {
      return true;
    }

    return requestAndroidSystemPermission(source);
  } catch (error) {
    if (Platform.OS === 'ios') {
      return true;
    }
    console.warn('Permission request failed:', error);
    return requestAndroidSystemPermission(source);
  }
};

// ---------------------------------------------------------------------------

export const ROLES = {
  SUPER_ADMIN: 1,
  OVERSEER: 8,
  PASTOR_LEADER: 3,
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];

export const isSuperAdmin = (roleId?: number | null): boolean => roleId === ROLES.SUPER_ADMIN;
export const isOverseer = (roleId?: number | null): boolean => roleId === ROLES.OVERSEER;
export const isPastorLeader = (roleId?: number | null): boolean => roleId === ROLES.PASTOR_LEADER;

/** Same shape as /users/me across the app — some accounts expose `role_id` without nested `role.id`. */
export const resolveRoleIdFromUser = (userData: unknown): number | null => {
  const u = userData as Record<string, unknown> | null | undefined;
  if (!u) return null;
  const raw =
    (u as {role?: {id?: unknown}}).role?.id ??
    (u as {role_id?: unknown}).role_id ??
    (u as {roleID?: unknown}).roleID ??
    (u as {roleId?: unknown}).roleId;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

