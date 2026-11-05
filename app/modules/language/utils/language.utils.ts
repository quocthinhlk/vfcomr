import {LANGUAGE_NAME_MAX, LanguageItem} from '../services/language.service';

export type LanguageNameError = 'required' | 'tooLong' | 'duplicate';

const normalize = (s: string | null | undefined) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** The name as saved: trimmed, inner runs of spaces collapsed. */
export function cleanLanguageName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Required (the API saves a name of spaces), at most 255 characters (SQL
 * error above), and not another language's name: create is checked by the
 * API (case-insensitive) but update is not.
 */
export function validateLanguageName(
  name: string,
  existing: LanguageItem[] = [],
  selfId?: number,
): LanguageNameError | null {
  const cleaned = cleanLanguageName(name);
  if (!cleaned) {
    return 'required';
  }
  if (cleaned.length > LANGUAGE_NAME_MAX) {
    return 'tooLong';
  }
  const lower = cleaned.toLowerCase();
  if (existing.some(l => l.id !== selfId && cleanLanguageName(l.name).toLowerCase() === lower)) {
    return 'duplicate';
  }
  return null;
}

/** Search anywhere in the name, ignoring case and accents ("portu" finds Português). */
export function filterLanguages(items: LanguageItem[], query: string): LanguageItem[] {
  const q = normalize(query);
  return q ? items.filter(l => normalize(l.name).includes(q)) : items;
}

/** "Language name already exists" from POST, so it shows under the field. */
export function isDuplicateNameError(error: any): boolean {
  return /already exists/i.test(String(error?.response?.data?.message ?? error?.message ?? ''));
}
