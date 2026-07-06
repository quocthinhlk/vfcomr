import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CreateCityPayload {
  name: string;
  country_id: number;
}

export interface CityItem {
  id: number;
  name: string;
  country_id?: number;
}

export async function createCity(payload: CreateCityPayload): Promise<CityItem> {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }

  try {
    const response = await api.post('/cities', payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const body = response.data as any;
    const city = body?.data ?? body;
    if (!city?.id) {
      throw new Error(body?.message || 'Failed to create city.');
    }
    return city as CityItem;
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || 'Failed to create city.';
    console.error('Create city error:', message);
    const error = new Error(message) as Error & {response?: any};
    error.response = err?.response;
    throw error;
  }
}
