import api from '../../../config/api';

export type EventMeetingType = 'attendance' | 'meeting_with';

export interface EventTypeItem {
  id: number;
  name: string;
  color: string;
  cell_color: string;
  meeting_type: EventMeetingType;
}

/**
 * Meeting type for the visit forms (attendance or "meeting with" fields).
 * Case-insensitive, with the web's old names ("1-1", "Pastors List"); "Both"
 * falls back to attendance so those forms always show an input.
 */
export function resolveEventMeetingType(
  meetingType?: string | null,
): EventMeetingType | null {
  const v = String(meetingType ?? '').trim().toLowerCase();
  if (v === 'meeting_with' || v === '1-1' || v === 'pastors list') {
    return 'meeting_with';
  }
  if (v === 'attendance' || v === 'both') {
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
  // Errors are passed on as they are, so screens can read the API's answer.
  const response = await api.post(`/event-types`, payload);
  return response.data;
}

export async function updateEventType(id: number, payload: UpdateEventTypePayload) {
  const response = await api.patch(`/event-types/${id}`, payload);
  return response.data;
}

export async function deleteEventType(id: number) {
  const response = await api.delete(`/event-types/${id}`);
  return response.data;
}


const EVENTS_PAGE = 2000;

/**
 * Whether any event still uses this type. The API deletes a type in use and
 * leaves its events without a type (and without report colours); it cannot
 * filter events by type, so pages are scanned until one is found.
 */
export async function isEventTypeInUse(id: number): Promise<boolean> {
  for (let page = 1; page <= 50; page++) {
    const res = await api.get('/events', {params: {page, limit: EVENTS_PAGE}});
    const data = res?.data?.data;
    const items: {event_type_id?: number}[] = data?.items ?? [];
    if (items.some(e => e.event_type_id === id)) {
      return true;
    }
    if (!data?.has_next || items.length === 0) {
      return false;
    }
  }
  return false;
}
