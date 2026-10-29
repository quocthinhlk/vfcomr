import type {ChurchMapLocation, MapBounds} from '../services/omrMap.service';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export type MapCluster = {
  key: string;
  latitude: number;
  longitude: number;
  churches: ChurchMapLocation[];
};

const clampLat = (value: number) => Math.max(-90, Math.min(90, value));

/** Wraps a longitude into [-180, 180] (values already inside are kept exactly). */
export const wrapLng = (value: number) =>
  value >= -180 && value <= 180 ? value : ((((value + 180) % 360) + 360) % 360) - 180;

/**
 * A map region with sane deltas. Google Maps on Android reports a NEGATIVE
 * longitudeDelta when the view crosses the date line (east edge minus west
 * edge, unwrapped: -258 for a 102° wide view); used as is, the visible area
 * and the grouping were wrong and the map showed no churches.
 */
export function normalizeRegion<R extends MapRegion>(region: R): R {
  let longitudeDelta = region.longitudeDelta;
  if (longitudeDelta < 0) {
    longitudeDelta += 360;
  }
  return {
    ...region,
    longitude: wrapLng(region.longitude),
    latitudeDelta: Math.min(Math.abs(region.latitudeDelta), 180),
    longitudeDelta: Math.min(longitudeDelta, 360),
  };
}

/** The visible area of a map region. */
export function regionToBounds(rawRegion: MapRegion): MapBounds {
  const region = normalizeRegion(rawRegion);
  if (region.longitudeDelta >= 359) {
    return {
      swLat: clampLat(region.latitude - region.latitudeDelta / 2),
      neLat: clampLat(region.latitude + region.latitudeDelta / 2),
      swLng: -180,
      neLng: 180,
    };
  }
  return {
    swLat: clampLat(region.latitude - region.latitudeDelta / 2),
    neLat: clampLat(region.latitude + region.latitudeDelta / 2),
    swLng: wrapLng(region.longitude - region.longitudeDelta / 2),
    neLng: wrapLng(region.longitude + region.longitudeDelta / 2),
  };
}

/**
 * Groups churches that would overlap on screen: a church joins the first
 * group whose first church is within about 1/`cellsAcross` of the visible
 * width (and the matching height); otherwise it starts a new group. A single
 * church stays its own marker. (A fixed grid split close churches into
 * neighbouring cells, so two group bubbles were drawn on top of each other.)
 */
export function clusterLocations(
  locations: ChurchMapLocation[],
  rawRegion: MapRegion,
  cellsAcross = 7,
): MapCluster[] {
  const region = normalizeRegion(rawRegion);
  const radiusLng = Math.max(region.longitudeDelta / cellsAcross, 1e-6);
  const radiusLat = Math.max(region.latitudeDelta / (cellsAcross * 1.6), 1e-6);
  const groups: ChurchMapLocation[][] = [];
  const sorted = [...locations].sort((x, y) => x.latitude - y.latitude || x.longitude - y.longitude);
  sorted.forEach(location => {
    const group = groups.find(list => {
      const anchor = list[0];
      const dLng = Math.abs(anchor.longitude - location.longitude);
      return (
        Math.abs(anchor.latitude - location.latitude) <= radiusLat &&
        Math.min(dLng, 360 - dLng) <= radiusLng
      );
    });
    if (group) {
      group.push(location);
    } else {
      groups.push([location]);
    }
  });
  return groups.map(churches => ({
    key: churches.length === 1 ? `c${churches[0].id}` : `g${churches[0].id}-${churches.length}`,
    latitude: churches.reduce((sum, c) => sum + c.latitude, 0) / churches.length,
    longitude: churches.reduce((sum, c) => sum + c.longitude, 0) / churches.length,
    churches,
  }));
}

/** True when the churches share (almost) the same spot, so zooming in can't separate them. */
export function isSameSpot(churches: ChurchMapLocation[], tolerance = 0.0005): boolean {
  if (churches.length < 2) {
    return true;
  }
  const lats = churches.map(c => c.latitude);
  const lngs = churches.map(c => c.longitude);
  return (
    Math.max(...lats) - Math.min(...lats) <= tolerance &&
    Math.max(...lngs) - Math.min(...lngs) <= tolerance
  );
}

/** "1.2k" style label for a cluster count. */
export const clusterLabel = (count: number) =>
  count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count);
