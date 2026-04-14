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

export interface ChurchGivingGraphData {
  dates: string[];
  data: ChurchGivingGraphSeries[];
}

export async function getChurchGivingGraph(params?: {
  churchId?: number;
  period?: '1y' | '2y' | '3y';
}): Promise<ChurchGivingGraphData> {
  const churchId = params?.churchId ?? 97;
  const period = params?.period ?? '2y';
  const response = await api.get(
    `graph/churches/${churchId}/attendance-giving-visitor`,
    {params: {period}},
  );
  return (response?.data?.data ?? {dates: [], data: []}) as ChurchGivingGraphData;
}
