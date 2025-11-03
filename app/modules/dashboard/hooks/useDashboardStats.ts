import { useState, useMemo } from 'react';
import { dashboardStats, dashboardIcons, DashboardStatItem } from '../../../shared/config/dashboard.constants';

export function useDashboardStats() {
  const [showAllStats, setShowAllStats] = useState(false);

  const visibleStats = useMemo(() => {
    return showAllStats ? dashboardStats : dashboardStats.slice(0, 4); // Show 8 initially, then all
  }, [showAllStats]);

  const toggleShowAllStats = () => {
    setShowAllStats((prev) => !prev);
  };

  return {
    showAllStats,
    visibleStats,
    toggleShowAllStats,
    icons: dashboardIcons,
  };
} 