import api from '../../../config/api';

export interface ChurchMapLocation {
  id: number;
  name: string;
  short_name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  phone: string;
  email: string;
  avg_attendance_last_12_weeks: number | null;
}

/** Visible map area: south-west and north-east corners. */
export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface MapLocationsQuery {
  geographicalRegionId?: number | null;
  bounds?: MapBounds | null;
}

/** A coordinate from the API, or NaN when missing (`Number(null)` would be 0: a pin off Africa). */
const coordinate = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim()) ? NaN : Number(value);

function toLocation(raw: any): ChurchMapLocation | null {
  const latitude = coordinate(raw?.latitude);
  const longitude = coordinate(raw?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  const avg = raw?.avg_attendance_last_12_weeks;
  return {
    id: Number(raw?.id),
    name: String(raw?.name ?? '').trim(),
    short_name: String(raw?.short_name ?? '').trim(),
    latitude,
    longitude,
    address: String(raw?.address ?? '').trim(),
    city: String(raw?.city ?? '').trim(),
    phone: String(raw?.phone ?? '').trim(),
    email: String(raw?.email ?? '').trim(),
    avg_attendance_last_12_weeks: avg === null || avg === undefined || avg === '' ? null : Number(avg),
  };
}

/**
 * GET churches/map-locations: churches that have map coordinates, optionally
 * in a geographical region and / or inside the visible map area. The API
 * answers `data: null` when nothing matches.
 *
 * An area that crosses the date line (west edge east of the east edge) can't
 * be expressed as one longitude range, so it is fetched as two halves.
 */
export async function getChurchMapLocations(query: MapLocationsQuery = {}): Promise<ChurchMapLocation[]> {
  const base: Record<string, number> = {};
  if (query.geographicalRegionId) {
    base.geographical_region_id = query.geographicalRegionId;
  }
  const b = query.bounds;
  const ranges: Array<Record<string, number>> = [];
  if (!b) {
    ranges.push({});
  } else {
    const lat = {bound_sw_lat: b.swLat, bound_ne_lat: b.neLat};
    if (b.swLng <= b.neLng) {
      ranges.push({...lat, bound_sw_lng: b.swLng, bound_ne_lng: b.neLng});
    } else {
      ranges.push({...lat, bound_sw_lng: b.swLng, bound_ne_lng: 180});
      ranges.push({...lat, bound_sw_lng: -180, bound_ne_lng: b.neLng});
    }
  }
  const responses = await Promise.all(
    ranges.map(range => api.get('churches/map-locations', {params: {...base, ...range}})),
  );
  const byId = new Map<number, ChurchMapLocation>();
  responses.forEach(response => {
    const list = Array.isArray(response?.data?.data) ? response.data.data : [];
    list.forEach((raw: any) => {
      const location = toLocation(raw);
      if (location && Number.isFinite(location.id)) {
        byId.set(location.id, location);
      }
    });
  });
  return [...byId.values()];
}
