import api from '../../../config/api';

/** Body of POST /churches (field names as in the API: city_id, numeric ids, booleans, 'YYYY-MM-DD'). */
export type AddChurchPayload = Record<string, unknown>;

export async function addChurch(payload: AddChurchPayload) {
  try {
    const response = await api.post('/churches', payload);
    return response.data;
  } catch (error) {
    console.error('Error adding church:', error);
    throw error;
  }
}

export async function updateChurch(id: number, payload: any) {
  try {
    const response = await api.patch(`/churches/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating church:', error);
    throw error;
  }
}

export async function disableChurch(id: number, disabledReason: string) {
  try {
    // Stored on the church as `disabled_reason` (shown when it is re-enabled).
    const response = await api.patch(`/churches/${id}/disable`, {
      disabled_reason: disabledReason.trim(),
    });
    return response.data;
  } catch (error) {
    console.error('Error disabling church:', error);
    throw error;
  }
}

export async function enableChurch(id: number) {
  try {
    const response = await api.patch(`/churches/${id}/enable`);
    return response.data;
  } catch (error) {
    console.error('Error enabling church:', error);
    throw error;
  }
}

export async function updateChurchLocation(
  id: number,
  latitude: number,
  longitude: number,
) {
  try {
    const response = await api.patch(`/churches/${id}`, {
      latitude,
      longitude,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating church location:', error);
    throw error;
  }
}

/** Clears the church's OMR map location (coordinates). */
export async function removeChurchLocation(id: number) {
  try {
    const response = await api.delete(`/churches/${id}/map-location`);
    return response.data;
  } catch (error) {
    console.error('Error removing church location:', error);
    throw error;
  }
}

export async function getChurchDetail(id: number): Promise<any> {
  try {
    const response = await api.get(`churches/${id}`);
    return response.data?.data;
  } catch (error) {
    console.error('Error fetching church detail:', error);
    throw error;
  }
}

export interface ChurchListItem {
  id: number;
  name: string;
  short_name: string;
  is_mother_church: boolean;
  is_msc?: boolean;
  city: string | null;
  photo: string | null;
  photo_url?: string | null;
  date_of_birth: string | null;
  pastor_name: string | null;
  country_name: string | null;
  disabled: boolean;
  created: string;
  modified: string;
}

export interface ChurchListData {
  items: ChurchListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ChurchListParams {
  search?: string;
  country_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_desc?: boolean;
  disabled?: boolean;
}

export async function getChurchesList(params: ChurchListParams): Promise<ChurchListData> {
  try {
    const response = await api.get('churches', {params});
    return response.data?.data as ChurchListData;
  } catch (error) {
    console.error('Error fetching churches list:', error);
    throw error;
  }
}
