import api from '../../../config/api';
import {
  getApiErrorMessage,
  logApiError,
} from '../../../shared/utils/apiErrorHandler';

const RESOURCE_STORAGE_HOST = 'https://tintran.cloud-ip.cc/storage';

export interface ResourceListItem {
  id: number;
  parent_id: number | null;
  name: string;
  short_description: string | null;
  graphic_path: string | null;
  available_languages: string[];
  sort_order: number;
}

export interface ResourceFileItem {
  id: number;
  resource_id: number;
  filename: string;
  part_no: number;
  format_id: number | null;
  sort_order: number;
  path: string;
  url: string;
  created: string;
  modified: string;
  is_ai_translated: boolean;
  lang: string;
}

export interface ResourceDetailItem extends ResourceListItem {
  files: ResourceFileItem[] | null;
  children: ResourceListItem[] | null;
}

export interface ResourceFileFormatItem {
  id: number;
  name: string;
  description: string | null;
}

export interface ListResourcesParams {
  name?: string;
  parent_id?: number | number[];
  root_only?: boolean;
}

export interface CreateResourcePayload {
  name: string;
  parent_id: number | null;
  short_description: string | null;
  graphic_path: string | null;
  available_languages: string[];
  sort_order: number;
  file_ids: number[];
  child_ids: number[];
}

export type UpdateResourcePayload = CreateResourcePayload;

export interface CreateResourceResponse {
  success: boolean;
  data: {resource_id: number};
  message: string;
}

export interface ListResourcesResponse {
  success: boolean;
  data: ResourceListItem[];
  message: string;
}

export interface GetResourceResponse {
  success: boolean;
  data: ResourceDetailItem;
  message: string;
}

export interface ResourceMutationResponse {
  success: boolean;
  data?: unknown;
  message: string;
}

export interface ListResourceFileFormatsResponse {
  success: boolean;
  data: ResourceFileFormatItem[];
  message: string;
}

export interface FileOrderItem {
  file_id: number;
  sort_order: number;
}

export interface ChildOrderItem {
  resource_id: number;
  sort_order: number;
}

export interface UpdateResourceFilePayload {
  filename: string;
  part_no: number;
  lang: string;
  /**
   * Whether this file is AI translated.
   * API expects a truthy flag (1/0 or \"1\"/\"0\"), see Postman:
   * POST /api/v1/resources/files/upload -> is_ai_translated: Text(1|0)
   */
  is_ai_translated: boolean | number | string;
}

export interface UploadResourceFileInput {
  uri: string;
  type?: string;
  name?: string;
  resourceId: number;
  formatId: number;
  partNo: number;
  lang: string;
  isAiTranslated: boolean;
}

function throwApiError(error: unknown, fallback: string): never {
  logApiError(error, 'resources');
  throw new Error(getApiErrorMessage(error) || fallback);
}

function normalizeResourceList(payload: unknown): ResourceListItem[] {
  if (Array.isArray(payload)) {
    return payload as ResourceListItem[];
  }
  if (payload && typeof payload === 'object') {
    const data = (payload as {data?: unknown}).data;
    if (Array.isArray(data)) {
      return data as ResourceListItem[];
    }
    if (data && typeof data === 'object') {
      const items = (data as {items?: unknown}).items;
      if (Array.isArray(items)) {
        return items as ResourceListItem[];
      }
    }
  }
  return [];
}

export function resolveResourceMediaUrl(pathOrUrl?: string | null): string {
  const raw = (pathOrUrl ?? '').trim();
  if (!raw) {
    return '';
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `${RESOURCE_STORAGE_HOST}/${raw.replace(/^\/+/, '')}`;
}

function buildListQuery(params: ListResourcesParams = {}): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  const name = (params.name ?? '').trim();
  if (name) {
    query.name = name;
  }
  if (params.root_only) {
    query.root_only = true;
  }
  if (typeof params.parent_id === 'number') {
    query.parent_id = params.parent_id;
  } else if (Array.isArray(params.parent_id) && params.parent_id.length > 0) {
    query.parent_id = params.parent_id;
  }
  return query;
}

export async function listResources(
  params: ListResourcesParams = {},
): Promise<ListResourcesResponse> {
  try {
    const response = await api.get<ListResourcesResponse>('/resources/', {
      params: buildListQuery(params),
      paramsSerializer: {indexes: null},
    });
    return {
      success: response.data?.success ?? true,
      data: normalizeResourceList(response.data),
      message: response.data?.message ?? '',
    };
  } catch (error) {
    throwApiError(error, 'List resources failed');
  }
}

export async function getResourceById(id: number): Promise<GetResourceResponse> {
  try {
    const response = await api.get<GetResourceResponse>(`/resources/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'Get resource failed');
  }
}

export async function createResource(
  payload: CreateResourcePayload,
): Promise<CreateResourceResponse> {
  try {
    const response = await api.post<CreateResourceResponse>(
      '/resources/',
      payload,
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Create resource failed');
  }
}

export async function updateResource(
  id: number,
  payload: UpdateResourcePayload,
): Promise<ResourceMutationResponse> {
  try {
    const response = await api.patch<ResourceMutationResponse>(
      `/resources/${id}`,
      payload,
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Update resource failed');
  }
}

export async function deleteResource(
  id: number,
): Promise<ResourceMutationResponse> {
  try {
    const response = await api.delete<ResourceMutationResponse>(
      `/resources/${id}`,
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Delete resource failed');
  }
}

export async function reorderResourceFiles(
  resourceId: number,
  fileOrders: FileOrderItem[],
): Promise<ResourceMutationResponse> {
  try {
    const response = await api.put<ResourceMutationResponse>(
      `/resources/${resourceId}/files/reorder`,
      {file_orders: fileOrders},
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Reorder resource files failed');
  }
}

export async function reorderResourceChildren(
  resourceId: number,
  childOrders: ChildOrderItem[],
): Promise<ResourceMutationResponse> {
  try {
    const response = await api.put<ResourceMutationResponse>(
      `/resources/${resourceId}/children/reorder`,
      {child_orders: childOrders},
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Reorder child resources failed');
  }
}

export async function listResourceFileFormats(): Promise<ListResourceFileFormatsResponse> {
  try {
    const response = await api.get<ListResourceFileFormatsResponse>(
      '/resources/formats',
    );
    const payload = response.data?.data;
    const formats = Array.isArray(payload)
      ? payload
      : [];
    return {
      success: response.data?.success ?? true,
      data: formats,
      message: response.data?.message ?? '',
    };
  } catch (error) {
    throwApiError(error, 'Get file formats failed');
  }
}

export async function uploadResourceFile(
  input: UploadResourceFileInput,
): Promise<ResourceMutationResponse> {
  const formData = new FormData();
  const fileName = input.name || input.uri.split('/').pop() || 'resource-file';
  formData.append('file', {
    uri: input.uri,
    type: input.type || 'application/octet-stream',
    name: fileName,
  } as any);
  formData.append('resource_id', String(input.resourceId));
  formData.append('format_id', String(input.formatId));
  formData.append('part_no', String(input.partNo));
  // API (Postman) uses Text field is_ai_translated with \"1\" or \"0\"
  formData.append('is_ai_translated', input.isAiTranslated ? '1' : '0');
  formData.append('lang', input.lang);

  try {
    const response = await api.post<ResourceMutationResponse>(
      '/resources/files/upload',
      formData,
      {headers: {'Content-Type': 'multipart/form-data'}},
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Upload resource file failed');
  }
}

export async function updateResourceFile(
  fileId: number,
  payload: UpdateResourceFilePayload,
): Promise<ResourceMutationResponse> {
  try {
    const body: UpdateResourceFilePayload & {is_ai_translated: number | string} = {
      ...payload,
      // Normalise bool -> 1/0 like the upload endpoint
      is_ai_translated:
        typeof payload.is_ai_translated === 'boolean'
          ? payload.is_ai_translated
            ? 1
            : 0
          : payload.is_ai_translated,
    };
    const response = await api.patch<ResourceMutationResponse>(
      `/resources/files/${fileId}`,
      body,
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Update resource file failed');
  }
}

export async function deleteResourceFile(
  fileId: number,
): Promise<ResourceMutationResponse> {
  try {
    const response = await api.delete<ResourceMutationResponse>(
      `/resources/files/${fileId}`,
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'Delete resource file failed');
  }
}
