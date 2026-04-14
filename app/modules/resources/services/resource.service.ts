import api from '../../../config/api';

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

export async function getResources(params?: {
  typeId?: number | null;
  topicId?: number | null;
}): Promise<ResourceItem[]> {
  const typeId = params?.typeId;
  const topicId = params?.topicId;
  const query: Record<string, number> = {};
  if (typeof typeId === 'number') {
    query.type_id = typeId;
  }
  if (typeof topicId === 'number') {
    query.topic_id = topicId;
  }
  const response = await api.get('resources', {
    ...(Object.keys(query).length > 0 ? {params: query} : {}),
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
  const response = await api.get('resources/types', {
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
  const normalizedName = (params?.name ?? '').trim();
  const response = await api.get('resources/categories', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
      ...(normalizedName ? {name: normalizedName} : {}),
    },
  });
  return (response?.data?.data?.items ?? []) as ResourceCategoryItem[];
}

export async function getResourceFileFormats(): Promise<ResourceFileFormatItem[]> {
  const response = await api.get('resources/files/formats');
  return (response?.data?.data ?? []) as ResourceFileFormatItem[];
}

export async function getResourceDetail(resourceId: number): Promise<ResourceItem | null> {
  const response = await api.get(`resources/${resourceId}`);
  return (response?.data?.data ?? null) as ResourceItem | null;
}
