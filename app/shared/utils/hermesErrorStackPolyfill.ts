/**
 * Hermes can throw when code reads Error.stack on objects that are not valid
 * Error receivers (e.g. AxiosError on RN 0.78). Apply a safe getter early.
 */
export function applyHermesErrorStackPolyfill(): void {
  if (typeof global === 'undefined' || !(global as { HermesInternal?: unknown }).HermesInternal) {
    return;
  }

  const originalStackGetter = Object.getOwnPropertyDescriptor(Error.prototype, 'stack')?.get;
  if (!originalStackGetter) {
    return;
  }

  Object.defineProperty(Error.prototype, 'stack', {
    get() {
      try {
        return originalStackGetter.call(this);
      } catch {
        return `Error: ${this.message || 'Unknown error'}\n    at (Hermes stack unavailable)`;
      }
    },
    configurable: true,
  });
}
