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

/**
 * GET churches/{id} returns only `city_name`, not `city_id`: finds the id of
 * that city in the church's nation so Edit / Clone keep it selected. Null when
 * there is no exact (case-insensitive) match or the lookup fails.
 */
export async function findCityIdByName(
  countryId: number | string,
  cityName: string,
): Promise<number | null> {
  const wanted = cityName.trim().toLowerCase();
  if (!wanted || !countryId) {
    return null;
  }
  try {
    const res = await api.get(`cities/country/${countryId}`, {
      params: {sort_by: 'name', sort_desc: false},
    });
    const list: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
    const match = list.find(c => String(c?.name ?? '').trim().toLowerCase() === wanted);
    return match?.id != null ? Number(match.id) : null;
  } catch {
    return null;
  }
}
