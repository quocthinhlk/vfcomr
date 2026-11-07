import type {
  CreateWorshipServicePayload,
  WorshipServiceItem,
} from '../services/worshipService.service';

type Translate = (key: any) => string;

/** Saved in English (the API takes any text); Monday first like the web. */
export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** The name column holds at most 255 characters ("Data too long" otherwise). */
export const WORSHIP_SERVICE_NAME_MAX = 255;

/** "monday" / " Sunday " → "Monday" / "Sunday"; anything else is kept as saved. */
export function canonicalDay(day?: string | null): string {
  const raw = (day ?? '').trim();
  const match = WEEK_DAYS.find(d => d.toLowerCase() === raw.toLowerCase());
  return match ?? raw;
}

/** Day in the app language (the list showed the English value). */
export function dayLabel(day: string | null | undefined, t: Translate): string {
  const canonical = canonicalDay(day);
  if ((WEEK_DAYS as readonly string[]).includes(canonical)) {
    return t(`weekDay${canonical}`) || canonical;
  }
  return canonical;
}

/**
 * Day choices. A record saved with another value (the API accepts any text)
 * keeps it as a choice, so opening Edit does not show an empty day.
 */
export function dayOptions(t: Translate, current?: string | null) {
  const options = WEEK_DAYS.map(d => ({label: dayLabel(d, t), value: d as string}));
  const saved = canonicalDay(current);
  if (saved && !options.some(o => o.value === saved)) {
    options.push({label: saved, value: saved});
  }
  return options;
}

/** "HH:mm[:ss]" → {hour, minute}, or null when it is not a time of day. */
export function parseTime(value?: string | null): {hour: number; minute: number} | null {
  const match = /^\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*$/.exec(value ?? '');
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return {hour, minute};
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "09:30:00" → "09:30"; other saved values are shown as they are. */
export function formatServiceTime(value?: string | null): string {
  const time = parseTime(value);
  if (time) {
    return `${pad(time.hour)}:${pad(time.minute)}`;
  }
  return (value ?? '').trim();
}

export type WorshipServiceValues = {
  name: string;
  dayName: string | null;
  time: string | null;
};

export type WorshipServiceErrors = Partial<Record<'name' | 'dayName' | 'time', string>>;

export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

/**
 * The API saves a blank-space name, and PATCH keeps the old value for an
 * empty field or saves an hour like "99:00:00", so everything is checked here.
 */
export function validateWorshipService(
  values: WorshipServiceValues,
  t: Translate,
): WorshipServiceErrors {
  const errors: WorshipServiceErrors = {};
  const name = cleanName(values.name);
  if (!name) {
    errors.name = t('required');
  } else if (name.length > WORSHIP_SERVICE_NAME_MAX) {
    errors.name = t('worshipServiceNameTooLong').replace(
      '{max}',
      String(WORSHIP_SERVICE_NAME_MAX),
    );
  }
  if (!canonicalDay(values.dayName)) {
    errors.dayName = t('required');
  }
  if (!parseTime(values.time)) {
    errors.time = t('required');
  }
  return errors;
}

export function buildWorshipServicePayload(
  values: WorshipServiceValues,
): CreateWorshipServicePayload {
  const time = parseTime(values.time);
  return {
    name: cleanName(values.name),
    day_name: canonicalDay(values.dayName),
    time: time ? `${pad(time.hour)}:${pad(time.minute)}:00` : '',
  };
}

/** Week order (Monday first, like the day picker), then time, then id. */
export function sortWorshipServices(items: WorshipServiceItem[]): WorshipServiceItem[] {
  const dayIndex = (d: string) => {
    const i = (WEEK_DAYS as readonly string[]).indexOf(canonicalDay(d));
    return i === -1 ? WEEK_DAYS.length : i;
  };
  return [...items].sort(
    (a, b) =>
      dayIndex(a.day_name) - dayIndex(b.day_name) ||
      formatServiceTime(a.time).localeCompare(formatServiceTime(b.time)) ||
      a.id - b.id,
  );
}
