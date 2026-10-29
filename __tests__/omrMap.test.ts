/** OMR Map: API query (incl. date line), parsing, and on-screen grouping. */
jest.mock('../app/config/api', () => ({__esModule: true, default: {get: jest.fn()}}));

import api from '../app/config/api';
import {getChurchMapLocations} from '../app/modules/omrmap/services/omrMap.service';
import {clusterLocations, isSameSpot, normalizeRegion, regionToBounds, wrapLng} from '../app/modules/omrmap/utils/mapClusters';

const church = (id: number, latitude: number, longitude: number) => ({
  id,
  name: `C${id}`,
  short_name: '',
  latitude,
  longitude,
  address: '',
  city: '',
  phone: '',
  email: '',
  avg_attendance_last_12_weeks: null,
});

describe('getChurchMapLocations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the region filter and the visible area', async () => {
    (api.get as jest.Mock).mockResolvedValue({data: {data: [church(15, 10.76, 106.67)]}});
    const list = await getChurchMapLocations({
      geographicalRegionId: 3,
      bounds: {swLat: 10, neLat: 21.02, swLng: 105.8, neLng: 109.86},
    });
    expect((api.get as jest.Mock).mock.calls[0]).toEqual([
      'churches/map-locations',
      {params: {geographical_region_id: 3, bound_sw_lat: 10, bound_ne_lat: 21.02, bound_sw_lng: 105.8, bound_ne_lng: 109.86}},
    ]);
    expect(list.map(c => c.id)).toEqual([15]);
  });

  it('treats `data: null` as no churches and drops rows without valid coordinates', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({data: {data: null}});
    expect(await getChurchMapLocations()).toEqual([]);
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {data: [church(1, 10, 106), {...church(2, 0, 0), latitude: null}, {...church(3, 0, 0), latitude: '95'}, {...church(4, 0, 0), latitude: '10.5', longitude: '106.1'}]},
    });
    expect((await getChurchMapLocations()).map(c => [c.id, c.latitude])).toEqual([[1, 10], [4, 10.5]]);
  });

  it('an area across the date line is fetched as two halves, without duplicates', async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({data: {data: [church(95, -36.9, 174.7)]}})
      .mockResolvedValueOnce({data: {data: [church(95, -36.9, 174.7), church(7, -14, -171)]}});
    const list = await getChurchMapLocations({bounds: {swLat: -40, neLat: 0, swLng: 170, neLng: -170}});
    const ranges = (api.get as jest.Mock).mock.calls.map(c => [c[1].params.bound_sw_lng, c[1].params.bound_ne_lng]);
    expect(ranges).toEqual([[170, 180], [-180, -170]]);
    expect(list.map(c => c.id).sort()).toEqual([7, 95]);
  });
});

describe('map area and grouping', () => {
  it('visible area of a region, wrapped at the date line', () => {
    expect(regionToBounds({latitude: 15.5, longitude: 107.75, latitudeDelta: 11, longitudeDelta: 4})).toEqual({
      swLat: 10,
      neLat: 21,
      swLng: 105.75,
      neLng: 109.75,
    });
    const pacific = regionToBounds({latitude: 0, longitude: 180, latitudeDelta: 10, longitudeDelta: 20})!;
    expect([pacific.swLng, pacific.neLng]).toEqual([170, -170]);
    expect(regionToBounds({latitude: 15, longitude: 100, latitudeDelta: 140, longitudeDelta: 360})).toMatchObject({swLng: -180, neLng: 180});
    expect(wrapLng(190)).toBe(-170);
  });

  it('Android across the date line: a negative longitudeDelta is the real width (bug: map showed 0 churches)', () => {
    // As reported by Google Maps for a Thailand → New Zealand view.
    const reported = {latitude: -7.14, longitude: 148.86, latitudeDelta: 121.15, longitudeDelta: -257.99};
    expect(normalizeRegion(reported).longitudeDelta).toBeCloseTo(102.01, 2);
    const bounds = regionToBounds(reported);
    expect(bounds.swLng).toBeCloseTo(97.855, 2);
    expect(bounds.neLng).toBeCloseTo(-160.135, 2);
  });

  it('groups churches that would overlap and keeps far ones apart', () => {
    const hcmc = [church(1, 10.77, 106.67), church(2, 10.84, 106.71), church(3, 10.85, 106.72)];
    const world = {latitude: 15, longitude: 100, latitudeDelta: 140, longitudeDelta: 360};
    const groups = clusterLocations([...hcmc, church(95, -36.9, 174.7)], world);
    expect(groups.map(g => g.churches.length).sort()).toEqual([1, 3]);
    const city = {latitude: 10.8, longitude: 106.7, latitudeDelta: 0.2, longitudeDelta: 0.2};
    expect(clusterLocations(hcmc, city).length).toBeGreaterThan(1);
  });

  it('close churches never become two overlapping groups (grid split them)', () => {
    // The 9 Vietnam churches seen in a Thailand → New Zealand view.
    const vietnam = [
      church(15, 10.76441557, 106.67034427), church(5341, 10.8456068, 106.71693939), church(5339, 9.7761, 106.7003),
      church(5342, 10.84540653, 106.71736145), church(101, 12.46035506, 107.25263582), church(4498, 10.7761, 106.7003),
      church(76, 9.7761, 106.7003), church(4116, 11.80402025, 107.14069552), church(5281, 10.84383258, 106.71105708),
    ];
    const view = {latitude: -7.14, longitude: 148.86, latitudeDelta: 121.15, longitudeDelta: -257.99};
    const groups = clusterLocations([...vietnam, church(95, -36.9, 174.7)], view);
    expect(groups.map(g => g.churches.length).sort((a, b) => a - b)).toEqual([1, 9]);
  });

  it('knows when churches share one spot (zooming in cannot split them)', () => {
    expect(isSameSpot([church(76, 9.7761, 106.7003), church(5339, 9.7761, 106.7003)])).toBe(true);
    expect(isSameSpot([church(1, 10.77, 106.67), church(2, 10.84, 106.71)])).toBe(false);
  });
});
