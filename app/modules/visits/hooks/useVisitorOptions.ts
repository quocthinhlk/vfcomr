import {useCallback, useEffect, useRef, useState} from 'react';
import {listUsers} from '../../user/services/user.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Visitor picker data for Add/Edit Visit: users sorted by name, searched on
 * the server with what the user types, more pages loaded on scroll.
 * `pin` keeps an option (the logged-in user, the visit's visitor) in the list
 * so the selected value still shows its label when a search leaves it out.
 */
export function useVisitorOptions<T extends {value: number}>(mapItem: (user: any) => T) {
  const [options, setOptions] = useState<T[]>([]);
  const mapRef = useRef(mapItem);
  mapRef.current = mapItem;

  const pinnedRef = useRef<T[]>([]);
  const resultsRef = useRef<T[]>([]);
  const queryRef = useRef({search: '', page: 1, hasNext: false, loading: false, requestId: 0});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publish = useCallback(() => {
    const ids = new Set(resultsRef.current.map(o => o.value));
    setOptions([...pinnedRef.current.filter(o => !ids.has(o.value)), ...resultsRef.current]);
  }, []);

  /** Loads one page; a newer request makes older answers obsolete. */
  const fetchPage = useCallback(
    async (search: string, page: number) => {
      const q = queryRef.current;
      const requestId = ++q.requestId;
      q.loading = true;
      try {
        const res = await listUsers({page, limit: PAGE_SIZE, search, sort_by: 'name', sort_desc: false});
        if (requestId !== q.requestId) {
          return;
        }
        const data = res?.data;
        const items = (data?.items ?? []).map(item => mapRef.current(item));
        resultsRef.current =
          page === 1
            ? items
            : [...resultsRef.current, ...items.filter(i => !resultsRef.current.some(r => r.value === i.value))];
        q.search = search;
        q.page = page;
        q.hasNext = !!data?.has_next || page < (data?.total_pages ?? 1);
        publish();
      } finally {
        if (requestId === q.requestId) {
          q.loading = false;
        }
      }
    },
    [publish],
  );

  /** First page without a search; throws so the screen can show a retry. */
  const loadInitial = useCallback(() => fetchPage('', 1), [fetchPage]);

  const onSearchText = useCallback(
    (text: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      const search = text.trim();
      debounceRef.current = setTimeout(() => {
        // A failed search keeps the current list instead of emptying it.
        fetchPage(search, 1).catch(() => {});
      }, SEARCH_DEBOUNCE_MS);
    },
    [fetchPage],
  );

  const onEndReached = useCallback(() => {
    const q = queryRef.current;
    if (q.loading || !q.hasNext) {
      return;
    }
    fetchPage(q.search, q.page + 1).catch(() => {});
  }, [fetchPage]);

  const pin = useCallback(
    (option: T | null | undefined) => {
      if (!option || pinnedRef.current.some(o => o.value === option.value)) {
        return;
      }
      pinnedRef.current = [...pinnedRef.current, option];
      publish();
    },
    [publish],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  return {options, loadInitial, onSearchText, onEndReached, pin};
}
