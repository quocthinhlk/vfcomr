import api from '../../../config/api';

export interface CreateCityPayload {
  name: string;
  country_id: number;
}

export interface CityItem {
  id: number;
  name: string;
  country_id?: number;
}

/**
 * POST /cities. Errors keep the API response and carry the API's message only
 * (empty otherwise), so screens fall back to their translated text.
 */
export async function createCity(payload: CreateCityPayload): Promise<CityItem> {
  try {
    const response = await api.post('/cities', payload);
    const body = response.data as any;
    const city = body?.data ?? body;
    if (!city?.id) {
      throw new Error(typeof body?.message === 'string' ? body.message : '');
    }
    return city as CityItem;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || '';
    console.error('Create city error:', message);
    const error = new Error(message) as Error & {response?: any};
    error.response = err?.response;
    throw error;
  }
}
