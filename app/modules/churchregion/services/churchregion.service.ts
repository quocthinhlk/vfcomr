import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';

// Auth and language headers come from the api interceptor. These calls used to
// set Authorization from AsyncStorage themselves, which overrode the
// interceptor's token choice and threw "No authentication token found" when
// the session token lived elsewhere (e.g. the dev test token).

export interface ChurchRegionItem {
  id: number;
  parent_id: number | null;
  left: number;
  right: number;
  name: string;
  logo_url?: string | null;
  created?: string;
  modified?: string;
}

export interface ListChurchRegionsResponse {
  success: boolean;
  data: {
    items: ChurchRegionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export type ChurchRegionPayload = {
  name: string;
  parent_id?: number | null;
  /** Required by the API on create ("" for no logo); omit on update to keep it. */
  logo_path?: string;
};

/** Every region, in tree order (the API returns a plain array). */
export async function listChurchRegions(_params: Record<string, any> = {}) {
  const response = await api.get(`/church-regions`);
  const raw = response.data as any;
  if (Array.isArray(raw?.data)) {
    const items = raw.data as ChurchRegionItem[];
    const normalized: ListChurchRegionsResponse = {
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
  return raw as ListChurchRegionsResponse;
}

export async function getChurchRegionById(id: number) {
  const resp = await api.get(`/church-regions/${id}`);
  return resp.data;
}

/** All regions under `id` (any depth); the API answers data: null for none. */
export async function getChurchRegionChildren(id: number): Promise<ChurchRegionItem[]> {
  const resp = await api.get(`/church-regions/${id}/children`);
  const data = resp.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function getChurchRegionHierarchy() {
  const resp = await api.get(`/church-regions/hierarchy`);
  return resp.data;
}

export async function createChurchRegion(payload: ChurchRegionPayload) {
  const resp = await api.post(`/church-regions`, {logo_path: '', ...payload});
  return resp.data;
}

export async function updateChurchRegion(id: number, payload: Partial<ChurchRegionPayload>) {
  const resp = await api.patch(`/church-regions/${id}`, payload);
  return resp.data;
}

export async function deleteChurchRegion(id: number) {
  const resp = await api.delete(`/church-regions/${id}`);
  return resp.data;
}

/** Upload a picked logo; returns the path to save as logo_path. */
export async function uploadChurchRegionLogo(imagePath: string, altText: string): Promise<string> {
  const form = new FormData();
  const fileName = imagePath.split('/').pop() || 'logo.jpg';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append('file', {uri: imagePath, name: fileName, type} as any);
  form.append('entity_type', 'all');
  form.append('alt_text', altText);
  const uploadRes = await api.post('images/upload', form, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  const path = uploadRes?.data?.data?.path;
  if (!path) {
    // No message: the screens show the translated "unexpected error" text.
    throw new Error('');
  }
  return path;
}
