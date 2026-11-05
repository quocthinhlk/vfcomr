import {useCallback, useRef} from 'react';

/**
 * Wraps a (Formik) submit handler so a second call while the first is still
 * running is ignored. Formik's isSubmitting disables the button only after a
 * re-render, so a fast double tap could run the handler twice.
 */
export function useSubmitOnce() {
  const runningRef = useRef(false);
  return useCallback(
    <A extends unknown[]>(handler: (...args: A) => Promise<void> | void) =>
      async (...args: A) => {
        if (runningRef.current) {
          return;
        }
        runningRef.current = true;
        try {
          await handler(...args);
        } finally {
          runningRef.current = false;
        }
      },
    [],
  );
}
