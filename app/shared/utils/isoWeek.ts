import {endOfISOWeek, setISOWeek, startOfISOWeek} from 'date-fns';

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "05 Jan" — month in `language` (an app language code) when given, else English. */
const formatWeekDayMonth = (date: Date, language?: string) => {
  const day = String(date.getDate()).padStart(2, '0');
  let month = EN_MONTHS[date.getMonth()];
  if (language && language !== 'en') {
    try {
      month = new Intl.DateTimeFormat(language, {month: 'short'}).format(date);
    } catch {
      // Unknown locale: keep English.
    }
  }
  return `${day} ${month}`;
};

const formatWeekDayMonthYear = (date: Date) => {
  return `${formatWeekDayMonth(date)} ${date.getFullYear()}`;
};

const getIsoWeekDate = (isoWeekYear: number, isoWeekNumber: number) => {
  // Jan 4th is always in ISO week 1 of its ISO-week-year.
  const base = new Date(isoWeekYear, 0, 4);
  return setISOWeek(base, isoWeekNumber);
};

export const getIsoWeekDateRangeLabel = (
  isoWeekYear: number,
  isoWeekNumber: number,
  language?: string,
): string => {
  const weekDate = getIsoWeekDate(isoWeekYear, isoWeekNumber);
  const weekStart = startOfISOWeek(weekDate);
  const weekEnd = endOfISOWeek(weekDate);
  return `${formatWeekDayMonth(weekStart, language)} - ${formatWeekDayMonth(weekEnd, language)}`;
};

export const getIsoWeekDateRangeLabelFull = (isoWeekYear: number, isoWeekNumber: number): string => {
  const weekDate = getIsoWeekDate(isoWeekYear, isoWeekNumber);
  const weekStart = startOfISOWeek(weekDate);
  const weekEnd = endOfISOWeek(weekDate);

  if (weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${formatWeekDayMonth(weekStart)} - ${formatWeekDayMonth(weekEnd)} ${weekEnd.getFullYear()}`;
  }

  return `${formatWeekDayMonthYear(weekStart)} - ${formatWeekDayMonthYear(weekEnd)}`;
};

export const getIsoWeekDisplayYear = (isoWeekYear: number, isoWeekNumber: number): number => {
  const weekDate = getIsoWeekDate(isoWeekYear, isoWeekNumber);
  const weekStart = startOfISOWeek(weekDate);
  const weekEnd = endOfISOWeek(weekDate);
  return Math.max(weekStart.getFullYear(), weekEnd.getFullYear());
};

