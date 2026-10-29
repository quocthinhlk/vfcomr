import type {ChurchTypeItem} from '../services/churchtype.service';

/** The API's column size: longer names fail with a server error (500). */
export const MAX_CHURCH_TYPE_NAME_LENGTH = 255;

/** Name as saved: trimmed, inner runs of spaces collapsed. */
export const normalizeChurchTypeName = (value: string) => value.trim().replace(/\s+/g, ' ');

export type ChurchTypeNameError = 'required' | 'tooLong' | 'duplicate';

/**
 * Checks a name before saving. The API accepts blank (only spaces) names on
 * create, saves an empty name on update, and accepts duplicates, so the app
 * checks all three (`selfId`: the record being edited, ignored as duplicate).
 */
export function validateChurchTypeName(
  value: string,
  existing: ChurchTypeItem[],
  selfId?: number,
): ChurchTypeNameError | null {
  const name = normalizeChurchTypeName(value);
  if (!name) {
    return 'required';
  }
  if (name.length > MAX_CHURCH_TYPE_NAME_LENGTH) {
    return 'tooLong';
  }
  const key = name.toLocaleLowerCase();
  if (existing.some(item => item.id !== selfId && normalizeChurchTypeName(item.name).toLocaleLowerCase() === key)) {
    return 'duplicate';
  }
  return null;
}

/** One page of the church types matching `query` (name or #id), in the API's order. */
export function pageChurchTypes(
  items: ChurchTypeItem[],
  query: string,
  page: number,
  limit: number,
): {items: ChurchTypeItem[]; total: number; totalPages: number; page: number} {
  const q = query.trim().toLocaleLowerCase().replace(/^#/, '');
  const matches = q
    ? items.filter(item => item.name.toLocaleLowerCase().includes(q) || String(item.id) === q)
    : items;
  const totalPages = Math.max(1, Math.ceil(matches.length / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: matches.slice((safePage - 1) * limit, safePage * limit),
    total: matches.length,
    totalPages,
    page: safePage,
  };
}
