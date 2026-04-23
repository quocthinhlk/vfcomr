import {endOfISOWeek, setISOWeek, startOfISOWeek} from 'date-fns';

const formatWeekDayMonth = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  return `${day} ${month}`;
};

const getIsoWeekDate = (isoWeekYear: number, isoWeekNumber: number) => {
  // Jan 4th is always in ISO week 1 of its ISO-week-year.
  const base = new Date(isoWeekYear, 0, 4);
  return setISOWeek(base, isoWeekNumber);
};

export const getIsoWeekDateRangeLabel = (isoWeekYear: number, isoWeekNumber: number): string => {
  const weekDate = getIsoWeekDate(isoWeekYear, isoWeekNumber);
  const weekStart = startOfISOWeek(weekDate);
  const weekEnd = endOfISOWeek(weekDate);
  return `${formatWeekDayMonth(weekStart)} - ${formatWeekDayMonth(weekEnd)}`;
};

export const getIsoWeekDisplayYear = (isoWeekYear: number, isoWeekNumber: number): number => {
  const weekDate = getIsoWeekDate(isoWeekYear, isoWeekNumber);
  const weekStart = startOfISOWeek(weekDate);
  const weekEnd = endOfISOWeek(weekDate);
  return Math.max(weekStart.getFullYear(), weekEnd.getFullYear());
};

