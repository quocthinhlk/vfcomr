import api from '../../../config/api';
import {getChurchDetail} from '../../church/services/church.service';

export type WatchListSortBy = 'country_id' | 'id' | 'name';

export interface WatchListChurch {
  church_id: number;
  church_name: string;
}

export interface WatchListChurchRow extends WatchListChurch {
  country_name: string;
  city_name: string;
  pastor_name: string;
  is_mother_church: boolean;
  is_msc: boolean;
  enable_cpm: boolean;
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

const CHURCH_DETAIL_BATCH = 6;

function churchRowFromDetail(
  church: WatchListChurch,
  data: any,
): WatchListChurchRow {
  return {
    church_id: church.church_id,
    church_name: data?.name || church.church_name,
    country_name: data?.country_name || '',
    city_name: data?.city_name || data?.city || '',
    pastor_name: data?.pastor_name || '',
    is_mother_church: !!data?.is_mother_church,
    is_msc: !!data?.is_msc,
    enable_cpm: !!data?.enable_cpm,
  };
}

/** Watch list churches only include id and name. Fill in the columns the web table shows. */
export async function enrichWatchListChurches(
  churches: WatchListChurch[],
): Promise<WatchListChurchRow[]> {
  const ids = [...new Set(churches.map(church => church.church_id))];
  const details = new Map<number, any>();

  for (let index = 0; index < ids.length; index += CHURCH_DETAIL_BATCH) {
    const batch = ids.slice(index, index + CHURCH_DETAIL_BATCH);
    const results = await Promise.all(
      batch.map(async id => {
        try {
          return [id, await getChurchDetail(id)] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    results.forEach(([id, data]) => details.set(id, data));
  }

  return churches.map(church =>
    churchRowFromDetail(church, details.get(church.church_id)),
  );
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
