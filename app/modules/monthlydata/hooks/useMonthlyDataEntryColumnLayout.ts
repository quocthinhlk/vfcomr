import {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_MONTHLY_DATA_ENTRY_COLUMN_LAYOUT,
  MONTHLY_DATA_ENTRY_LAYOUT_STORAGE_KEY,
  MonthlyDataEntryColumnLayout,
  parseMonthlyDataEntryColumnLayout,
} from '../constants/monthlyDataEntryLayout';

async function readSavedColumnLayout(): Promise<MonthlyDataEntryColumnLayout> {
  try {
    const raw = await AsyncStorage.getItem(MONTHLY_DATA_ENTRY_LAYOUT_STORAGE_KEY);
    return parseMonthlyDataEntryColumnLayout(raw);
  } catch {
    return DEFAULT_MONTHLY_DATA_ENTRY_COLUMN_LAYOUT;
  }
}

async function writeSavedColumnLayout(
  layout: MonthlyDataEntryColumnLayout,
): Promise<void> {
  try {
    await AsyncStorage.setItem(MONTHLY_DATA_ENTRY_LAYOUT_STORAGE_KEY, layout);
  } catch {
    // non-fatal
  }
}

/** Persists Monthly Data Entry 1-col / 2-col layout across sessions. */
export function useMonthlyDataEntryColumnLayout() {
  const [columnLayout, setColumnLayoutState] =
    useState<MonthlyDataEntryColumnLayout>(
      DEFAULT_MONTHLY_DATA_ENTRY_COLUMN_LAYOUT,
    );
  const userChangedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await readSavedColumnLayout();
      if (mounted && !userChangedRef.current) {
        setColumnLayoutState(saved);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const saved = await readSavedColumnLayout();
        if (active) {
          setColumnLayoutState(saved);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const setColumnLayout = useCallback(
    async (layout: MonthlyDataEntryColumnLayout) => {
      userChangedRef.current = true;
      setColumnLayoutState(layout);
      await writeSavedColumnLayout(layout);
    },
    [],
  );

  return {columnLayout, setColumnLayout};
}
