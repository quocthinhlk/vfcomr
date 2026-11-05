import type {EventMeetingType, EventTypeItem} from '../services/eventType.service';

export const EVENT_TYPE_NAME_MAX = 255;

/** The web's defaults for a new event type. */
export const DEFAULT_TEXT_COLOUR = '#19E7AD';
export const DEFAULT_CELL_COLOUR = '#BE19E7';

/** The web's colour swatches. */
export const COLOUR_SWATCHES = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#FFFFFF',
  '#FF4D4F', '#FF7A45', '#FA8C16', '#F9A825', '#FADB14', '#A0D911', '#52C41A', '#19E7AD',
  '#13C2C2', '#1677FF', '#3E76C8', '#2F54EB', '#722ED1', '#BE19E7', '#EB2F96', '#F759AB',
];

/**
 * "#abc", "abc", "#aabbcc" → "#AABBCC"; null when it is not a hex colour.
 * The web saves #RRGGBB in capitals; the API itself accepts anything ("red", "zzz").
 */
export function normalizeHex(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map(c => c + c).join('')}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw}`.toUpperCase();
  }
  return null;
}

/**
 * A colour that is safe to put in a style. A bad saved value ("zzz") made
 * React Native log "is not a valid color" and drew nothing.
 */
export function safeColor(value: string | null | undefined): string | undefined {
  return normalizeHex(value) ?? undefined;
}

/**
 * Saved meeting type → form value, as the web reads it ("1-1" and
 * "Pastors List" are old names for meeting_with). Anything else is left for
 * the user to choose instead of being turned into "attendance" silently.
 */
export function strictMeetingType(value: string | null | undefined): EventMeetingType | null {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'meeting_with' || v === '1-1' || v === 'pastors list') {
    return 'meeting_with';
  }
  if (v === 'attendance') {
    return 'attendance';
  }
  return null;
}

export type EventTypeFormValues = {
  name: string;
  color: string;
  cellColor: string;
  meetingType: EventMeetingType | null;
};

export type EventTypeFormError = 'required' | 'tooLong' | 'invalidColor' | 'duplicate';
export type EventTypeFormErrors = Partial<Record<keyof EventTypeFormValues, EventTypeFormError>>;

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * All fields required (as on the web), colours must be hex, and the name must
 * not repeat another event type's (the API saves duplicates and blank names).
 */
export function validateEventTypeForm(
  values: EventTypeFormValues,
  existing: Pick<EventTypeItem, 'id' | 'name'>[] = [],
  selfId?: number,
): EventTypeFormErrors {
  const errors: EventTypeFormErrors = {};
  const name = values.name.trim();
  if (!name) {
    errors.name = 'required';
  } else if (name.length > EVENT_TYPE_NAME_MAX) {
    errors.name = 'tooLong';
  } else if (existing.some(e => e.id !== selfId && sameName(e.name, name))) {
    errors.name = 'duplicate';
  }
  if (!values.color.trim()) {
    errors.color = 'required';
  } else if (!normalizeHex(values.color)) {
    errors.color = 'invalidColor';
  }
  if (!values.cellColor.trim()) {
    errors.cellColor = 'required';
  } else if (!normalizeHex(values.cellColor)) {
    errors.cellColor = 'invalidColor';
  }
  if (!values.meetingType) {
    errors.meetingType = 'required';
  }
  return errors;
}

export function buildEventTypePayload(values: EventTypeFormValues) {
  return {
    name: values.name.trim().replace(/\s+/g, ' '),
    color: normalizeHex(values.color) as string,
    cell_color: normalizeHex(values.cellColor) as string,
    meeting_type: values.meetingType as EventMeetingType,
  };
}
