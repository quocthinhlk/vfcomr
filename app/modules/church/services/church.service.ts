import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddChurchPayload {
  name: string;
  short_name: string;
  is_msc: string;
  enable_cpm: string;
  parent_id: string;
  language_id: string;
  church_type_id: string;
  pastor_id: string;
  church_network_id: string;
  church_region_id: string;
  geographical_region_id: string;
  language_region_id: string;
  sensitive_nation: string;
  country_id: string;
  currency_id: string;
  city: string;
  photo_dir: string;
  service_address_street: string;
  service_address_postal_code: string;
  mailing_address_postal_code: string;
  office_address_street: string;
  office_address_postal_code: string;
  office_phone: string;
  office_fax: string;
  email_address: string;
  website: string;
  facebook: string;
  twitter: string;
  date_of_birth: Date | null;
}

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

export async function disableChurch(id: number) {
  try {
    // The endpoint rejects a request with no body ("Invalid request body"),
    // but accepts an empty JSON object.
    const response = await api.patch(`/churches/${id}/disable`, {});
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

export async function getChurchDetail(id: number): Promise<any> {
  try {
    const response = await api.get(`churches/${id}`);
    return response.data?.data;
  } catch (error) {
    console.error('Error fetching church detail:', error);
    throw error;
  }
}

export async function exportChurches() {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.get('churches?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting churches:', error);
    throw error;
  }
}

export interface ChurchSummary {
  id: number;
  parent_id: number | null;
  name: string;
}

export async function getChurchChildren(parentId: number): Promise<ChurchSummary[]> {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.get(`churches/${parentId}/children`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    // Response format example shows data: [ { id, name, children: [ ... ] } ]
    const rootArray = response.data?.data || [];
    if (Array.isArray(rootArray) && rootArray.length > 0) {
      const root = rootArray[0];
      const children = Array.isArray(root.children) ? root.children : [];
      return children.map((c: any) => ({ id: c.id, parent_id: c.parent_id ?? parentId, name: c.name }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching church children:', error);
    throw error;
  }
}

export async function deleteChurch(churchId: number): Promise<void> {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    await api.delete(`churches/${churchId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error('Error deleting church:', error);
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
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const normalizedParams: any = { ...params };
    if (typeof params.disabled === 'boolean') {
      normalizedParams.disabled = params.disabled; // let axios serialize as true/false without quotes
    }
    const response = await api.get('churches', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: normalizedParams,
    });
    const data = response.data?.data;
    return data as ChurchListData;
  } catch (error) {
    console.error('Error fetching churches list:', error);
    throw error;
  }
} 