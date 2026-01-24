import api from '../../../config/api';

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

export interface CreateWeeklyReportPayload {
  year: number;
  week_number: number;
  worship_sessions: Array<{
    id: number;
    attendance: WorshipSessionAttendance;
  }>;
  church_metrics: ChurchMetrics;
}

export interface BatchWeeklyReportPayload {
  church_id: number;
  year: number;
  week_number: number;
  worship_sessions: Array<{
    id: number;
    attendance: WorshipSessionAttendance;
  }>;
  church_metrics: ChurchMetrics;
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
    throw new Error(message);
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
  try {
    const response = await api.post(`/weekly-reports/churches/${churchId}`, payload);
    return response.data;
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || 'Failed to save weekly report';
    console.error('Create/update weekly report error:', message);
    throw new Error(message);
  }
}

// Batch create or update weekly reports
export async function batchCreateOrUpdateWeeklyReports(payloads: BatchWeeklyReportPayload[]) {
  try {
    const response = await api.post('/weekly-reports/batch', payloads);
    return response.data;
  } catch (err: any) {
    const message =
      err?.response?.data?.message || err?.message || 'Failed to save weekly reports';
    console.error('Batch create/update weekly reports error:', message);
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
