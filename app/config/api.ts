// app/config/api.ts
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_PAGE_LIMIT = 10;
const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';
const DEFAULT_LANGUAGE = 'en';

// Admin token
// export const TOKEN_FOR_TEST = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODkzNzQ1MzQsInJvbGUiOiJTdXBlciBBZG1pbiIsInJvbGVJRCI6MSwidXNlcklEIjo0NDUwfQ.oH5eRvElBNThPtwq8_2nhgtAOWAhgudiK0qzRtsLhzY";
// Overseer token
// export const TOKEN_FOR_TEST = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTEyODEyMDEsInJvbGUiOiJHaXZpbmcgT3ZlcnNpZ2h0Iiwicm9sZUlEIjo4LCJ1c2VySUQiOjI0Mn0.uQ9qXyfn5NUGHSPY61nTqPjRs2APbRqPkMHF7pn0lDo";
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
    const language =
      (await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY))?.trim() || DEFAULT_LANGUAGE;

    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Accept-Language', language);
    } else {
      config.headers = {
        ...(config.headers as Record<string, string> | undefined),
        'Accept-Language': language,
      } as any;
    }

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

function normalizeAxiosError(error: AxiosError): Error {
  const normalized = new Error(error.message);
  normalized.name = error.name;
  Object.assign(normalized, {
    code: error.code,
    config: error.config,
    request: error.request,
    response: error.response,
    status: error.response?.status,
    isAxiosError: true,
  });
  return normalized;
}

api.interceptors.response.use(
  response => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(normalizeAxiosError(error));
    }
    return Promise.reject(error);
  },
);

export default api;
