import type {
  BatchWeeklyReportPayload,
  ChurchMetrics,
  WeeklyReportData,
  WorshipSession,
  WorshipSessionAttendance,
} from '../services/monthlydata.service';

/** Longest whole number kept exactly (Number.MAX_SAFE_INTEGER has 16 digits). */
export const MAX_NUMBER_DIGITS = 15;

/** 1234567 → "1,234,567"; empty for no value. */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return '';
  }
  return num.toLocaleString('en-US', {maximumFractionDigits: 0});
}

/**
 * Text typed in a count / amount field → whole number, or null when empty.
 * The fields hold whole numbers (as the API stores them), shown with "," as
 * the thousands separator. A value with a decimal part ("12.50",
 * "1,234.56") keeps its whole part instead of becoming 100× larger, and digits
 * past MAX_NUMBER_DIGITS are dropped so the value stays exact.
 */
export function parseNumber(text: string | null | undefined): number | null {
  if (!text || !text.trim()) {
    return null;
  }
  // The field shows "," only as a thousands separator (deleting a digit from
  // "1,234" leaves "1,23"), so only "." starts a decimal part to drop.
  const withoutDecimals = text.trim().replace(/\.\d*$/, '');
  const digits = withoutDecimals.replace(/\D/g, '').slice(0, MAX_NUMBER_DIGITS);
  if (!digits) {
    return null;
  }
  return Number(digits);
}

export function calculateTotalAttendance(attendance: Partial<WorshipSessionAttendance>): number | null {
  const parts = [attendance.adult_attendance, attendance.youth_attendance, attendance.child_attendance];
  if (parts.every(value => value === null || value === undefined)) {
    return null;
  }
  return parts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export const hasRequiredAdultAttendance = (sessions: WorshipSession[] | undefined): boolean =>
  !!sessions &&
  sessions.length > 0 &&
  sessions.every(session => session.attendance.adult_attendance !== null && session.attendance.adult_attendance !== undefined);

/**
 * The church's worship services (`base`) with a week's reported attendance:
 * every service is listed (in service order), reported sessions for services
 * no longer listed are kept at the end.
 */
export function mergeWorshipSessions(base: WorshipSession[], reported?: WorshipSession[]): WorshipSession[] {
  const reportedList = reported ?? [];
  if (!base.length) {
    return reportedList;
  }
  const byId = new Map(reportedList.map(session => [session.id, session]));
  const merged = base.map(service => {
    const report = byId.get(service.id);
    return report ? {...service, attendance: report.attendance ?? service.attendance} : service;
  });
  reportedList.forEach(session => {
    if (!merged.some(existing => existing.id === session.id)) {
      merged.push(session);
    }
  });
  return merged;
}

export type AttendanceField =
  | 'adult_attendance'
  | 'youth_attendance'
  | 'child_attendance'
  | 'number_of_service_for_children';

/** One attendance value of one session changed; the total follows. */
export function applySessionEdit(
  week: WeeklyReportData,
  sessionId: number,
  field: AttendanceField,
  value: number | null,
): WeeklyReportData {
  return {
    ...week,
    worship_sessions: week.worship_sessions.map(session => {
      if (session.id !== sessionId) {
        return session;
      }
      const attendance = {...session.attendance, [field]: value};
      return {...session, attendance: {...attendance, total_attendance: calculateTotalAttendance(attendance)}};
    }),
  };
}

/** USD counterpart of a local-currency amount (the form only edits the local one). */
const USD_OF: Partial<Record<keyof ChurchMetrics, keyof ChurchMetrics>> = {
  giving_in_local_currency: 'giving_in_usd',
  mfp_in_local_currency: 'mfp_in_usd',
};

/**
 * One church metric changed. Changing a local-currency amount clears its USD
 * value: it was computed from the old amount and would otherwise be re-sent
 * unchanged next to the new one.
 */
export function applyMetricEdit(
  week: WeeklyReportData,
  field: keyof ChurchMetrics,
  value: number | null,
): WeeklyReportData {
  const metrics: ChurchMetrics = {...(week.church_metrics ?? ({} as ChurchMetrics)), [field]: value};
  const usdField = USD_OF[field];
  if (usdField && (week.church_metrics?.[field] ?? null) !== value) {
    metrics[usdField] = null;
  }
  return {...week, church_metrics: metrics};
}

/**
 * The weeks to save, in order. Every week must have been loaded (a week that
 * never loaded must not be saved with another week's numbers or empty
 * metrics: that would overwrite its real report) and have adults attendance
 * for every session.
 */
export function buildBatchPayloads(
  churchId: number,
  year: number,
  weekNumbers: number[],
  weekData: Map<number, WeeklyReportData>,
):
  | {ok: true; payloads: BatchWeeklyReportPayload[]}
  | {ok: false; reason: 'notLoaded' | 'missingAttendance'; weekNumber: number} {
  const payloads: BatchWeeklyReportPayload[] = [];
  for (const weekNumber of weekNumbers) {
    const data = weekData.get(weekNumber);
    if (!data) {
      return {ok: false, reason: 'notLoaded', weekNumber};
    }
    if (!hasRequiredAdultAttendance(data.worship_sessions)) {
      return {ok: false, reason: 'missingAttendance', weekNumber};
    }
    payloads.push({
      church_id: churchId,
      year,
      week_number: weekNumber,
      worship_sessions: data.worship_sessions,
      church_metrics: data.church_metrics ?? ({} as ChurchMetrics),
    });
  }
  return {ok: true, payloads};
}

/** An empty week built from the church's worship services. */
export function emptyWeek(
  churchId: number,
  year: number,
  weekNumber: number,
  services: WorshipSession[],
): WeeklyReportData {
  return {
    church_id: churchId,
    year,
    week_number: weekNumber,
    worship_sessions: services,
    church_metrics: {} as ChurchMetrics,
  };
}
