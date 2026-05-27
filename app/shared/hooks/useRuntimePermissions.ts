import {useCallback, useState} from 'react';
import {
  checkCameraPermission,
  checkLocationPermission,
  checkNotificationPermission,
  checkPhotoPermission,
  requestCameraPermission,
  requestLocationPermission,
  requestNotificationPermission,
  requestPhotoPermission,
  type NotificationPermissionResult,
  type PermissionRequestResult,
} from '../services/permissions.service';

export type UseRuntimePermissionsState = {
  loading: boolean;
  lastCamera: PermissionRequestResult | null;
  lastPhoto: PermissionRequestResult | null;
  lastLocation: PermissionRequestResult | null;
  lastNotification: NotificationPermissionResult | null;
  error: string | null;
};

const initial: UseRuntimePermissionsState = {
  loading: false,
  lastCamera: null,
  lastPhoto: null,
  lastLocation: null,
  lastNotification: null,
  error: null,
};

/**
 * Optional hook for screens that need several permission checks with shared loading state.
 * Prefer calling `permissions.service` directly for single-purpose flows.
 */
export function useRuntimePermissions() {
  const [state, setState] = useState<UseRuntimePermissionsState>(initial);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, patch: (result: T) => Partial<UseRuntimePermissionsState>) => {
      setState(s => ({...s, loading: true, error: null}));
      try {
        const result = await fn();
        setState(s => ({...s, loading: false, ...patch(result)}));
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setState(s => ({...s, loading: false, error: message}));
        throw e;
      }
    },
    [],
  );

  const refreshChecks = useCallback(async () => {
    setState(s => ({...s, loading: true, error: null}));
    try {
      const [cam, photo, loc] = await Promise.all([
        checkCameraPermission(),
        checkPhotoPermission(),
        checkLocationPermission(),
      ]);
      const notif = await checkNotificationPermission();
      setState(s => ({
        ...s,
        loading: false,
        lastCamera: cam,
        lastPhoto: photo,
        lastLocation: loc,
        lastNotification: {...notif, fcmToken: null},
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState(s => ({...s, loading: false, error: message}));
    }
  }, []);

  const requestCamera = useCallback(
    () => run(() => requestCameraPermission(), r => ({lastCamera: r})),
    [run],
  );
  const requestPhoto = useCallback(
    () => run(() => requestPhotoPermission(), r => ({lastPhoto: r})),
    [run],
  );
  const requestLocation = useCallback(
    () => run(() => requestLocationPermission(), r => ({lastLocation: r})),
    [run],
  );
  const requestNotifications = useCallback(
    () =>
      run(() => requestNotificationPermission(), r => ({
        lastNotification: r,
      })),
    [run],
  );

  return {
    ...state,
    refreshChecks,
    requestCamera,
    requestPhoto,
    requestLocation,
    requestNotifications,
  };
}
