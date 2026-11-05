import type {ElementDropdownItem} from '../../../shared/components/ElementDropdown';
import {fixMojibake} from '../../../shared/utils/displayText';
import {
  LANGUAGE_REGION_NAME_MAX,
  LanguageRegionItem,
} from '../services/languageregion.service';

/** Saved names include broken UTF-8 ("PortuguÃªs"): shown repaired. */
export const regionName = (r: Pick<LanguageRegionItem, 'id' | 'name'>) =>
  fixMojibake(r.name ?? '').trim() || `#${r.id}`;

const normalize = (s: string | null | undefined) =>
  fixMojibake(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export function cleanRegionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Parent choices: top-level regions, as the app keeps two levels (all saved
 * regions are). The region being edited is left out: it could be picked as
 * its own parent. The saved parent is kept even when it is not top-level, so
 * the field does not show blank.
 */
export function parentOptions(
  items: LanguageRegionItem[],
  selfId?: number,
  currentParentId?: number | null,
): ElementDropdownItem[] {
  return items
    .filter(r => r.id !== selfId && (!r.parent_id || r.id === currentParentId))
    .map(r => ({label: regionName(r), value: r.id}));
}

/** Direct sub-regions of `id`. */
export const childrenOf = (items: LanguageRegionItem[], id: number) =>
  items.filter(r => r.parent_id === id);

export function parentNames(items: LanguageRegionItem[]): Map<number, string> {
  const byId = new Map(items.map(r => [r.id, r] as const));
  const out = new Map<number, string>();
  items.forEach(r => {
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
    if (parent) {
      out.set(r.id, regionName(parent));
    }
  });
  return out;
}

/** By name or parent name; case, accents and broken UTF-8 ignored. */
export function filterRegions(
  items: LanguageRegionItem[],
  query: string,
  parents?: Map<number, string>,
): LanguageRegionItem[] {
  const q = normalize(query);
  if (!q) {
    return items;
  }
  return items.filter(
    r => normalize(r.name).includes(q) || normalize(parents?.get(r.id)).includes(q),
  );
}

export type RegionNameError = 'required' | 'tooLong' | 'duplicate';

/**
 * Required (the API saves a name of spaces), at most 255 characters (SQL
 * error above), and not another region's name (the API saves duplicates).
 * Pass `savedName` when editing: a name kept as it was is not checked, since
 * staging already has two "Russian" regions.
 */
export function validateRegionName(
  name: string,
  existing: LanguageRegionItem[] = [],
  selfId?: number,
  savedName?: string,
): RegionNameError | null {
  const cleaned = cleanRegionName(name);
  if (!cleaned) {
    return 'required';
  }
  if (cleaned.length > LANGUAGE_REGION_NAME_MAX) {
    return 'tooLong';
  }
  if (savedName != null && normalize(savedName) === normalize(cleaned)) {
    return null;
  }
  const n = normalize(cleaned);
  return existing.some(r => r.id !== selfId && normalize(r.name) === n) ? 'duplicate' : null;
}
