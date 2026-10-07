import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';

type LanguageOption = {id: number; name: string};

/**
 * Language is a required FAQ field: a failed load (e.g. offline) is returned as
 * `languagesError` so the form isn't shown with an empty Language dropdown.
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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }
      const res = await api.get('/languages', {
        params: {page: 1, limit: 100, sort_by: 'name', sort_desc: false},
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!mountedRef.current) {
        return;
      }
      const langItems = res?.data?.data?.items || [];
      setLanguageOptions(
        langItems.map((lang: LanguageOption) => ({
          label: lang.name,
          value: lang.id,
        })),
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
