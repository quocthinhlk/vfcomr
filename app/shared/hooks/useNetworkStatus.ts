import {useSyncExternalStore} from 'react';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {networkEventEmitter} from '../utils/networkEvents';

/**
 * App-wide connection status for the "No Connection / Connecting... /
 * Connected" bar. One NetInfo subscription is shared by every screen.
 *
 *   online      -> nothing shown
 *   offline     -> "No Connection" (stays until the network comes back)
 *   connecting  -> network is back, confirming the Internet is reachable
 *   connected   -> shown briefly, then back to `online`
 */
export type NetworkStatus = 'online' | 'offline' | 'connecting' | 'connected';

// Keep "Connecting..." visible long enough to read, even on fast reconnects.
const MIN_CONNECTING_MS = 900;
const CONNECTED_VISIBLE_MS = 1800;
// Give up waiting for NetInfo's reachability probe after this long.
const REACHABILITY_TIMEOUT_MS = 8000;

let status: NetworkStatus = 'online';
let started = false;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let connectingToken = 0;
let offlinePoll: ReturnType<typeof setInterval> | undefined;
// NetInfo doesn't always emit when connectivity returns (reachability is
// re-probed lazily, and the iOS simulator rarely emits), so poll while offline.
const OFFLINE_POLL_MS = 3000;
const listeners = new Set<() => void>();

const setStatus = (next: NetworkStatus) => {
  if (next === status) {
    return;
  }
  status = next;
  if (next === 'offline' && !offlinePoll) {
    offlinePoll = setInterval(() => {
      NetInfo.refresh()
        .then(handleState)
        .catch(() => {});
    }, OFFLINE_POLL_MS);
  } else if (next !== 'offline' && offlinePoll) {
    clearInterval(offlinePoll);
    offlinePoll = undefined;
  }
  listeners.forEach(l => l());
};

const isOffline = (s: NetInfoState) =>
  s.isConnected === false || s.isInternetReachable === false;
const isReachable = (s: NetInfoState) =>
  s.isConnected === true && s.isInternetReachable === true;

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function confirmReconnect() {
  const token = ++connectingToken;
  const startedAt = Date.now();
  setStatus('connecting');

  // NetInfo reports isInternetReachable = null while it probes; poll until it
  // settles to true, or give up and trust isConnected.
  let state = await NetInfo.refresh();
  while (
    token === connectingToken &&
    !isReachable(state) &&
    !isOffline(state) &&
    Date.now() - startedAt < REACHABILITY_TIMEOUT_MS
  ) {
    await wait(500);
    state = await NetInfo.refresh();
  }
  if (token !== connectingToken) {
    return;
  }
  if (isOffline(state)) {
    setStatus('offline');
    return;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_CONNECTING_MS) {
    await wait(MIN_CONNECTING_MS - elapsed);
    if (token !== connectingToken) {
      return;
    }
  }

  setStatus('connected');
  // Let screens that listen for reconnection reload their data.
  networkEventEmitter.notify();
  hideTimer = setTimeout(() => {
    if (token === connectingToken && status === 'connected') {
      setStatus('online');
    }
  }, CONNECTED_VISIBLE_MS);
}

function handleState(s: NetInfoState) {
  if (isOffline(s)) {
    connectingToken += 1;
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    setStatus('offline');
    return;
  }
  if (status === 'offline') {
    confirmReconnect();
  }
}

function start() {
  if (started) {
    return;
  }
  started = true;
  try {
    NetInfo.addEventListener(handleState);
    NetInfo.fetch().then(s => {
      // Launching while offline shows the bar straight away.
      if (isOffline(s)) {
        setStatus('offline');
      }
    });
  } catch (e) {
    console.warn('[useNetworkStatus] NetInfo unavailable', e);
  }
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useNetworkStatus = (): NetworkStatus =>
  useSyncExternalStore(subscribe, () => status);
