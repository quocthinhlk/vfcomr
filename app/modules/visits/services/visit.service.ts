import api from '../../../config/api';

export interface VisitItem {
  id: number;
  user_id: number;
  church_id: number;
  year: number;
  week_number: number;
  number_of_days: number;
  Created: string;
  Modified: string;
}

export interface ListVisitsResponse {
  success: boolean;
  data: {
    items: VisitItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface GetVisitResponse {
  success: boolean;
  data: VisitItem;
  message: string;
}

export interface CreateVisitPayload {
  user_id: number;
  church_id: number;
  year: number;
  week_number: number;
  number_of_days: number;
}

export interface ListVisitsParams {
  church_id?: number;
  user_id?: number;
  year?: number;
  week_number?: number;
  page?: number;
  limit?: number;
}

export async function listVisits(params: ListVisitsParams = {}) {
  const response = await api.get<ListVisitsResponse>('/visits', {params});
  return response.data;
}

export async function getVisitById(id: number) {
  const response = await api.get<GetVisitResponse>(`/visits/${id}`);
  return response.data;
}

export async function createVisitsBulk(payloads: CreateVisitPayload[]) {
  try {
    const response = await api.post('/visits/bulk', payloads);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Create Visits failed';
    console.error('Create Visits error:', message);
    throw new Error(message);
  }
}

export async function deleteVisit(id: number) {
  try {
    const response = await api.delete(`/visits/${id}`);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Delete Visit failed';
    console.error('Delete Visit error:', message);
    throw new Error(message);
  }
}

