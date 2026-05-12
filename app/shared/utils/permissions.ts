import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

// ---------------------------------------------------------------------------
// Image / camera permission helpers (shared across screens and hooks)
// ---------------------------------------------------------------------------

/** Shows an Alert prompting the user to open system Settings to grant access. */
export const promptPermissionSettings = (
  source: 'camera' | 'library',
  cancelText = 'Cancel',
): void => {
  const title =
    source === 'camera' ? 'Camera permission required' : 'Photo access required';
  const message = `Please enable ${
    source === 'camera' ? 'camera' : 'photo library'
  } access in system settings to continue.`;
  Alert.alert(title, message, [
    {text: cancelText, style: 'cancel'},
    {text: 'Open Settings', onPress: () => void Linking.openSettings()},
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

/**
 * Android-only: checks and requests the required permission before accessing
 * the camera or photo library. Returns `true` if the permission is granted.
 * On iOS this always returns `true` (the OS dialog is triggered by the picker itself).
 */
export const ensureAndroidPermission = async (
  source: 'camera' | 'library',
  cancelText = 'Cancel',
): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const requestOne = async (permission: any): Promise<boolean> => {
    try {
      const result = await PermissionsAndroid.request(permission);
      if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
      // NEVER_ASK_AGAIN: the OS will never show the dialog again — direct user to Settings.
      // DENIED: the OS dialog will re-appear on the next attempt, so just return false silently.
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        promptPermissionSettings(source, cancelText);
      }
      return false;
    } catch {
      promptPermissionSettings(source, cancelText);
      return false;
    }
  };

  if (source === 'camera') {
    return requestOne(PermissionsAndroid.PERMISSIONS.CAMERA);
  }

  // Photo library: Android 13+ uses READ_MEDIA_IMAGES; older uses READ_EXTERNAL_STORAGE.
  const androidVersion = Number(Platform.Version) || 0;
  const perm =
    androidVersion >= 33
      ? (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  return requestOne(perm);
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

