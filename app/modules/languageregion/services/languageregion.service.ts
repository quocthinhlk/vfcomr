import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LanguageRegionItem {
  id: number;
  name: string;
  parent_id: number | null;
  disabled: boolean;
}

export interface ListLanguageRegionsResponse {
  success: boolean;
  data: {
    items: LanguageRegionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export async function listLanguageRegions() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');

  const response = await api.get(`/language-regions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const raw = response.data as any;
  if (Array.isArray(raw?.data)) {
    const items = raw.data as LanguageRegionItem[];
    const normalized: ListLanguageRegionsResponse = {
      success: !!raw.success,
      data: {
        items,
        total: items.length,
        page: 1,
        limit: items.length || DEFAULT_PAGE_LIMIT,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
      message: raw?.message ?? 'OK',
    };
    return normalized;
  }
  return raw as ListLanguageRegionsResponse;
}

export interface GetLanguageRegionResponse {
  success: boolean;
  data: LanguageRegionItem;
  message: string;
}

export async function getLanguageRegionById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.get<GetLanguageRegionResponse>(`/language-regions/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
}

export interface CreateLanguageRegionPayload {
  name: string;
  parent_id?: number | null;
  disabled?: boolean;
}

export async function createLanguageRegion(payload: CreateLanguageRegionPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.post(`/language-regions`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface UpdateLanguageRegionPayload {
  name: string;
  parent_id?: number | null;
  disabled?: boolean;
}

export async function updateLanguageRegion(id: number, payload: UpdateLanguageRegionPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.patch(`/language-regions/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function deleteLanguageRegion(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.delete(`/language-regions/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
} 