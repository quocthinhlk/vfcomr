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
  // await AsyncStorage.setItem('user', JSON.stringify(user));

  return response.data;
}

export async function logout() {
  // Remove token and selected church_id in AsyncStorage
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('selectedChurchId');
}

export async function forgotPassword(email: string) {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
} 