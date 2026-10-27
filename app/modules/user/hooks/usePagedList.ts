import {useCallback, useEffect, useRef, useState} from 'react';

export interface PagedListPage<T> {
  items?: T[];
  total?: number;
  page?: number;
  total_pages?: number;
  has_next?: boolean;
}

/**
 * The API sometimes answers a first request with totals that contradict the
 * page itself (e.g. total: 1 with 10 items) while other requests run, so such
 * a page is fetched once more.
 */
export function looksInconsistent(d: PagedListPage<unknown> | undefined, requestedPage: number) {
  if (!d) {
    return false;
  }
  const count = d.items?.length ?? 0;
  return (
    (d.total ?? 0) < count ||
    (!!d.has_next && (d.total_pages ?? 1) <= (d.page ?? requestedPage))
  );
}

/** Page count, trusting has_next when total_pages says there is nothing after this page. */
export function resolveTotalPages(d: PagedListPage<unknown> | undefined, page: number) {
  let pages = Math.max(1, Number(d?.total_pages) || 1);
  if (d?.has_next) {
    pages = Math.max(pages, page + 1);
  }
  return pages;
}

/**
 * One page of a searchable list at a time (users, overseers, switch user,
 * role change requests).
 * Only the latest request may update the list, so a slow answer for an older
 * query or page can't replace newer results, and a new query is never dropped
 * because a previous request is still running.
 */
export function usePagedList<T>(
  fetchPage: (page: number, search: string) => Promise<PagedListPage<T> | undefined>,
  query: string,
  /** False until the list may be loaded (e.g. the viewer's role is known). */
  enabled = true,
) {
  const searchKey = query.trim();
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const requestIdRef = useRef(0);
  const searchRef = useRef(searchKey);
  searchRef.current = searchKey;
  /** What Retry loads: the page that failed, not the page last shown. */
  const lastRequestedPageRef = useRef(1);

  const load = useCallback(async (targetPage: number, search: string): Promise<void> => {
    const requestId = ++requestIdRef.current;
    const isLatest = () => requestId === requestIdRef.current;
    lastRequestedPageRef.current = targetPage;
    setLoading(true);
    setItems([]);
    try {
      let data = await fetchPageRef.current(targetPage, search);
      if (isLatest() && looksInconsistent(data, targetPage)) {
        data = await fetchPageRef.current(targetPage, search);
      }
      if (!isLatest()) {
        return;
      }
      const resolvedPage = data?.page ?? targetPage;
      const pages = resolveTotalPages(data, resolvedPage);
      const nextItems = data?.items ?? [];
      if (!nextItems.length && targetPage > 1 && targetPage > pages) {
        // The list got shorter (e.g. after a delete): show its last page.
        return load(pages, search);
      }
      setTotalPages(pages);
      setTotal(data?.total ?? nextItems.length);
      setPage(resolvedPage);
      setItems(nextItems);
      setLoadError(null);
    } catch (e) {
      if (isLatest()) {
        // A recoverable error, never "no users".
        setLoadError(e);
      }
    } finally {
      if (isLatest()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      load(1, searchKey);
    }
  }, [searchKey, load, enabled]);

  useEffect(
    () => () => {
      // Ignore answers that arrive after the screen is gone.
      requestIdRef.current += 1;
    },
    [],
  );

  /** Reload from page 1 with the current search (after an add / edit / delete). */
  const reload = useCallback(() => load(1, searchRef.current), [load]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages || loading) {
        return;
      }
      load(targetPage, searchRef.current);
    },
    [load, loading, totalPages],
  );

  const retry = useCallback(
    () => load(lastRequestedPageRef.current, searchRef.current),
    [load],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(1, searchRef.current);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return {
    items,
    setItems,
    page,
    totalPages,
    total,
    loading,
    refreshing,
    loadError,
    reload,
    goToPage,
    retry,
    onRefresh,
  };
}
