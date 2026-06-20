import {useEffect, useState} from 'react';
import {getChurchGivingGraph} from '../services/churchGivingChart.service';

export function useChartChurchName(churchId: number, refreshKey: number) {
  const [churchName, setChurchName] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadChurchName = async () => {
      try {
        const result = await getChurchGivingGraph({churchId});
        if (cancelled) {
          return;
        }
        const preferred =
          result?.data?.find(item => item.church_id === churchId) ??
          result?.data?.find(item => item.church_id !== 0) ??
          null;
        setChurchName(preferred?.church_name?.trim() ?? '');
      } catch {
        if (!cancelled) {
          setChurchName('');
        }
      }
    };

    loadChurchName();

    return () => {
      cancelled = true;
    };
  }, [churchId, refreshKey]);

  return churchName;
}
