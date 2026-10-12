import api from '../../../config/api';

export type OverseerAttendancePoint = {
  year: number;
  week_number: number;
  date: string;
  attendance: number;
};

export type OverseerGraphHeaderFields = {
  graph_title?: string;
  pastor_name?: string;
  for_pastor?: string;
  region?: string;
  nation?: string;
  region_nation?: string;
  report_date?: string;
  reporting_period?: string;
  period?: string;
};

export type OverseerAttendanceGraph = OverseerGraphHeaderFields & {
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

export type OverseerChurchPlantedGraph = OverseerGraphHeaderFields & {
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
  church_names?: string | string[];
  visited_churches?: Array<string | PastoralVisitChurchRef>;
};

export type PastoralVisitsGraph = OverseerGraphHeaderFields & {
  data?: PastoralVisitWeekPoint[];
};

export type OverseerIndicatorsPayload = {
  total_churches?: number;
  attendance_graph?: OverseerAttendanceGraph;
  church_planted_graph?: OverseerChurchPlantedGraph;
  pastoral_visits_graph?: PastoralVisitsGraph;
  [key: string]: unknown;
};

export type OverseerChartHeaderInfo = {
  pastorName: string;
  regionNation: string;
};

export const firstNamed = (items: unknown): string => {
  if (!Array.isArray(items)) {
    return '';
  }
  return items
    .map((item: any) => String(item?.name ?? '').trim())
    .filter(Boolean)
    .join(', ');
};

/*
 * The Admin dashboard already has every overseer's indicators (with the three
 * chart graphs) from my-overseers. It hands them over here so the chart screens
 * can show that overseer instead of the logged-in user (route param overseerId).
 */
const providedCharts = new Map<
  number,
  {indicators: OverseerIndicatorsPayload; header: OverseerChartHeaderInfo}
>();

export function provideOverseerChartData(
  overseerId: number,
  indicators: OverseerIndicatorsPayload,
  header: OverseerChartHeaderInfo,
) {
  providedCharts.set(overseerId, {indicators, header});
}

const providedFor = async (overseerId?: number) => {
  if (overseerId == null) {
    return null;
  }
  const cached = providedCharts.get(overseerId);
  if (cached) {
    return cached;
  }
  // Nothing handed over (e.g. the app reloaded on a chart screen): load it again.
  // Required lazily: adminDashboard.service imports types from this area.
  const {getMyOverseers, buildOverseerChartData} = require('./adminDashboard.service');
  const overseers = await getMyOverseers();
  const match = overseers.find((o: any) => o.profile?.id === overseerId);
  if (!match) {
    throw new Error('This overseer is no longer assigned to you.');
  }
  const built = buildOverseerChartData(match);
  providedCharts.set(overseerId, built);
  return built;
};

export async function getOverseerChartHeaderInfo(
  overseerId?: number,
): Promise<OverseerChartHeaderInfo> {
  const provided = await providedFor(overseerId);
  if (provided) {
    return provided.header;
  }
  const [dashRes, meRes] = await Promise.all([api.get('dashboard'), api.get('users/me')]);
  const dash = dashRes?.data?.data ?? {};
  const me = meRes?.data?.data ?? {};
  const profile = dash?.overseer_profile ?? {};
  const allowed = dash?.overseer_permissions?.allowedIds ?? {};
  const prefix = String(me?.prefix ?? '').trim();
  const name = String(profile?.name || me?.name || '').trim();
  const pastorName = [prefix, name].filter(Boolean).join(' ');
  const regionNation =
    firstNamed(allowed.geographicalRegionIds) ||
    firstNamed(allowed.churchRegionIds) ||
    String(profile?.title || me?.country_name || '').trim();
  return {pastorName, regionNation};
}

export async function getOverseerIndicators(
  overseerId?: number,
): Promise<OverseerIndicatorsPayload | undefined> {
  const provided = await providedFor(overseerId);
  if (provided) {
    return provided.indicators;
  }
  const res = await api.get('dashboard/overseer-indicators');
  const payload = res?.data?.data;
  if (payload != null && typeof payload === 'object') {
    return payload as OverseerIndicatorsPayload;
  }
  return undefined;
}
