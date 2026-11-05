/**
 * Church module fixes: social links from handles, city id lookup (the church
 * detail has no city_id) and the one-save-at-a-time submit guard.
 */
import React from 'react';
import renderer, {act} from 'react-test-renderer';

jest.mock('../app/config/api', () => ({__esModule: true, default: {get: jest.fn(), post: jest.fn()}}));

import api from '../app/config/api';
import {socialUrl} from '../app/modules/church/utils/socialLinks';
import {findCityIdByName} from '../app/modules/church/services/city.service';
import {useSubmitOnce} from '../app/shared/hooks/useSubmitOnce';

const mockGet = api.get as jest.Mock;

describe('socialUrl', () => {
  it('turns a bare handle into the profile URL', () => {
    expect(socialUrl('facebook', 'newlifechurch')).toBe('https://facebook.com/newlifechurch');
    expect(socialUrl('twitter', '@newlife')).toBe('https://x.com/newlife');
    expect(socialUrl('youtube', 'vfc')).toBe('https://youtube.com/@vfc');
  });

  it('keeps URLs and domains as typed', () => {
    expect(socialUrl('facebook', 'https://facebook.com/vfc')).toBe('https://facebook.com/vfc');
    expect(socialUrl('instagram', 'instagram.com/vfc')).toBe('https://instagram.com/vfc');
  });

  it('is empty for no value', () => {
    expect(socialUrl('facebook', '')).toBe('');
    expect(socialUrl('facebook', '   ')).toBe('');
    expect(socialUrl('facebook', null)).toBe('');
  });
});

describe('findCityIdByName', () => {
  beforeEach(() => mockGet.mockReset());

  it('finds the city of the nation by name, ignoring case and spaces', async () => {
    mockGet.mockResolvedValueOnce({data: {data: [{id: 81, name: 'Perth'}, {id: 3303, name: 'Adelaide'}]}});
    await expect(findCityIdByName(13, ' adelaide ')).resolves.toBe(3303);
    expect(mockGet).toHaveBeenCalledWith('cities/country/13', expect.anything());
  });

  it('is null when there is no match, no name or the request fails', async () => {
    mockGet.mockResolvedValueOnce({data: {data: [{id: 81, name: 'Perth'}]}});
    await expect(findCityIdByName(13, 'Hobart')).resolves.toBeNull();
    await expect(findCityIdByName(13, '')).resolves.toBeNull();
    mockGet.mockRejectedValueOnce(new Error('offline'));
    await expect(findCityIdByName(13, 'Perth')).resolves.toBeNull();
  });
});

describe('useSubmitOnce', () => {
  it('ignores a second call while the first save is running', async () => {
    let submitOnce: ReturnType<typeof useSubmitOnce> | null = null;
    const Probe = () => {
      submitOnce = useSubmitOnce();
      return null;
    };
    await act(async () => {
      renderer.create(<Probe />);
    });

    let release: () => void = () => {};
    const handler = jest.fn(() => new Promise<void>(resolve => (release = resolve)));
    const guarded = submitOnce!(handler);

    const first = guarded();
    const second = guarded(); // double tap
    expect(handler).toHaveBeenCalledTimes(1);
    release();
    await first;
    await second;

    // Once the first save finished, saving again works.
    const third = guarded();
    expect(handler).toHaveBeenCalledTimes(2);
    release();
    await third;
  });

  it('allows a retry after a failed save', async () => {
    let submitOnce: ReturnType<typeof useSubmitOnce> | null = null;
    const Probe = () => {
      submitOnce = useSubmitOnce();
      return null;
    };
    await act(async () => {
      renderer.create(<Probe />);
    });
    const handler = jest.fn().mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(undefined);
    const guarded = submitOnce!(handler);
    await expect(guarded()).rejects.toThrow('500');
    await guarded();
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
