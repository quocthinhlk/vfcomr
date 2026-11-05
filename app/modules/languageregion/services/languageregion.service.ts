import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';

// Auth and language headers come from the api interceptor. These calls used to
// read the token from AsyncStorage themselves, which overrode the
// interceptor's choice and threw "No authentication token found" when the
// session token lived elsewhere (e.g. the dev test token).

export const LANGUAGE_REGION_NAME_MAX = 255;

export interface LanguageRegionItem {
  id: number;
  name: string;
  parent_id: number | null;
  disabled: boolean;
}

export interface ListLanguageRegionsResponse {
  success: boolean;
  data: {
    items: LanguageRegionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

/** Every language region (the API returns a plain array). */
export async function listLanguageRegions() {
  const response = await api.get(`/language-regions`);
  const raw = response.data as any;
  if (Array.isArray(raw?.data)) {
    const items = raw.data as LanguageRegionItem[];
    const normalized: ListLanguageRegionsResponse = {
      success: !!raw.success,
      data: {
        items,
        total: items.length,
        page: 1,
        limit: items.length || DEFAULT_PAGE_LIMIT,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
      message: raw?.message ?? 'OK',
    };
    return normalized;
  }
  return raw as ListLanguageRegionsResponse;
}

export interface GetLanguageRegionResponse {
  success: boolean;
  data: LanguageRegionItem;
  message: string;
}

export async function getLanguageRegionById(id: number) {
  const response = await api.get<GetLanguageRegionResponse>(`/language-regions/${id}`);
  return response.data;
}

export interface CreateLanguageRegionPayload {
  name: string;
  parent_id?: number | null;
  disabled?: boolean;
}

export async function createLanguageRegion(payload: CreateLanguageRegionPayload) {
  const response = await api.post(`/language-regions`, payload);
  return response.data;
}

export interface UpdateLanguageRegionPayload {
  name: string;
  parent_id?: number | null;
  disabled?: boolean;
}

export async function updateLanguageRegion(id: number, payload: UpdateLanguageRegionPayload) {
  const response = await api.patch(`/language-regions/${id}`, payload);
  return response.data;
}

export async function deleteLanguageRegion(id: number) {
  const response = await api.delete(`/language-regions/${id}`);
  return response.data;
}
