import {useCallback, useEffect, useRef, useState} from 'react';
import api from '../../../config/api';

type LanguageOption = {id: number; name: string};

/** The languages API answers at most 100 per page. */
const PAGE_SIZE = 100;

/**
 * Language is a required FAQ field: a failed load (e.g. offline) is returned as
 * `languagesError` so the form isn't shown with an empty Language dropdown.
 * (It used to return an empty list without error when no token was saved in
 * AsyncStorage, e.g. with the dev test token: the FAQ could not be saved.)
 */
export function useFaqLanguageOptions() {
  const [languageOptions, setLanguageOptions] = useState<{label: string; value: number}[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const loadLanguages = useCallback(async () => {
    setLanguagesLoading(true);
    setLanguagesError(null);
    try {
      const items: LanguageOption[] = [];
      for (let page = 1; page <= 20; page++) {
        const res = await api.get('/languages', {params: {page, limit: PAGE_SIZE}});
        const data = res?.data?.data;
        items.push(...(data?.items ?? []));
        if (!data?.has_next) {
          break;
        }
      }
      if (!mountedRef.current) {
        return;
      }
      setLanguageOptions(
        items
          .map(lang => ({label: (lang.name ?? '').trim() || `#${lang.id}`, value: lang.id}))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
    } catch (e) {
      if (mountedRef.current) {
        setLanguagesError(e);
      }
    } finally {
      if (mountedRef.current) {
        setLanguagesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadLanguages();
    return () => {
      mountedRef.current = false;
    };
  }, [loadLanguages]);

  return {languageOptions, languagesLoading, languagesError, loadLanguages};
}
