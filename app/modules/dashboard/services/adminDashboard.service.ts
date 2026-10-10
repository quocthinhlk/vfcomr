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
  indicators: OverseerIndicatorValues;
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
    }))
    .sort((a, b) => a.index - b.index);
}
