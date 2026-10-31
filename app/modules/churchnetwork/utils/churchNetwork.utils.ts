import type {ChurchNetworkItem} from '../services/churchnetwork.service';

/** The API's column size: longer names fail with a server error (500). */
export const MAX_CHURCH_NETWORK_NAME_LENGTH = 255;

/** Name as saved: trimmed, inner runs of spaces collapsed. */
export const normalizeChurchNetworkName = (value: string) => value.trim().replace(/\s+/g, ' ');

export type ChurchNetworkNameError = 'required' | 'tooLong' | 'duplicate';

/**
 * Checks a name before saving. The API saves an empty name on create (and
 * fails with a 500 above 255 characters); duplicates it refuses with an
 * English message, so they are caught here first (`selfId`: the record being
 * edited, never its own duplicate).
 */
export function validateChurchNetworkName(
  value: string,
  existing: ChurchNetworkItem[],
  selfId?: number,
): ChurchNetworkNameError | null {
  const name = normalizeChurchNetworkName(value);
  if (!name) {
    return 'required';
  }
  if (name.length > MAX_CHURCH_NETWORK_NAME_LENGTH) {
    return 'tooLong';
  }
  const key = name.toLocaleLowerCase();
  if (existing.some(item => item.id !== selfId && normalizeChurchNetworkName(item.name).toLocaleLowerCase() === key)) {
    return 'duplicate';
  }
  return null;
}

/** The API's "name already exists" answer (create or update). */
export const isDuplicateNameError = (error: unknown) =>
  /already exists/i.test(String((error as any)?.response?.data?.message ?? ''));

/** Churches still in the network, from a refused delete; null for other errors. */
export function churchesBlockingDelete(error: unknown): number | null {
  const detail = String((error as any)?.response?.data?.errors?.detail ?? '');
  const match = /(\d+)\s+church(?:es)?\s+(?:are|is)\s+associated/i.exec(detail);
  return match ? Number(match[1]) : null;
}

/** One page of the networks matching `query` (name or #id), in the API's order. */
export function pageChurchNetworks(
  items: ChurchNetworkItem[],
  query: string,
  page: number,
  limit: number,
): {items: ChurchNetworkItem[]; total: number; totalPages: number; page: number} {
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
