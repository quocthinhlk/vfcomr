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

export async function listGeographicalRegionRoots(): Promise<GeographicalRegionItem[]> {
  const resp = await api.get('geographical-regions/roots');
  return resp.data?.data?.items ?? [];
}

export async function listGeographicalRegionChildren(
  id: number,
): Promise<GeographicalRegionItem[]> {
  const resp = await api.get(`geographical-regions/children/${id}`);
  return resp.data?.data?.items ?? [];
}

/** Full tree, roots first, each node carrying its `children`. */
export async function getGeographicalRegionTree(): Promise<GeographicalRegionTreeNode[]> {
  const resp = await api.get('geographical-regions', {
    params: {sort_by: 'name', sort_desc: false},
  });
  return resp.data?.data?.items ?? [];
}

export async function createGeographicalRegion(payload: {
  name: string;
  parent_id?: number | null;
}) {
  const resp = await api.post('geographical-regions', payload);
  return resp.data;
}
