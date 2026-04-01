import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChurchTypeItem {
  id: number;
  name: string;
}

export interface ListChurchTypesResponse {
  success: boolean;
  data: {
    items: ChurchTypeItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface ListChurchTypesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function listChurchTypes(params: ListChurchTypesParams = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');

  // API returns a plain array in data; ignore pagination params
  const response = await api.get(`/church-types`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const raw = response.data as any;
  if (Array.isArray(raw?.data)) {
    const items = raw.data as ChurchTypeItem[];
    const normalized: ListChurchTypesResponse = {
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

  return raw as ListChurchTypesResponse;
}

export interface GetChurchTypeResponse {
  success: boolean;
  data: ChurchTypeItem;
  message: string;
}

export async function getChurchTypeById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.get<GetChurchTypeResponse>(`/church-types/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
}

export interface CreateChurchTypePayload { name: string }

export async function createChurchType(payload: CreateChurchTypePayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.post(`/church-types`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface UpdateChurchTypePayload { name: string }

export async function updateChurchType(id: number, payload: UpdateChurchTypePayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.patch(`/church-types/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function deleteChurchType(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.delete(`/church-types/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
} 