import api from '../../../config/api';

export interface ChurchGivingGraphSeries {
  church_id: number;
  church_name: string;
  church_short_name?: string;
  attendance_values: Array<number | null>;
  cell_group_values?: Array<number | null>;
  prayer_meeting_values?: Array<number | null>;
  liw_class_values?: Array<number | null>;
  giving_in_usd: Array<number | null>;
  mfp_giving_in_usd: Array<number | null>;
}

export type ChurchGivingGraphWeekKey = {
  year: number;
  week: number;
};

export interface ChurchGivingGraphData {
  week_keys?: ChurchGivingGraphWeekKey[];
  dates: string[];
  data: ChurchGivingGraphSeries[];
}

export async function getChurchGivingGraph(params?: {
  churchId?: number;
  period?: '1y' | '2y' | '3y';
}): Promise<ChurchGivingGraphData> {
  const churchId = params?.churchId ?? 97;
  const period = params?.period;
  const response = await api.get(`graph/churches/${churchId}/attendance-giving-visitor`, {
    params: period ? {period} : undefined,
  });

  // API response shape (no `period` param):
  // { success: true, data: { week_keys: [...], dates: [...], data: [...] }, message: string }
  // Older shape was { data: { dates: [...], data: [...] } }.
  const payload = response?.data?.data;
  if (payload && typeof payload === 'object') {
    return (payload ?? {dates: [], data: []}) as ChurchGivingGraphData;
  }

  return {dates: [], data: []};
}
