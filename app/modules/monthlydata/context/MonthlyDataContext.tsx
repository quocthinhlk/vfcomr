import React, {createContext, useContext, useState, useCallback} from 'react';
import {WeeklyReportData, WorshipSession} from '../services/monthlydata.service';

interface MonthlyDataState {
  // Key: `${churchId}_${year}_${weekNumber}`
  weekData: Map<string, {
    worshipSessions: WorshipSession[];
    churchMetrics: any;
  }>;
}

interface MonthlyDataContextType {
  getWeekData: (churchId: number, year: number, weekNumber: number) => {
    worshipSessions: WorshipSession[];
    churchMetrics: any;
  } | null;
  setWeekData: (
    churchId: number,
    year: number,
    weekNumber: number,
    worshipSessions: WorshipSession[],
    churchMetrics: any,
  ) => void;
  removeWeekData: (churchId: number, year: number, weekNumber: number) => void;
  clearData: (churchId?: number, year?: number) => void;
}

const MonthlyDataContext = createContext<MonthlyDataContextType | undefined>(undefined);

export const MonthlyDataProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [state, setState] = useState<MonthlyDataState>({
    weekData: new Map(),
  });

  const getKey = useCallback(
    (churchId: number, year: number, weekNumber: number) =>
      `${churchId}_${year}_${weekNumber}`,
    [],
  );

  const getWeekData = useCallback(
    (churchId: number, year: number, weekNumber: number) => {
      const key = getKey(churchId, year, weekNumber);
      return state.weekData.get(key) || null;
    },
    [state.weekData, getKey],
  );

  const setWeekData = useCallback(
    (
      churchId: number,
      year: number,
      weekNumber: number,
      worshipSessions: WorshipSession[],
      churchMetrics: any,
    ) => {
      const key = getKey(churchId, year, weekNumber);
      setState(prev => {
        const newMap = new Map(prev.weekData);
        newMap.set(key, {worshipSessions, churchMetrics});
        return {weekData: newMap};
      });
    },
    [getKey],
  );

  const removeWeekData = useCallback(
    (churchId: number, year: number, weekNumber: number) => {
      const key = getKey(churchId, year, weekNumber);
      setState(prev => {
        if (!prev.weekData.has(key)) {
          return prev;
        }
        const newMap = new Map(prev.weekData);
        newMap.delete(key);
        return {weekData: newMap};
      });
    },
    [getKey],
  );

  const clearData = useCallback((churchId?: number, year?: number) => {
    if (!churchId && !year) {
      // Clear all
      setState({weekData: new Map()});
      return;
    }

    setState(prev => {
      const newMap = new Map(prev.weekData);
      const keysToDelete: string[] = [];

      for (const key of newMap.keys()) {
        const [cid, y] = key.split('_').map(Number);
        if (churchId && cid === churchId && (!year || y === year)) {
          keysToDelete.push(key);
        } else if (!churchId && year && y === year) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => newMap.delete(key));
      return {weekData: newMap};
    });
  }, []);

  return (
    <MonthlyDataContext.Provider
      value={{getWeekData, setWeekData, removeWeekData, clearData}}>
      {children}
    </MonthlyDataContext.Provider>
  );
};

export const useMonthlyData = () => {
  const context = useContext(MonthlyDataContext);
  if (!context) {
    throw new Error('useMonthlyData must be used within MonthlyDataProvider');
  }
  return context;
};

