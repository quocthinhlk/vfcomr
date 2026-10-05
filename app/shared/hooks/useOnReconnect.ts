import {useEffect, useRef} from 'react';
import {networkEventEmitter} from '../utils/networkEvents';

/**
 * Run `callback` when the app regains its connection (fires when the status
 * bar switches to "Connected"). Use it to reload data a screen already shows.
 */
export function useOnReconnect(callback: () => void) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => networkEventEmitter.subscribe(() => ref.current()), []);
}
