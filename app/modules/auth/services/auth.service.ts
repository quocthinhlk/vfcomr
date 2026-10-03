import {DeviceEventEmitter} from 'react-native';
import api, {TOKEN_FOR_TEST} from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SWITCH_SESSION_EVENT = 'switchSessionChanged';
const ORIGINAL_TOKEN_KEY = 'originalAdminToken';
const SWITCHED_USER_KEY = 'switchedUser';
const SWITCHED_USER_NAME_KEY = 'switchedUserName';

interface LoginPayload {
  username: string;
  password: string;
}

export async function login(payload: LoginPayload) {
  const response = await api.post('/login', payload);

  const { token, user } = response.data.data;

  // Save token into AsyncStorage
  await AsyncStorage.setItem('token', token);
  await persistSelectedChurch(user);

  return response.data;
}

export async function logout() {
  // Remove token and selected church_id in AsyncStorage
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('selectedChurchId');
  await AsyncStorage.removeItem('selectedChurchName');
  await AsyncStorage.removeItem('selectedChurchCountryName');
  await AsyncStorage.multiRemove([
    ORIGINAL_TOKEN_KEY,
    SWITCHED_USER_KEY,
    SWITCHED_USER_NAME_KEY,
  ]);
  DeviceEventEmitter.emit(SWITCH_SESSION_EVENT);
  // Keep biometric enrollment so the Login screen can offer Face ID / Fingerprint
  // as a password replacement. Credentials are cleared only when the user disables
  // the setting, or when the stored session is rejected as invalid/expired.
}

export async function forgotPassword(email: string) {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
}

function extractToken(body: unknown): string | null {
  const root = body as {data?: unknown; token?: unknown} | null;
  const data = (root?.data ?? root) as {
    token?: unknown;
    access_token?: unknown;
    auth_token?: unknown;
  } | null;
  const token = data?.token || data?.access_token || data?.auth_token || root?.token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

async function persistSelectedChurch(user: any) {
  const defaultChurchId =
    user?.default_church_id ??
    user?.default_church?.id ??
    user?.church_id ??
    user?.assigned_churches?.[0]?.id ??
    user?.pastor_of_churches?.[0]?.id ??
    user?.pastor_churches?.[0]?.id;
  const defaultChurchName =
    user?.default_church_name ??
    user?.default_church?.name ??
    user?.church_name ??
    user?.assigned_churches?.[0]?.name ??
    user?.pastor_of_churches?.[0]?.name ??
    user?.pastor_churches?.[0]?.name;

  if (defaultChurchId) {
    await AsyncStorage.setItem('selectedChurchId', String(defaultChurchId));
  } else {
    await AsyncStorage.removeItem('selectedChurchId');
  }
  if (defaultChurchName) {
    await AsyncStorage.setItem('selectedChurchName', String(defaultChurchName));
  } else {
    await AsyncStorage.removeItem('selectedChurchName');
  }
  await AsyncStorage.removeItem('selectedChurchCountryName');
}

export async function getSwitchSession(): Promise<{active: boolean; name: string}> {
  const flag = await AsyncStorage.getItem(SWITCHED_USER_KEY);
  const name = (await AsyncStorage.getItem(SWITCHED_USER_NAME_KEY)) || '';
  return {active: flag === '1', name};
}

export async function switchToUser(targetUserId: number, displayName: string) {
  const stored = (await AsyncStorage.getItem('token')) || '';
  const alreadySwitched = (await AsyncStorage.getItem(SWITCHED_USER_KEY)) === '1';
  const current = alreadySwitched ? stored : TOKEN_FOR_TEST || stored;
  if (!current) {
    throw new Error('No authentication token found.');
  }
  const original = alreadySwitched
    ? (await AsyncStorage.getItem(ORIGINAL_TOKEN_KEY)) || current
    : current;

  const response = await api.post('auth/switch-user', {target_user_id: targetUserId});
  const token = extractToken(response.data);
  if (!token) {
    throw new Error('Could not switch user.');
  }

  await AsyncStorage.multiSet([
    [ORIGINAL_TOKEN_KEY, original],
    ['token', token],
    [SWITCHED_USER_KEY, '1'],
    [SWITCHED_USER_NAME_KEY, displayName],
  ]);

  try {
    const me = await api.get('users/me');
    await persistSelectedChurch(me?.data?.data);
  } catch {
    await AsyncStorage.multiRemove([
      'selectedChurchId',
      'selectedChurchName',
      'selectedChurchCountryName',
    ]);
  }

  DeviceEventEmitter.emit(SWITCH_SESSION_EVENT);
}

export async function switchBackToAdmin() {
  const original = await AsyncStorage.getItem(ORIGINAL_TOKEN_KEY);
  if (!original) {
    throw new Error('Could not switch back.');
  }

  const response = await api.post('auth/switch-back', {original_token: original});
  const token = extractToken(response.data) || original;

  await AsyncStorage.setItem('token', token);
  await AsyncStorage.multiRemove([
    ORIGINAL_TOKEN_KEY,
    SWITCHED_USER_KEY,
    SWITCHED_USER_NAME_KEY,
    'selectedChurchId',
    'selectedChurchName',
    'selectedChurchCountryName',
  ]);

  try {
    const me = await api.get('users/me');
    await persistSelectedChurch(me?.data?.data);
  } catch {
    // Admin dashboard can reload church selection on focus.
  }

  DeviceEventEmitter.emit(SWITCH_SESSION_EVENT);
} 