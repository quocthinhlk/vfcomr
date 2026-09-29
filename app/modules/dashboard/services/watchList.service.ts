import api from '../../../config/api';

export type WatchListSortBy = 'country_id' | 'id' | 'name';

export interface WatchListChurch {
  church_id: number;
  church_name: string;
}

export interface WatchListItem {
  id: number;
  name: string;
  user_id: number;
  sort_by: string;
  sortlist: string | null;
  churches: WatchListChurch[];
}

export interface WatchListPayload {
  name: string;
  sort_by: WatchListSortBy;
  sortlist: string;
  church_ids: number[];
}

interface WatchListsResponse {
  success: boolean;
  data: WatchListItem[];
  message: string;
}

interface WatchListResponse {
  success: boolean;
  data: WatchListItem;
  message: string;
}

interface MutationResponse {
  success: boolean;
  data?: unknown;
  message: string;
}

export async function listWatchLists(): Promise<WatchListsResponse> {
  const response = await api.get<WatchListsResponse>('/watchlists');
  return response.data;
}

export async function getWatchList(id: number): Promise<WatchListResponse> {
  const response = await api.get<WatchListResponse>(`/watchlists/${id}`);
  return response.data;
}

export async function createWatchList(
  payload: WatchListPayload,
): Promise<WatchListResponse> {
  const response = await api.post<WatchListResponse>('/watchlists', payload);
  return response.data;
}

export async function updateWatchList(
  id: number,
  payload: WatchListPayload,
): Promise<WatchListResponse> {
  const response = await api.patch<WatchListResponse>(
    `/watchlists/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteWatchList(id: number): Promise<MutationResponse> {
  const response = await api.delete<MutationResponse>(`/watchlists/${id}`);
  return response.data;
}

export async function addChurchesToWatchList(
  id: number,
  churchIds: number[],
): Promise<MutationResponse> {
  const response = await api.post<MutationResponse>(
    `/watchlists/${id}/churches`,
    {church_ids: churchIds},
  );
  return response.data;
}

export async function removeChurchFromWatchList(
  watchListId: number,
  churchId: number,
): Promise<MutationResponse> {
  const response = await api.delete<MutationResponse>(
    `/watchlists/${watchListId}/churches/${churchId}`,
  );
  return response.data;
}
