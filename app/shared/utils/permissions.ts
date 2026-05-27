import {
  requestCameraPermission,
  requestPhotoPermission,
  showBlockedPermissionAlert,
} from '../services/permissions.service';

// ---------------------------------------------------------------------------
// Image / camera permission helpers (shared across screens and hooks)
// Delegates to permissions.service (react-native-permissions) on all platforms.
// ---------------------------------------------------------------------------

/** @deprecated Use showBlockedPermissionAlert from permissions.service */
export const promptPermissionSettings = (
  source: 'camera' | 'library',
  cancelText = 'Cancel',
): void => {
  showBlockedPermissionAlert(source === 'camera' ? 'camera' : 'photo', {
    cancel: cancelText,
  });
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
 * Requests camera or photo library access when the user is about to pick/take a photo.
 * On iOS and Android uses react-native-permissions (runtime dialogs when needed).
 */
export const ensureAndroidPermission = async (
  source: 'camera' | 'library',
  cancelText = 'Cancel',
): Promise<boolean> => {
  const copy = {cancel: cancelText};
  const res =
    source === 'camera'
      ? await requestCameraPermission({blockedCopy: copy})
      : await requestPhotoPermission({blockedCopy: copy});
  return res.granted;
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

