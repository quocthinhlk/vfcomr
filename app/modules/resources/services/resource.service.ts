import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ResourceItem {
  id: number;
  name: string;
  description?: string;
  short_description?: string;
  type_id?: number | null;
  topic_id?: number | null;
}

export interface ResourceTypeItem {
  id: number;
  name: string;
}

export interface ResourceCategoryItem {
  id: number;
  name: string;
}

export interface ResourceFileFormatItem {
  id: number;
  name: string;
  description?: string | null;
}

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

export async function getResources(): Promise<ResourceItem[]> {
  const headers = await getAuthHeaders();
  const response = await api.get('resources', {
    headers,
    params: {
      page: 1,
      limit: 200,
    },
  });
  const payload = response?.data?.data;
  if (Array.isArray(payload)) {
    return payload as ResourceItem[];
  }
  if (Array.isArray(payload?.items)) {
    return payload.items as ResourceItem[];
  }
  return [];
}

export async function getResourceTypes(): Promise<ResourceTypeItem[]> {
  const headers = await getAuthHeaders();
  const response = await api.get('resources/types', {
    headers,
    params: {
      page: 1,
      limit: 200,
    },
  });
  const payload = response?.data?.data;
  if (Array.isArray(payload)) {
    return payload as ResourceTypeItem[];
  }
  if (Array.isArray(payload?.items)) {
    return payload.items as ResourceTypeItem[];
  }
  return [];
}

export async function getResourceCategories(params?: {
  limit?: number;
  page?: number;
  name?: string;
}): Promise<ResourceCategoryItem[]> {
  const headers = await getAuthHeaders();
  const normalizedName = (params?.name ?? '').trim();
  const response = await api.get('resources/categories', {
    headers,
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
      ...(normalizedName ? {name: normalizedName} : {}),
    },
  });
  return (response?.data?.data?.items ?? []) as ResourceCategoryItem[];
}

export async function getResourceFileFormats(): Promise<ResourceFileFormatItem[]> {
  const headers = await getAuthHeaders();
  const response = await api.get('resources/files/formats', {headers});
  return (response?.data?.data ?? []) as ResourceFileFormatItem[];
}

export async function getResourceDetail(resourceId: number): Promise<ResourceItem | null> {
  const headers = await getAuthHeaders();
  const response = await api.get(`resources/${resourceId}`, {headers});
  return (response?.data?.data ?? null) as ResourceItem | null;
}
