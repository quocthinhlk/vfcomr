import {useCallback, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';

const DEFAULT_CHURCH_ID = 97;

export function useDashboardChartChurchId(routeChurchId?: number) {
  const fallbackId =
    typeof routeChurchId === 'number' && routeChurchId > 0
      ? routeChurchId
      : DEFAULT_CHURCH_ID;
  const [churchId, setChurchId] = useState(fallbackId);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const syncAndRefresh = async () => {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          const parsedChurchId = savedChurchId ? parseInt(savedChurchId, 10) : NaN;

          if (!active) {
            return;
          }

          if (!isNaN(parsedChurchId) && parsedChurchId > 0) {
            setChurchId(parsedChurchId);
          } else {
            setChurchId(fallbackId);
          }
        } catch {
          if (active) {
            setChurchId(fallbackId);
          }
        } finally {
          if (active) {
            setRefreshKey(key => key + 1);
          }
        }
      };

      syncAndRefresh();

      return () => {
        active = false;
      };
    }, [fallbackId]),
  );

  return {churchId, refreshKey};
}
