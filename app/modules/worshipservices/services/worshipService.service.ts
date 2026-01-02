import api from '../../../config/api';

export interface WorshipServiceItem {
  id: number;
  church_id: number;
  name: string;
  day_name: string;
  time: string;
  created: string;
}

export interface ListWorshipServicesResponse {
  success: boolean;
  data: WorshipServiceItem[];
  message: string;
}

export interface GetWorshipServiceResponse {
  success: boolean;
  data: WorshipServiceItem;
  message: string;
}

export interface CreateWorshipServicePayload {
  name: string;
  day_name: string;
  time: string; // format: "HH:mm:ss"
}

export interface UpdateWorshipServicePayload {
  name: string;
  day_name: string;
  time: string; // format: "HH:mm:ss"
}

export async function listWorshipServicesByChurch(churchId: number) {
  const response = await api.get<ListWorshipServicesResponse>(`/worship-services/churches/${churchId}`);
  return response.data;
}

export async function getWorshipServiceById(id: number) {
  const response = await api.get<GetWorshipServiceResponse>(`/worship-services/${id}`);
  return response.data;
}

export async function createWorshipService(churchId: number, payload: CreateWorshipServicePayload) {
  try {
    const response = await api.post(`/worship-services/churches/${churchId}`, payload);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Create Worship Service failed';
    console.error('Create Worship Service error:', message);
    throw new Error(message);
  }
}

export async function updateWorshipService(id: number, payload: UpdateWorshipServicePayload) {
  try {
    const response = await api.patch(`/worship-services/${id}`, payload);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Update Worship Service failed';
    console.error('Update Worship Service error:', message);
    throw new Error(message);
  }
}

export async function deleteWorshipService(id: number) {
  try {
    const response = await api.delete(`/worship-services/${id}`);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Delete Worship Service failed';
    console.error('Delete Worship Service error:', message);
    throw new Error(message);
  }
}
