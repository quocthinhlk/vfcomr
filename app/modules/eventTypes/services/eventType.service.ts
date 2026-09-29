import api from '../../../config/api';

export type EventMeetingType = 'attendance' | 'meeting_with';

export interface EventTypeItem {
  id: number;
  name: string;
  color: string;
  cell_color: string;
  meeting_type: EventMeetingType;
}

export function resolveEventMeetingType(
  meetingType?: string | null,
): EventMeetingType | null {
  if (meetingType === 'attendance' || meetingType === 'meeting_with') {
    return meetingType;
  }
  if (meetingType === 'Pastors List') {
    return 'meeting_with';
  }
  if (meetingType === 'Attendance' || meetingType === 'Both') {
    return 'attendance';
  }
  return null;
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
  meeting_type: EventMeetingType;
}

export interface UpdateEventTypePayload {
  name: string;
  color: string;
  cell_color: string;
  meeting_type: EventMeetingType;
}

export async function listEventTypes() {
  const response = await api.get<ListEventTypesResponse>(`/event-types`, {params: {sort_by: 'name', sort_desc: false}});
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

