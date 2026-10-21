import {useCallback, useEffect, useState} from 'react';
import {getNationNameMap} from '../services/overseerGoals.service';

/**
 * A goal period's `nation_id` is a geographical region, but the API resolves
 * `nation_name` from countries (wrong or empty). Look the name up in the
 * region tree instead (empty until the tree loads, never the wrong name).
 */
export function useNationName() {
  const [names, setNames] = useState<Map<number, string> | null>(null);

  useEffect(() => {
    let mounted = true;
    getNationNameMap()
      .then(map => {
        if (mounted) {
          setNames(map);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return useCallback(
    (item?: {nation_id?: number | null} | null) =>
      (item?.nation_id != null && names?.get(Number(item.nation_id))) || '',
    [names],
  );
}
