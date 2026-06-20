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
  /** Planted count (preferred). */
  planted?: number;
  /** Closed count (positive; drawn downward). */
  closed?: number;
  closed_count?: number;
  /** Legacy: stacked as "closed" in divergent chart when `closed` missing. */
  count?: number;
  disabled_count?: number;
  is_ytd?: boolean;
  ytd?: boolean;
  is_ytd_year?: boolean;
  year_to_date?: boolean;
};

export type OverseerChurchPlantedGraph = {
  graph_title?: string;
  data?: OverseerChurchPlantedYear[];
};

export type PastoralVisitChurchRef = {
  church_name?: string;
  name?: string;
};

export type PastoralVisitWeekPoint = {
  week_key?: {year: number; week: number};
  dates?: string;
  visit_days?: number | null;
  churches?: Array<string | PastoralVisitChurchRef>;
  church_names?: string[];
  visited_churches?: Array<string | PastoralVisitChurchRef>;
};

export type PastoralVisitsGraph = {
  graph_title?: string;
  data?: PastoralVisitWeekPoint[];
};

export type OverseerIndicatorsPayload = {
  total_churches?: number;
  attendance_graph?: OverseerAttendanceGraph;
  church_planted_graph?: OverseerChurchPlantedGraph;
  pastoral_visits_graph?: PastoralVisitsGraph;
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
