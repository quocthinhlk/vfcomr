/**
 * Helpers shared by the church forms (add, edit, clone, new pastor & church).
 */

const pad2 = (value: number) => String(value).padStart(2, '0');

/**
 * Local calendar date → "YYYY-MM-DD" (what the API stores for date_of_birth).
 * Never use toISOString() for this: it converts to UTC, so a date picked at
 * local midnight east of UTC (e.g. Vietnam, UTC+7) is sent as the previous day.
 */
export function formatYmd(date: Date | null | undefined): string | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * API date ("YYYY-MM-DD", or an ISO date-time) → Date at local midnight of that
 * calendar day. `new Date("2023-01-01")` is UTC midnight, which is still
 * 31 December west of UTC (e.g. Brazil), so the day would shift — and a form
 * that saves it back with local getters would move the birthday a day earlier
 * on every save.
 */
export function parseYmd(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Splits API validation errors (`errors: {field: message}`) into the ones the
 * form shows next to a field and the rest, which must be shown in an alert —
 * otherwise Save looks like it did nothing.
 */
export function splitApiFieldErrors(
  apiErrors: unknown,
  shownKeys: ReadonlySet<string>,
  keyPrefix = '',
): {fieldErrors: Record<string, string>; otherMessages: string[]} {
  const fieldErrors: Record<string, string> = {};
  const otherMessages: string[] = [];
  if (!apiErrors || typeof apiErrors !== 'object') {
    return {fieldErrors, otherMessages};
  }
  Object.entries(apiErrors as Record<string, unknown>).forEach(([rawKey, value]) => {
    const message = Array.isArray(value)
      ? value.map(item => String(item).trim()).filter(Boolean).join('\n')
      : typeof value === 'string'
        ? value.trim()
        : '';
    if (!message) {
      return;
    }
    const key = keyPrefix && rawKey.startsWith(keyPrefix) ? rawKey.slice(keyPrefix.length) : rawKey;
    if (shownKeys.has(key)) {
      fieldErrors[key] = message;
    } else {
      otherMessages.push(message);
    }
  });
  return {fieldErrors, otherMessages};
}

/** "{field}" placeholder replacement for translated templates. */
export function fillTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    params[key] != null ? params[key] : match,
  );
}
