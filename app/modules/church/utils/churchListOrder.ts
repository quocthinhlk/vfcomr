export interface ChurchListSortable {
  name?: string | null;
  city?: string | null;
  is_msc?: boolean;
  is_first_msc?: boolean;
}

export const parseChurchBooleanFlag = (value: unknown): boolean => {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0 || value == null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') {
    return false;
  }
  return Boolean(value);
};

export const getChurchMscFlags = (church: any) => ({
  is_msc: parseChurchBooleanFlag(church?.is_msc ?? church?.isMsc),
  is_first_msc: parseChurchBooleanFlag(
    church?.is_first_msc ?? church?.isFirstMsc ?? church?.first_msc,
  ),
});

export const churchShowsMscBadges = (church: any): boolean => {
  const flags = getChurchMscFlags(church);
  return flags.is_msc || flags.is_first_msc;
};

export const normalizeAssignedChurchRow = (c: any): any | null => {
  if (!c || typeof c !== 'object') {
    return null;
  }
  const id = Number(c.id);
  const name = String(c.name ?? '').trim();
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  const city = c.city != null ? String(c.city).trim() : '';
  const flags = getChurchMscFlags(c);
  return {
    id,
    name: name || String(id),
    ...(city ? {city} : {}),
    ...flags,
    parent_id: c.parent_id,
    disabled: c.disabled,
    data_entry_status: c.data_entry_status,
  };
};

export const normalizeAssignedChurches = (
  rows: any[] | null | undefined,
): any[] | null => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  const normalized = rows
    .map(normalizeAssignedChurchRow)
    .filter(Boolean) as any[];
  return normalized.length > 0 ? normalized : null;
};

export const mergeAssignedChurchesLists = (
  primary?: any[] | null,
  secondary?: any[] | null,
): any[] => {
  const byId = new Map<number, any>();
  const addRows = (rows?: any[] | null) => {
    for (const row of rows || []) {
      const normalized = normalizeAssignedChurchRow(row);
      if (!normalized) {
        continue;
      }
      const prev = byId.get(normalized.id);
      byId.set(normalized.id, prev ? {...prev, ...normalized} : normalized);
    }
  };
  addRows(primary);
  addRows(secondary);
  return Array.from(byId.values());
};

/** 0 = First MSC, 1 = MSC, 2 = other */
export function getChurchListPriorityRank(church: ChurchListSortable): number {
  const flags = getChurchMscFlags(church);
  if (flags.is_first_msc) {
    return 0;
  }
  if (flags.is_msc) {
    return 1;
  }
  return 2;
}

export function compareChurchesByCityThenName(
  a: ChurchListSortable,
  b: ChurchListSortable,
): number {
  const cityA = String(a.city ?? '').trim().toLocaleLowerCase();
  const cityB = String(b.city ?? '').trim().toLocaleLowerCase();
  if (cityA !== cityB) {
    return cityA.localeCompare(cityB);
  }
  const nameA = String(a.name ?? '').trim().toLocaleLowerCase();
  const nameB = String(b.name ?? '').trim().toLocaleLowerCase();
  return nameA.localeCompare(nameB);
}

export function sortChurchesForAssignedList<T extends ChurchListSortable>(
  churches: T[],
): T[] {
  return [...churches].sort((a, b) => {
    const rankDiff = getChurchListPriorityRank(a) - getChurchListPriorityRank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return compareChurchesByCityThenName(a, b);
  });
}
