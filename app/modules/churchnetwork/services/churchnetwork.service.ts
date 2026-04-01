import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChurchNetworkItem {
  id: number;
  name: string;
  pastor_credential_locked: boolean;
}

export interface ListChurchNetworksResponse {
  success: boolean;
  data: {
    items: ChurchNetworkItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface ListChurchNetworksParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function listChurchNetworks(params: ListChurchNetworksParams = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');

  const response = await api.get(`/church-networks`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const raw = response.data as any;
  if (Array.isArray(raw?.data)) {
    const items = raw.data as ChurchNetworkItem[];
    const normalized: ListChurchNetworksResponse = {
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
  return raw as ListChurchNetworksResponse;
}

export interface GetChurchNetworkResponse {
  success: boolean;
  data: ChurchNetworkItem;
  message: string;
}

export async function getChurchNetworkById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.get<GetChurchNetworkResponse>(`/church-networks/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
}

export interface CreateChurchNetworkPayload {
  name: string;
  pastor_credential_locked?: boolean;
}

export async function createChurchNetwork(payload: CreateChurchNetworkPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.post(`/church-networks`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface UpdateChurchNetworkPayload {
  name: string;
  pastor_credential_locked?: boolean;
}

export async function updateChurchNetwork(id: number, payload: UpdateChurchNetworkPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.patch(`/church-networks/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function deleteChurchNetwork(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.delete(`/church-networks/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
} 