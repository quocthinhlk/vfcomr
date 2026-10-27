import {useCallback, useEffect, useRef} from 'react';

/**
 * Keeps async lookups (dropdown searches, city lists) in order: each `begin(key)`
 * makes earlier requests for that key stale, so a slow response for an older
 * query (or the previous country) can't overwrite a newer one. `debounce`
 * waits until typing pauses before searching. Everything goes stale on unmount.
 */
export function useLatestRequest() {
  const seqRef = useRef<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const timers = timersRef.current;
    return () => {
      aliveRef.current = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  /** Starts a request for `key`; the returned function says if it is still the latest. */
  const begin = useCallback((key: string) => {
    const next = (seqRef.current[key] ?? 0) + 1;
    seqRef.current[key] = next;
    return () => aliveRef.current && seqRef.current[key] === next;
  }, []);

  /** Runs `fn` once `key` has been quiet for `delay` ms. */
  const debounce = useCallback((key: string, fn: () => void, delay = 300) => {
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
    }
    timersRef.current[key] = setTimeout(() => {
      delete timersRef.current[key];
      if (aliveRef.current) {
        fn();
      }
    }, delay);
  }, []);

  /** Cancels a pending debounced call and makes in-flight requests for `key` stale. */
  const cancel = useCallback(
    (key: string) => {
      if (timersRef.current[key]) {
        clearTimeout(timersRef.current[key]);
        delete timersRef.current[key];
      }
      begin(key);
    },
    [begin],
  );

  return {begin, debounce, cancel};
}
