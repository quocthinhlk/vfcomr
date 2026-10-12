import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CountryItem {
  id: number;
  name: string;
}

export interface ListCountriesResponse {
  success: boolean;
  data: {
    items: CountryItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface ListCountriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function listCountries(params: ListCountriesParams = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const name = params.search ?? '';

  const response = await api.get<ListCountriesResponse>(`/countries`, {
    params: { page, limit, name },
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface GetCountryResponse {
  success: boolean;
  data: CountryItem;
  message: string;
}

export async function getCountryById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.get<GetCountryResponse>(`/countries/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface CreateCountryPayload { name: string }

export async function createCountry(payload: CreateCountryPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.post(`/countries`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Create country failed';
    console.error('Create country error:', message);
    throw new Error(message);
  }
}

export interface UpdateCountryPayload {
  name: string;
}

export async function updateCountry(id: number, payload: UpdateCountryPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.patch(`/countries/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function deleteCountry(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.delete(`/countries/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
} 