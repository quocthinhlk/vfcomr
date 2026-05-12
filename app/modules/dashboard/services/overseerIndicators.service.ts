import api from '../../../config/api';

export type OverseerAttendancePoint = {
  year: number;
  week_number: number;
  date: string;
  attendance: number;
};

export type OverseerAttendanceGraph = {
  graph_title?: string;
  data?: OverseerAttendancePoint[];
};

export type OverseerChurchPlantedYear = {
  year: number;
  count: number;
  disabled_count: number;
};

export type OverseerChurchPlantedGraph = {
  graph_title?: string;
  data?: OverseerChurchPlantedYear[];
};

export type OverseerIndicatorsPayload = {
  total_churches?: number;
  attendance_graph?: OverseerAttendanceGraph;
  church_planted_graph?: OverseerChurchPlantedGraph;
  [key: string]: unknown;
};

export async function getOverseerIndicators(): Promise<OverseerIndicatorsPayload | undefined> {
  const res = await api.get('dashboard/overseer-indicators');
  const payload = res?.data?.data;
  if (payload != null && typeof payload === 'object') {
    return payload as OverseerIndicatorsPayload;
  }
  return undefined;
}
