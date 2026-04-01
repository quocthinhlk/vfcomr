import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LanguageItem {
  id: number;
  name: string;
}

export interface ListLanguagesResponse {
  success: boolean;
  data: {
    items: LanguageItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface ListLanguagesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function listLanguages(params: ListLanguagesParams = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const name = params.name ?? '';

  const response = await api.get<ListLanguagesResponse>(`/languages`, {
    params: { page, limit, name },
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface GetLanguageResponse {
  success: boolean;
  data: LanguageItem;
  message: string;
}

export async function getLanguageById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.get<GetLanguageResponse>(`/languages/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface CreateLanguagePayload { name: string }

export async function createLanguage(payload: CreateLanguagePayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.post(`/languages`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Create language failed';
    console.error('Create language error:', message);
    throw new Error(message);
  }
}

export interface UpdateLanguagePayload { name: string }

export async function updateLanguage(id: number, payload: UpdateLanguagePayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.patch(`/languages/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function deleteLanguage(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.delete(`/languages/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
} 