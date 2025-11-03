import { useState, useMemo } from 'react';
import { StatItem, stats, icons } from '../config/overseer.constants';

export function useOverseerStats() {
  const [showAllStats, setShowAllStats] = useState(false);

  const visibleStats = useMemo(() => {
    return showAllStats ? stats : stats.slice(0, 4);
  }, [showAllStats]);

  const leftColumn = useMemo(() => {
    return visibleStats.filter((_, i) => i % 2 === 0);
  }, [visibleStats]);

  const rightColumn = useMemo(() => {
    return visibleStats.filter((_, i) => i % 2 === 1);
  }, [visibleStats]);

  const toggleShowAllStats = () => {
    setShowAllStats(prev => !prev);
  };

  return {
    showAllStats,
    visibleStats,
    leftColumn,
    rightColumn,
    toggleShowAllStats,
    icons,
  };
} 