import api from '../../../config/api';

/** Assignment kinds accepted by POST/PUT/DELETE overseer-assignments. */
export type AssignmentType =
  | 'church_network'
  | 'geographical_region'
  | 'church_region'
  | 'language_region'
  | 'overseer';

/** Only these two can be excluded. */
export type ExclusionType = 'geographical_region' | 'church_region';

export type AssignedItem = {
  id: number;
  name: string;
};

export type OverseerAssignments = {
  user: {
    id: number;
    name: string;
    role_name?: string | null;
    title?: string | null;
    email?: string | null;
    photo_url?: string | null;
  };
  allowed: Record<AssignmentType, AssignedItem[]>;
  excluded: Record<ExclusionType, AssignedItem[]>;
};

const list = (v: unknown): AssignedItem[] =>
  Array.isArray(v)
    ? v
        .map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name ?? ''),
        }))
        .filter(x => Number.isFinite(x.id))
    : [];

/** GET overseer-assignments/{userId}: the overseer plus what they oversee / exclude. */
export async function getOverseerAssignments(userId: number): Promise<OverseerAssignments> {
  const res = await api.get(`overseer-assignments/${userId}`);
  const data = res.data?.data ?? {};
  const allowed = data.assignments?.allowedIds ?? {};
  const excluded = data.assignments?.excludedIds ?? {};
  return {
    user: data.user ?? {id: userId, name: ''},
    allowed: {
      church_network: list(allowed.churchNetworkIds),
      geographical_region: list(allowed.geographicalRegionIds),
      church_region: list(allowed.churchRegionIds),
      language_region: list(allowed.languageRegionIds),
      overseer: list(allowed.overseerIds),
    },
    excluded: {
      geographical_region: list(excluded.geographicalRegionIds),
      church_region: list(excluded.churchRegionIds),
    },
  };
}

/** POST: add entities (the API rejects duplicates). */
export async function addAssignments(userId: number, type: AssignmentType, entityIds: number[]) {
  const res = await api.post(`overseer-assignments/${userId}`, {
    assignment_type: type,
    entity_ids: entityIds,
  });
  return res.data;
}

export async function removeAssignment(userId: number, type: AssignmentType, entityId: number) {
  const res = await api.delete(`overseer-assignments/${userId}/assignments/${type}/${entityId}`);
  return res.data;
}

/** POST exclusions takes one entity per request. */
export async function addExclusion(userId: number, type: ExclusionType, entityId: number) {
  const res = await api.post(`overseer-assignments/${userId}/exclusions`, {
    exclusion_type: type,
    entity_id: entityId,
  });
  return res.data;
}

/** DELETE …/exclusions/{type}/{entityId}: entityId is the excluded region's id (confirmed by backend). */
export async function removeExclusion(userId: number, type: ExclusionType, entityId: number) {
  const res = await api.delete(`overseer-assignments/${userId}/exclusions/${type}/${entityId}`);
  return res.data;
}

/** PATCH sub-overseer order: {overseer_id: sort_order}. */
export async function updateSubOverseerOrder(userId: number, orderedIds: number[]) {
  const sort_orders: Record<string, number> = {};
  orderedIds.forEach((id, index) => {
    sort_orders[String(id)] = index;
  });
  const res = await api.patch(`overseer-assignments/${userId}/sub-overseers/sort-order`, {
    sort_orders,
  });
  return res.data;
}

/* ------------------------------------------------------------------ */
/* Options to pick from                                                */
/* ------------------------------------------------------------------ */

export type AssignOption = {id: number; name: string; path?: string};

type TreeNode = {id: number; name: string; children?: TreeNode[]};

/** Flattens a region tree, parents first, with the names above each node. */
const flattenTree = (nodes: TreeNode[] | undefined, names: string[] = []): AssignOption[] =>
  (nodes ?? []).flatMap(n => [
    {id: n.id, name: n.name, path: names.join(' › ') || undefined},
    ...flattenTree(n.children, [...names, n.name]),
  ]);

const dataOf = (res: any) => {
  const d = res?.data?.data;
  return Array.isArray(d) ? d : d?.items ?? [];
};

/** All options for a fixed list; overseers are searched instead (see searchOverseerOptions). */
export async function loadAssignOptions(type: Exclude<AssignmentType, 'overseer'>): Promise<AssignOption[]> {
  switch (type) {
    case 'church_network':
      return dataOf(await api.get('church-networks')).map((n: any) => ({id: n.id, name: n.name}));
    case 'church_region':
      return flattenTree(dataOf(await api.get('church-regions/hierarchy')));
    case 'language_region':
      return flattenTree(dataOf(await api.get('language-regions/hierarchy')));
    case 'geographical_region':
      return flattenTree(dataOf(await api.get('geographical-regions')));
  }
}

export async function searchOverseerOptions(search: string): Promise<AssignOption[]> {
  const res = await api.get('users/overseers', {
    params: {page: 1, limit: 50, ...(search ? {search} : {})},
  });
  return dataOf(res).map((u: any) => ({
    id: u.id,
    name: u.name,
    path: [u.title, u.role_name, u.country_name].filter(Boolean).join(' · ') || undefined,
  }));
}
