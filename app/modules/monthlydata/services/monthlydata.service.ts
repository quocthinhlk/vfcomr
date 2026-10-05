import api from '../../../config/api';
import {getApiErrorMessage as resolveApiErrorMessage} from '../../../shared/utils/apiErrorHandler';

export interface WorshipSessionAttendance {
  adult_attendance: number | null;
  youth_attendance: number | null;
  child_attendance: number | null;
  number_of_service_for_children: number | null;
  total_attendance?: number | null;
}

export interface WorshipSession {
  id: number;
  name: string;
  day_name: string;
  time: string;
  attendance: WorshipSessionAttendance;
}

export interface ChurchMetrics {
  being_actively_discipled: number | null;
  number_in_an_encounter: number | null;
  number_of_cell_groups: number | null;
  cell_group_weekly_attendance: number | null;
  number_of_leaders_in_training_for_cpm: number | null;
  number_of_liw_classes: number | null;
  liw_total_students: number | null;
  number_of_prayer_meetings: number | null;
  prayer_meeting_weekly_attendance: number | null;
  weekly_decisions_made: number | null;
  weekly_water_baptism: number | null;
  giving_in_local_currency: number | null;
  giving_in_usd: number | null;
  mfp_in_local_currency: number | null;
  mfp_in_usd: number | null;
}

export interface WeeklyReportData {
  church_id: number;
  year: number;
  week_number: number;
  currency_id?: number;
  worship_sessions: WorshipSession[];
  church_metrics: ChurchMetrics;
}

export interface GetWeeklyReportResponse {
  success: boolean;
  data: WeeklyReportData;
  message: string;
}

export interface GetWeeklyReportsResponse {
  success: boolean;
  data: WeeklyReportData[];
  message: string;
}

export interface WeekInfo {
  week_number: number;
  is_reported: boolean;
}

export interface GetWeekNumbersData {
  year: number;
  month: number;
  weeks: WeekInfo[];
}

export interface GetWeekNumbersResponse {
  success: boolean;
  data: GetWeekNumbersData;
  message: string;
}

export type WorshipSessionSaveItem = {
  id: number;
  attendance: WorshipSessionAttendance;
};

export interface CreateWeeklyReportPayload {
  year: number;
  week_number: number;
  worship_sessions: WorshipSessionSaveItem[];
  church_metrics: ChurchMetrics;
}

export interface BatchWeeklyReportPayload {
  church_id: number;
  year: number;
  week_number: number;
  worship_sessions: Array<WorshipSession | WorshipSessionSaveItem>;
  church_metrics: ChurchMetrics;
}

export const CHURCH_METRIC_SAVE_FIELDS: (keyof ChurchMetrics)[] = [
  'being_actively_discipled',
  'number_in_an_encounter',
  'number_of_cell_groups',
  'cell_group_weekly_attendance',
  'number_of_leaders_in_training_for_cpm',
  'number_of_liw_classes',
  'liw_total_students',
  'number_of_prayer_meetings',
  'prayer_meeting_weekly_attendance',
  'weekly_decisions_made',
  'weekly_water_baptism',
  'giving_in_local_currency',
  'giving_in_usd',
  'mfp_in_local_currency',
  'mfp_in_usd',
];

function getApiErrorMessage(err: any, fallback: string): string {
  // Prefer centralized safe messages; keep a domain fallback when nothing useful remains.
  const safe = resolveApiErrorMessage(err);
  return safe || fallback;
}

export function buildChurchMetricsPayload(
  metrics: Partial<ChurchMetrics> | undefined,
): ChurchMetrics {
  const source = metrics || {};
  return CHURCH_METRIC_SAVE_FIELDS.reduce((acc, key) => {
    acc[key] = source[key] ?? null;
    return acc;
  }, {} as ChurchMetrics);
}

export function buildWorshipSessionsPayload(
  sessions: Array<WorshipSession | WorshipSessionSaveItem>,
): WorshipSessionSaveItem[] {
  return sessions.map(session => ({
    id: session.id,
    attendance: {
      adult_attendance: session.attendance.adult_attendance,
      youth_attendance: session.attendance.youth_attendance,
      child_attendance: session.attendance.child_attendance,
      number_of_service_for_children:
        session.attendance.number_of_service_for_children,
    },
  }));
}

// Get week numbers for a specific year, month, and church
export async function getWeekNumbers(
  year: number,
  month: number,
  churchId: number,
): Promise<number[]> {
  try {
    const response = await api.get<GetWeekNumbersResponse>('/week-numbers', {
      params: { year, month, church_id: churchId },
    });
    // API now returns an object with weeks array containing {week_number, is_reported}
    const weekData = response.data.data;
    if (weekData && weekData.weeks && Array.isArray(weekData.weeks)) {
      const result = weekData.weeks.map(w => w.week_number).sort((a, b) => a - b);
      return result;
    }
    return [];
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Failed to get week numbers';
    console.error('Get week numbers error:', message, err);
    throw new Error(message);
  }
}

// Get week info (including is_reported status) for a specific year, month, and church
export async function getWeekInfo(
  year: number,
  month: number,
  churchId: number,
): Promise<WeekInfo[]> {
  try {
    const response = await api.get<GetWeekNumbersResponse>('/week-numbers', {
      params: { year, month, church_id: churchId },
    });
    // API returns an object with weeks array containing {week_number, is_reported}
    const weekData = response.data.data;
    if (weekData && weekData.weeks && Array.isArray(weekData.weeks)) {
      return weekData.weeks.sort((a, b) => a.week_number - b.week_number);
    }
    return [];
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Failed to get week info';
    console.error('Get week info error:', message);
    throw new Error(message);
  }
}

// Get weekly report for a specific church, year, and week
export async function getWeeklyReport(
  churchId: number,
  year: number,
  weekNumber: number,
): Promise<WeeklyReportData> {
  try {
    const response = await api.get<GetWeeklyReportResponse>(
      `/weekly-reports/churches/${churchId}`,
      {
        params: { year, week_number: weekNumber },
      },
    );
    return response.data.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Failed to get weekly report';
    console.error('Get weekly report error:', message);
    // Keep the original error so callers can tell "offline / timed out"
    // apart from "no report for this week yet".
    const wrapped = new Error(message) as Error & {cause?: unknown};
    wrapped.cause = err;
    throw wrapped;
  }
}

// Get last 4 weeks reports
export async function getLast4WeeksReports(churchId: number): Promise<WeeklyReportData[]> {
  try {
    const response = await api.get<GetWeeklyReportsResponse>(
      `/weekly-reports/churches/${churchId}`,
      {
        params: { period: 'last_4_weeks' },
      },
    );
    return response.data.data || [];
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Failed to get weekly reports';
    console.error('Get weekly reports error:', message);
    throw new Error(message);
  }
}

// Create or update weekly report
export async function createOrUpdateWeeklyReport(
  churchId: number,
  payload: CreateWeeklyReportPayload,
) {
  return batchCreateOrUpdateWeeklyReports([
    {
      church_id: churchId,
      year: payload.year,
      week_number: payload.week_number,
      worship_sessions: payload.worship_sessions,
      church_metrics: buildChurchMetricsPayload(payload.church_metrics),
    },
  ]);
}

// Batch create or update weekly reports
export async function batchCreateOrUpdateWeeklyReports(
  payloads: BatchWeeklyReportPayload[],
) {
  try {
    const normalizedPayloads = payloads.map(payload => ({
      church_id: payload.church_id,
      year: payload.year,
      week_number: payload.week_number,
      worship_sessions: buildWorshipSessionsPayload(payload.worship_sessions),
      church_metrics: buildChurchMetricsPayload(payload.church_metrics),
    }));
    const response = await api.post('/weekly-reports/batch', normalizedPayloads);
    return response.data;
  } catch (err: any) {
    const message = getApiErrorMessage(err, 'Failed to save weekly reports');
    console.error(
      'Batch create/update weekly reports error:',
      message,
      err?.response?.data,
    );
    throw new Error(message);
  }
}

// Get worship sessions from a weekly report (they already have the structure)
export async function getWorshipSessionsFromWeeklyReport(
  churchId: number,
  year: number,
  weekNumber: number,
): Promise<WorshipSession[]> {
  try {
    const response = await api.get<GetWeeklyReportResponse>(
      `/weekly-reports/churches/${churchId}`,
      {
        params: { year, week_number: weekNumber },
      },
    );
    return response.data.data?.worship_sessions || [];
  } catch (err: any) {
    console.error('Get worship sessions error:', err?.message);
    // Return empty array if no data
    return [];
  }
}
