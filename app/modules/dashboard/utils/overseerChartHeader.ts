import type {OverseerGraphHeaderFields} from '../services/overseerIndicators.service';

export function formatOverseerReportDate(date: Date, locale: string): string {
  const month = date.toLocaleDateString(locale || 'en', {month: 'long'});
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function parseIsoLocalDate(isoDate: string): Date | null {
  const s = String(isoDate ?? '').trim();
  const parts = s.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0]!, 10);
    const mo = parseInt(parts[1]!, 10) - 1;
    const d = parseInt(parts[2]!, 10);
    if (Number.isFinite(y) && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return new Date(y, mo, d);
    }
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCompactChartDate(isoDate: string, locale: string): string {
  const date = parseIsoLocalDate(isoDate);
  if (!date) {
    return isoDate;
  }
  const month = date
    .toLocaleDateString(locale || 'en', {month: 'short'})
    .replace('.', '');
  return `${date.getDate()}${month}${String(date.getFullYear()).slice(-2)}`;
}

export function formatReportingPeriod(years: number[]): string {
  const ys = years.filter(y => Number.isFinite(y) && y > 0);
  if (!ys.length) {
    return '';
  }
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  return min === max ? String(min) : `${min} - ${max}`;
}

export function yearFromIsoDate(isoDate: string): number {
  const y = parseInt(String(isoDate ?? '').slice(0, 4), 10);
  return Number.isFinite(y) ? y : 0;
}

export function buildMonthAxisLabels(
  weekDates: Array<string | undefined>,
  locale: string,
): Array<{index: number; label: string}> {
  const labels: Array<{index: number; label: string}> = [];
  let prevMonth = -1;
  weekDates.forEach((iso, index) => {
    if (!iso) {
      return;
    }
    const date = parseIsoLocalDate(iso);
    if (!date) {
      return;
    }
    const month = date.getMonth();
    if (month === prevMonth) {
      return;
    }
    prevMonth = month;
    labels.push({
      index,
      label: date
        .toLocaleDateString(locale || 'en', {month: 'short'})
        .replace('.', ''),
    });
  });
  return labels;
}

export function pickGraphHeaderValue(
  graph: OverseerGraphHeaderFields | undefined,
  keys: Array<keyof OverseerGraphHeaderFields>,
): string {
  if (!graph) {
    return '';
  }
  for (const key of keys) {
    const value = String(graph[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}
