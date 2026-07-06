import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';

export interface ResourceItem {
  id: number;
  name: string;
  description?: string;
  short_description?: string;
  graphic_url?: string;
  author_name?: string;
  author_pic?: string | null;
  reference_date?: string;
  language_id?: number | null;
  more_information?: string;
  resource_files?: ResourceFileItem[] | null;
  resource_weblinks?: ResourceWeblinkItem[] | null;
  type_id?: number | null;
  topic_id?: number | null;
}

export interface ResourceFileItem {
  id: number;
  resource_id: number;
  filename: string;
  part_no?: number;
  format_id?: number | null;
  path?: string;
  url?: string;
  created?: string;
  modified?: string;
}

export interface ResourceWeblinkItem {
  id: number;
  resource_id: number;
  title?: string;
  url?: string;
}

export interface ResourceTypeItem {
  id: number;
  name: string;
  description?: string;
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

const normalizeResourceItems = (payload: any): ResourceItem[] => {
  if (Array.isArray(payload)) {
    return payload as ResourceItem[];
  }
  if (Array.isArray(payload?.data)) {
    return payload.data as ResourceItem[];
  }
  if (Array.isArray(payload?.items)) {
    return payload.items as ResourceItem[];
  }
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items as ResourceItem[];
  }
  return [];
};

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

export async function getResources(params?: {
  typeId?: number | null;
  topicId?: number | null;
}): Promise<ResourceItem[]> {
  const authConfig = await getAuthHeaders();
  const typeId = params?.typeId;
  const topicId = params?.topicId;
  const hasFilters = typeof typeId === 'number' || typeof topicId === 'number';
  const query: Record<string, number> = hasFilters
    ? {}
    : {
        page: 1,
        limit: 200,
      };
  if (typeof typeId === 'number') {
    query.type_id = typeId;
  }
  if (typeof topicId === 'number') {
    query.topic_id = topicId;
  }
  const response = await api.get('/resources/', {
    ...authConfig,
    params: query,
  });
  return normalizeResourceItems(response?.data);
}

export async function getResourceTypes(): Promise<ResourceTypeItem[]> {
  const authConfig = await getAuthHeaders();
  const response = await api.get('resources/types', {
    ...authConfig,
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
  const authConfig = await getAuthHeaders();
  const normalizedName = (params?.name ?? '').trim();
  const response = await api.get('resources/categories', {
    ...authConfig,
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
      ...(normalizedName ? {name: normalizedName} : {}),
    },
  });
  return (response?.data?.data?.items ?? []) as ResourceCategoryItem[];
}

export async function getResourceFileFormats(): Promise<ResourceFileFormatItem[]> {
  const authConfig = await getAuthHeaders();
  const response = await api.get('resources/files/formats', authConfig);
  return (response?.data?.data ?? []) as ResourceFileFormatItem[];
}

export async function getResourceDetail(resourceId: number): Promise<ResourceItem | null> {
  const authConfig = await getAuthHeaders();
  const response = await api.get(`resources/${resourceId}`, authConfig);
  return (response?.data?.data ?? null) as ResourceItem | null;
}
