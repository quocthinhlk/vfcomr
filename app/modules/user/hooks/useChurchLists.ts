import { useEffect, useState } from 'react';
import api from '../../../config/api';

export function useChurchLists() {
  const [churchLists, setChurchLists] = useState<{ label: string; value: string }[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(true);

  useEffect(() => {
    async function fetchChurches() {
      try {
        const response = await api.get('/churches?page=1&limit=10');

        const data = response.data;

        setChurchLists(
          (data?.data || []).map((church: any) => ({
            label: church.name,
            value: String(church.id),
          }))
        );
      } catch (error) {
        console.error('Error fetching churches:', error);
      } finally {
        setLoadingChurches(false);
      }
    }

    fetchChurches();
  }, []);

  return { churchLists, loadingChurches };
} 