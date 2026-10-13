import {useCallback, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';

/** Bumped by screens that change shared data, so lists behind them know to reload. */
const dataVersions = new Map<string, number>();

export type DataKey =
  | 'resources'
  | 'watchLists'
  | 'roleChangeRequests'
  | 'users'
  | 'churches';

export function markDataChanged(key: DataKey) {
  dataVersions.set(key, (dataVersions.get(key) ?? 0) + 1);
}

function versionOf(key?: DataKey) {
  return key ? dataVersions.get(key) ?? 0 : 0;
}

type Options = {
  /** Reload when another screen called markDataChanged(dataKey) since we last loaded. */
  dataKey?: DataKey;
  /** Route `reload` param (set by returnToList / returnAfterEdit / navigate). */
  reload?: unknown;
  /** Clears the `reload` param once handled. */
  clearReload?: () => void;
};

/**
 * Reloads a screen when it comes back into focus, but only if something changed:
 * a `reload` route param or a markDataChanged() call. A plain Back does nothing.
 * The first load stays with the screen (e.g. a useEffect).
 */
export function useReloadOnReturn(onReload: () => void, {dataKey, reload, clearReload}: Options) {
  const seenVersion = useRef(versionOf(dataKey));
  const onReloadRef = useRef(onReload);
  onReloadRef.current = onReload;
  const clearReloadRef = useRef(clearReload);
  clearReloadRef.current = clearReload;

  useFocusEffect(
    useCallback(() => {
      const version = versionOf(dataKey);
      if (!reload && version === seenVersion.current) {
        return;
      }
      seenVersion.current = version;
      if (reload) {
        clearReloadRef.current?.();
      }
      onReloadRef.current();
    }, [dataKey, reload]),
  );
}
