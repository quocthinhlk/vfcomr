import api from '../../../config/api';

export interface EventTypeItem {
  id: number;
  name: string;
  color: string;
  cell_color: string;
  meeting_type: 'Pastors List' | 'Attendance' | 'Both';
}

export interface ListEventTypesResponse {
  success: boolean;
  data: EventTypeItem[];
  message: string;
}

export interface GetEventTypeResponse {
  success: boolean;
  data: EventTypeItem;
  message: string;
}

export interface CreateEventTypePayload {
  name: string;
  color: string;
  cell_color: string;
  meeting_type: 'Pastors List' | 'Attendance';
}

export interface UpdateEventTypePayload {
  name: string;
  color: string;
  cell_color: string;
  meeting_type: 'Pastors List' | 'Attendance' | 'Both';
}

export async function listEventTypes() {
  const response = await api.get<ListEventTypesResponse>(`/event-types`);
  return response.data;
}

export async function getEventTypeById(id: number) {
  const response = await api.get<GetEventTypeResponse>(`/event-types/${id}`);
  return response.data;
}

export async function createEventType(payload: CreateEventTypePayload) {
  try {
    const response = await api.post(`/event-types`, payload);
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Create Event Type failed';
    console.error('Create Event Type error:', message);
    throw new Error(message);
  }
}

export async function updateEventType(id: number, payload: UpdateEventTypePayload) {
  const response = await api.patch(`/event-types/${id}`, payload);
  return response.data;
}

export async function deleteEventType(id: number) {
  const response = await api.delete(`/event-types/${id}`);
  return response.data;
}

