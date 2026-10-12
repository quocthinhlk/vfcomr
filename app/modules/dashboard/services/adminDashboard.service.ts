import api from '../../../config/api';
import type {OverseerIndicatorValues} from '../utils/overseerStats';

export type AdminOverseerProfile = {
  id: number;
  name: string;
  role_name?: string;
  title?: string;
  email?: string;
  photo_url?: string;
};

export type AdminOverseerSummary = {
  index: number;
  profile: AdminOverseerProfile;
  /** Same payload as dashboard/overseer-indicators, incl. the three chart graphs. */
  indicators: OverseerIndicatorValues;
  /** allowedIds lists (regions, networks…), used for the chart header. */
  permissions?: {allowedIds?: Record<string, Array<{id: number; name: string}>>};
  /**
   * Visits and planted graphs come at the item's top level; the copies inside
   * overseer_indicators are empty (data: null). Attendance is only inside it.
   */
  pastoralVisitsGraph?: unknown;
  churchPlantedGraph?: unknown;
};

type StreamLine = {
  success?: boolean;
  message?: string;
  data?: {
    type?: string;
    total_count?: number;
    index?: number;
    item?: {
      overseer_profile?: AdminOverseerProfile;
      overseer_indicators?: OverseerIndicatorValues;
      overseer_permissions?: AdminOverseerSummary['permissions'];
      pastoral_visits_graph?: unknown;
      church_planted_graph?: unknown;
    };
  };
};

/** NDJSON: one JSON object per line (blank lines ignored). */
function parseNdjson(raw: string): StreamLine[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as StreamLine);
}

/**
 * Overseers assigned to the logged-in Admin, each with their dashboard
 * indicators. The endpoint streams NDJSON (`application/x-ndjson`): a `meta`
 * line with `total_count`, then one line per overseer **in any order**, so the
 * result is sorted by `index`. The whole body is read at once (React Native
 * fetch/axios can't consume a stream incrementally).
 */
export async function getMyOverseers(): Promise<AdminOverseerSummary[]> {
  const res = await api.get<string>('dashboard/overseer-assignments/my-overseers', {
    responseType: 'text',
    // Keep the raw body: axios would otherwise try (and fail) to JSON.parse it.
    transformResponse: [(body: unknown) => body],
    timeout: 60000,
  });
  const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '');
  const lines = parseNdjson(raw);

  const failed = lines.find(line => line.success === false);
  if (failed) {
    throw new Error(failed.message || 'Failed to load overseers.');
  }

  return lines
    .filter(line => line.data?.type !== 'meta' && line.data?.item?.overseer_profile)
    .map(line => ({
      index: Number(line.data?.index ?? 0),
      profile: line.data!.item!.overseer_profile!,
      indicators: line.data?.item?.overseer_indicators ?? {},
      permissions: line.data?.item?.overseer_permissions,
      pastoralVisitsGraph: line.data?.item?.pastoral_visits_graph,
      churchPlantedGraph: line.data?.item?.church_planted_graph,
    }))
    .sort((a, b) => a.index - b.index);
}

const hasGraphData = (g: any) => Array.isArray(g?.data) && g.data.length > 0;

const firstAllowedName = (items: unknown) =>
  Array.isArray(items)
    ? items.map((i: any) => String(i?.name ?? '').trim()).find(Boolean) ?? ''
    : '';

/**
 * Chart payload for one overseer, shaped like dashboard/overseer-indicators:
 * attendance from overseer_indicators, visits/planted from the item's top
 * level (their copies inside overseer_indicators are empty).
 */
export function buildOverseerChartData(overseer: AdminOverseerSummary) {
  const indicators: any = overseer.indicators ?? {};
  const allowed = overseer.permissions?.allowedIds ?? {};
  return {
    indicators: {
      ...indicators,
      pastoral_visits_graph: hasGraphData(overseer.pastoralVisitsGraph)
        ? overseer.pastoralVisitsGraph
        : indicators.pastoral_visits_graph,
      church_planted_graph: hasGraphData(overseer.churchPlantedGraph)
        ? overseer.churchPlantedGraph
        : indicators.church_planted_graph,
    },
    header: {
      pastorName: overseer.profile.name,
      regionNation:
        firstAllowedName(allowed.geographicalRegionIds) ||
        firstAllowedName(allowed.churchRegionIds) ||
        String(overseer.profile.title || '').trim(),
    },
  };
}
