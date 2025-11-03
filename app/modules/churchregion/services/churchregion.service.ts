import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChurchRegionItem {
  id: number;
  parent_id: number | null;
  left: number;
  right: number;
  name: string;
  created?: string;
  modified?: string;
}

export interface ListChurchRegionsResponse {
  success: boolean;
  data: {
    items: ChurchRegionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export async function listChurchRegions(params: Record<string, any> = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const response = await api.get(`/church-regions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const raw = response.data as any;
  if (Array.isArray(raw?.data)) {
    const items = raw.data as ChurchRegionItem[];
    const normalized: ListChurchRegionsResponse = {
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
  return raw as ListChurchRegionsResponse;
}

export async function getChurchRegionById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const resp = await api.get(`/church-regions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return resp.data;
}

export async function getChurchRegionChildren(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const resp = await api.get(`/church-regions/${id}/children`, { headers: { 'Authorization': `Bearer ${token}` } });
  return resp.data;
}

export async function getChurchRegionHierarchy() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const resp = await api.get(`/church-regions/hierarchy`, { headers: { 'Authorization': `Bearer ${token}` } });
  return resp.data;
}

export async function createChurchRegion(payload: { name: string; parent_id?: number | null }) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const resp = await api.post(`/church-regions`, payload, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return resp.data;
}

export async function updateChurchRegion(id: number, payload: { name?: string; parent_id?: number | null }) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const resp = await api.patch(`/church-regions/${id}`, payload, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return resp.data;
}

export async function deleteChurchRegion(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No authentication token found.');
  const resp = await api.delete(`/church-regions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return resp.data;
}


