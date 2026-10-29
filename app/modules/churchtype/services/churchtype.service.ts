import api from '../../../config/api';

export interface ChurchTypeItem {
  id: number;
  name: string;
}

export interface GetChurchTypeResponse {
  success: boolean;
  data: ChurchTypeItem;
  message: string;
}

export interface ChurchTypePayload {
  name: string;
}

/**
 * GET church-types: every church type (the API has no paging or search; it
 * ignores page / limit / search), so the list screen pages and searches locally.
 */
export async function listChurchTypes(): Promise<ChurchTypeItem[]> {
  const response = await api.get('church-types');
  const data = (response.data as any)?.data;
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return list
    .map(item => ({id: Number(item?.id), name: String(item?.name ?? '')}))
    .filter(item => Number.isFinite(item.id));
}

export async function getChurchTypeById(id: number) {
  const response = await api.get<GetChurchTypeResponse>(`church-types/${id}`);
  return response.data;
}

/** POST church-types. The API answers without the new id. */
export async function createChurchType(payload: ChurchTypePayload) {
  const response = await api.post('church-types', payload);
  return response.data;
}

export async function updateChurchType(id: number, payload: ChurchTypePayload) {
  const response = await api.patch(`church-types/${id}`, payload);
  return response.data;
}

/**
 * DELETE church-types/:id. Churches of this type are left without a type
 * (the API clears it), so the confirmation screen warns about that.
 */
export async function deleteChurchType(id: number) {
  const response = await api.delete(`church-types/${id}`);
  return response.data;
}
