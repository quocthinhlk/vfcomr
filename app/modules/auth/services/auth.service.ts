import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginPayload {
  username: string;
  password: string;
}

export async function login(payload: LoginPayload) {
  const response = await api.post('/login', payload);

  const { token, user } = response.data.data;

  // Save token into AsyncStorage
  await AsyncStorage.setItem('token', token);
  
  // Save default church from login response if available
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

  return response.data;
}

export async function logout() {
  // Remove token and selected church_id in AsyncStorage
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('selectedChurchId');
  await AsyncStorage.removeItem('selectedChurchName');
  await AsyncStorage.removeItem('selectedChurchCountryName');
  // Keep biometric enrollment so the Login screen can offer Face ID / Fingerprint
  // as a password replacement. Credentials are cleared only when the user disables
  // the setting, or when the stored session is rejected as invalid/expired.
}

export async function forgotPassword(email: string) {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
} 