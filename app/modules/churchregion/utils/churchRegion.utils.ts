import type {ElementDropdownItem} from '../../../shared/components/ElementDropdown';
import type {ChurchRegionItem} from '../services/churchregion.service';

export const REGION_NAME_MAX = 255;

export type RegionTreeNode = {
  id: number;
  name: string;
  parent_id?: number | null;
  children?: RegionTreeNode[] | null;
};

/**
 * Parent dropdown options from GET church-regions/hierarchy. Levels use
 * leading hyphens, which ElementDropdown turns into indentation (the old
 * "— " prefix was shown as text). The region being edited and everything
 * under it are left out: picking one of them as parent would make a loop.
 */
export function buildParentOptions(
  tree: RegionTreeNode[] | null | undefined,
  excludeId?: number | null,
): ElementDropdownItem[] {
  const out: ElementDropdownItem[] = [];
  const walk = (nodes: RegionTreeNode[] | null | undefined, depth: number) => {
    (nodes || []).forEach(node => {
      if (excludeId != null && node.id === excludeId) {
        return;
      }
      out.push({
        label: depth ? `${'-'.repeat(depth)} ${node.name}` : node.name,
        value: node.id,
      });
      walk(node.children, depth + 1);
    });
  };
  walk(tree, 0);
  return out;
}

/** Ids of the regions under `id` (any depth), from parent_id links. */
export function descendantIds(items: ChurchRegionItem[], id: number): Set<number> {
  const byParent = new Map<number, number[]>();
  items.forEach(item => {
    if (item.parent_id != null) {
      byParent.set(item.parent_id, [...(byParent.get(item.parent_id) ?? []), item.id]);
    }
  });
  const out = new Set<number>();
  const stack = [...(byParent.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop() as number;
    if (!out.has(next)) {
      out.add(next);
      stack.push(...(byParent.get(next) ?? []));
    }
  }
  return out;
}

/** Name of each region's parent, for the list ("Under: VFC Reg. 2"). */
export function parentNames(items: ChurchRegionItem[]): Map<number, string> {
  const names = new Map(items.map(i => [i.id, i.name] as const));
  const out = new Map<number, string>();
  items.forEach(item => {
    const parent = item.parent_id != null ? names.get(item.parent_id) : undefined;
    if (parent) {
      out.set(item.id, parent.trim());
    }
  });
  return out;
}

const normalize = (s: string | null | undefined) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Search by name or by the parent's name, ignoring case, accents and double spaces. */
export function filterRegions(
  items: ChurchRegionItem[],
  query: string,
  parents?: Map<number, string>,
): ChurchRegionItem[] {
  const q = normalize(query);
  if (!q) {
    return items;
  }
  return items.filter(
    item => normalize(item.name).includes(q) || normalize(parents?.get(item.id)).includes(q),
  );
}

/** Required and at most 255 characters; the API saves a name of spaces. */
export function validateRegionName(name: string): 'required' | 'tooLong' | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'required';
  }
  if (trimmed.length > REGION_NAME_MAX) {
    return 'tooLong';
  }
  return null;
}
