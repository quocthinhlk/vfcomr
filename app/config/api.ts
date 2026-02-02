// app/config/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_PAGE_LIMIT = 10;

// export const TOKEN_FOR_TEST = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzQzNDcyMzgsInJvbGUiOiJTdXBlciBBZG1pbiIsInJvbGVJRCI6MSwidXNlcklEIjo0NzY4fQ.Vk8BsCNMZHfm9ENQ9mUkz5Iib_73yvTrhHMmxUVCUKY";
export const TOKEN_FOR_TEST = '';

const api = axios.create({
  baseURL: 'http://34.126.158.119/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async config => {
  try {
    const token = TOKEN_FOR_TEST || (await AsyncStorage.getItem('token')) || '';
    if (token) {
      if (config.headers && typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = {
          ...(config.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        } as any;
      }
    }
  } catch (e) {
    // ignore token retrieval errors
  }
  return config;
});

export default api;
