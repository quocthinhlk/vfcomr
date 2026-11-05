import {useCallback, useMemo, useRef, useState} from 'react';
import api from '../../../config/api';

export type CountryOption = {label: string; value: number};

const PAGE_SIZE = 20;

/**
 * Nation dropdown options: paged and searched on the server. The selected
 * nation is kept in the list even when it is not on the loaded page (Vietnam
 * is far past the first 20) or a search replaced the list — before, the field
 * fell back to "Select Country" while a value was still set.
 */
export function useCountryOptions() {
  const [options, setOptions] = useState<CountryOption[]>([]);
  const [selected, setSelected] = useState<CountryOption | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [query, setQuery] = useState('');
  // Only the newest request may write: typed searches answer out of order.
  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);

  /** Throws on failure so the screen can show its load error. */
  const fetchPage = useCallback(async (nextPage: number, name: string) => {
    const requestId = ++requestRef.current;
    const res = await api.get('countries', {
      params: {page: nextPage, limit: PAGE_SIZE, name, sort_by: 'name', sort_desc: false},
    });
    if (requestId !== requestRef.current) {
      return;
    }
    const data = res?.data?.data;
    const items: CountryOption[] = (data?.items || []).map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
    setOptions(prev => (nextPage === 1 ? items : [...prev, ...items]));
    setHasNext(!!data?.has_next);
    setPage(nextPage);
  }, []);

  const search = useCallback(
    async (text: string) => {
      setQuery(text);
      try {
        await fetchPage(1, text);
      } catch (e) {
        console.error('Error loading countries:', e);
      }
    },
    [fetchPage],
  );

  const loadMore = useCallback(async () => {
    if (!hasNext || loadingMoreRef.current) {
      return;
    }
    loadingMoreRef.current = true;
    try {
      await fetchPage(page + 1, query);
    } catch (e) {
      console.error('Error loading countries:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [fetchPage, hasNext, page, query]);

  /** Show the saved nation's name (edit): look it up when it is not loaded. */
  const ensureSelected = useCallback(async (id: number | null) => {
    if (!id) {
      setSelected(null);
      return;
    }
    try {
      const res = await api.get(`countries/${id}`);
      const country = res?.data?.data;
      if (country?.id) {
        setSelected({label: country.name, value: country.id});
      }
    } catch (e) {
      console.error('Error loading country:', e);
    }
  }, []);

  const select = useCallback(
    (id: number | null) => {
      setSelected(id ? options.find(o => o.value === id) ?? null : null);
    },
    [options],
  );

  const data = useMemo(() => {
    if (!selected || options.some(o => o.value === selected.value)) {
      return options;
    }
    // Only while browsing the full list: a search shows its own matches.
    return query ? options : [selected, ...options];
  }, [options, selected, query]);

  return {data, selected, fetchPage, search, loadMore, ensureSelected, select};
}
