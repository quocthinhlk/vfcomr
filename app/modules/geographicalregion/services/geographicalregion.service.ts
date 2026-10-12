import api from '../../../config/api';

export interface GeographicalRegionItem {
  id: number;
  parent_id: number | null;
  left: number;
  right: number;
  name: string;
  depth?: number;
}

export interface GeographicalRegionTreeNode extends GeographicalRegionItem {
  children?: GeographicalRegionTreeNode[];
}

/** Nested-set node: any gap between left and right means it has descendants. */
export function hasChildRegions(item: GeographicalRegionItem): boolean {
  return item.right - item.left > 1;
}

/**
 * GET geographical-regions: the whole tree in `data.items`, top level first,
 * each node carrying its `children` (leaves have no `children` key).
 */
export async function getGeographicalRegionTree(): Promise<GeographicalRegionTreeNode[]> {
  // Plain request, no query: exactly the documented tree response.
  const resp = await api.get('geographical-regions');
  const items = resp.data?.data?.items;
  return Array.isArray(items) ? items : [];
}

export async function createGeographicalRegion(payload: {
  name: string;
  parent_id?: number | null;
}) {
  const resp = await api.post('geographical-regions', payload);
  return resp.data;
}

/** PATCH geographical-regions/{id}; parent_id null moves it to the top level. */
export async function updateGeographicalRegion(
  id: number,
  payload: {name: string; parent_id: number | null},
) {
  const resp = await api.patch(`geographical-regions/${id}`, payload);
  return resp.data;
}

export async function deleteGeographicalRegion(id: number) {
  const resp = await api.delete(`geographical-regions/${id}`);
  return resp.data;
}

/** The regions above `id`, from the top level down (used to show its path). */
export async function getGeographicalRegionAncestors(
  id: number,
): Promise<GeographicalRegionItem[]> {
  const resp = await api.get(`geographical-regions/${id}/ancestors`);
  const data = resp.data?.data;
  const items: GeographicalRegionItem[] = Array.isArray(data) ? data : data?.items ?? [];
  return [...items].sort((a, b) => (a.left ?? 0) - (b.left ?? 0));
}

/**
 * Flattens the tree into indented picker options. `excludeId` drops that
 * region and everything under it (a region cannot be moved under itself).
 */
export function flattenGeographicalRegionTree(
  tree: GeographicalRegionTreeNode[],
  excludeId?: number,
): {label: string; value: number}[] {
  const out: {label: string; value: number}[] = [];
  const walk = (nodes: GeographicalRegionTreeNode[] | undefined, depth: number) => {
    nodes?.forEach(n => {
      if (n.id === excludeId) {
        return;
      }
      out.push({label: `${'— '.repeat(depth)}${n.name}`, value: n.id});
      walk(n.children, depth + 1);
    });
  };
  walk(tree, 0);
  return out;
}
