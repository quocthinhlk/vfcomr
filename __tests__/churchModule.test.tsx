/**
 * Church module: date helpers, API error splitting, list merging and the
 * form-options loader. Run in several time zones, e.g.
 *   TZ=America/Sao_Paulo npx jest __tests__/churchModule.test.tsx
 *   TZ=Asia/Ho_Chi_Minh npx jest __tests__/churchModule.test.tsx
 */
import React from 'react';
import renderer, {act} from 'react-test-renderer';

jest.mock('../app/config/api', () => ({__esModule: true, default: {get: jest.fn(), post: jest.fn()}}));

import api from '../app/config/api';
import {
  fillTemplate,
  formatYmd,
  parseYmd,
  splitApiFieldErrors,
} from '../app/modules/church/utils/churchForm';
import {
  mergeAssignedChurchesLists,
  parseChurchBooleanFlag,
  sortChurchesForAssignedList,
} from '../app/modules/church/utils/churchListOrder';
import {useFormOptions} from '../app/modules/church/screens/utils/addChurch.utils';

describe('church dates', () => {
  it('reads an API date as that calendar day in any time zone', () => {
    const d = parseYmd('2023-01-01');
    expect(d && [d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2023, 0, 1]);
    const iso = parseYmd('2018-05-10T00:00:00Z');
    expect(iso && [iso.getFullYear(), iso.getMonth(), iso.getDate()]).toEqual([2018, 4, 10]);
  });

  it('round-trips without moving the day (load → save → load)', () => {
    let value = '2020-05-10';
    for (let i = 0; i < 3; i++) {
      value = formatYmd(parseYmd(value)) as string;
    }
    expect(value).toBe('2020-05-10');
  });

  it('formats a picked local date as the same day', () => {
    expect(formatYmd(new Date(2020, 4, 10))).toBe('2020-05-10');
    expect(formatYmd(null)).toBeNull();
    expect(formatYmd(new Date('nope'))).toBeNull();
    expect(parseYmd('')).toBeNull();
    expect(parseYmd(null)).toBeNull();
  });
});

describe('API field errors', () => {
  const shown = new Set(['name', 'email_address']);

  it('keeps errors with a field on the form and collects the rest for an alert', () => {
    const result = splitApiFieldErrors(
      {name: 'Name taken', website: 'Invalid URL', detail: 'Forbidden', email_address: ['Bad', 'Email']},
      shown,
    );
    expect(result.fieldErrors).toEqual({name: 'Name taken', email_address: 'Bad\nEmail'});
    expect(result.otherMessages).toEqual(['Invalid URL', 'Forbidden']);
  });

  it('handles prefixes and empty input', () => {
    expect(splitApiFieldErrors({'church.name': 'x'}, shown, 'church.').fieldErrors).toEqual({name: 'x'});
    expect(splitApiFieldErrors(undefined, shown)).toEqual({fieldErrors: {}, otherMessages: []});
  });

  it('fills templates', () => {
    expect(fillTemplate('The {field} field is required.', {field: 'Church'})).toBe(
      'The Church field is required.',
    );
    expect(fillTemplate('{age} years old', {})).toBe('{age} years old');
  });
});

describe('church list helpers', () => {
  it('merging a sparser list keeps what the first one knows', () => {
    const [row] = mergeAssignedChurchesLists(
      [{id: 76, name: 'VFC', disabled: true, parent_id: 5, is_msc: true}],
      [{id: 76}],
    );
    expect(row).toMatchObject({id: 76, name: 'VFC', disabled: true, parent_id: 5, is_msc: true});
  });

  it('merging takes defined values from the second list', () => {
    const [row] = mergeAssignedChurchesLists(
      [{id: 1, name: 'Old', city: 'A'}],
      [{id: 1, name: 'New', city: 'B'}],
    );
    expect(row).toMatchObject({name: 'New', city: 'B'});
  });

  it('parses flag values', () => {
    expect(['N', 'n', 'no', '0', 0, false, null, ''].map(parseChurchBooleanFlag)).toEqual(
      Array(8).fill(false),
    );
    expect(['Y', 'yes', 'true', '1', 1, true].map(parseChurchBooleanFlag)).toEqual(Array(6).fill(true));
  });

  it('sorts First MSC, then MSC, then by city and name', () => {
    const sorted = sortChurchesForAssignedList([
      {name: 'b', city: 'x'},
      {name: 'a', city: 'y', is_msc: true},
      {name: 'c', city: 'z', is_first_msc: true},
      {name: 'a', city: 'x'},
    ]);
    expect(sorted.map(c => c.name + c.city)).toEqual(['cz', 'ay', 'ax', 'bx']);
  });
});

describe('useFormOptions', () => {
  const page = (items: any[], extra: any = {}) => ({data: {data: {items, ...extra}}});
  const list = (items: any[]) => ({data: {data: items}});

  it('shows the required lookups before the long language / church lists finish', async () => {
    let releaseLanguages!: () => void;
    const languagesGate = new Promise<void>(resolve => {
      releaseLanguages = resolve;
    });
    (api.get as jest.Mock).mockImplementation(async (url: string, config?: any) => {
      const p = config?.params?.page;
      switch (url) {
        case 'church-types':
          return list([{id: 1, name: 'Type'}]);
        case 'users/pastors':
          return page([{id: 7, name: 'Pastor'}], {has_next: true});
        case 'church-networks':
        case 'church-regions':
        case 'language-regions':
          return list([{id: 2, name: url}]);
        case 'geographical-regions':
          return page([{id: 3, name: 'World', children: [{id: 4, name: 'Asia'}]}]);
        case 'countries':
          return page([{id: 5, name: 'Vietnam'}]);
        case 'currencies':
          return page([{id: 6, name: 'Dong', three_letter_code: 'VND'}]);
        case 'languages':
          await languagesGate;
          return page([{id: 100 + p, name: `Lang ${p}`}], {total_pages: 3});
        case 'churches':
          return page([{id: 200 + p, name: `Church ${p}`}], {total_pages: 2});
      }
      throw new Error(`unexpected ${url}`);
    });

    let latest: ReturnType<typeof useFormOptions> | null = null;
    const Probe = () => {
      latest = useFormOptions();
      return null;
    };
    await act(async () => {
      renderer.create(<Probe />);
    });
    await act(async () => {});

    // Phase 1 is visible while languages are still loading.
    expect(latest!.churchTypeOptions).toEqual([{label: 'Type', value: '1'}]);
    expect(latest!.pastorHasNext).toBe(true);
    expect(latest!.geographicalRegionOptions.map(o => o.label)).toEqual(['World', '-Asia']);
    expect(latest!.localCurrencyOptions).toEqual([{label: 'Dong (VND)', value: '6'}]);
    expect(latest!.languageOptions).toEqual([]);
    expect(latest!.loading).toBe(true);

    await act(async () => {
      releaseLanguages();
    });
    await act(async () => {});
    expect(latest!.languageOptions.map(o => o.value)).toEqual(['101', '102', '103']);
    expect(latest!.motherChurchOptions.map(o => o.value)).toEqual(['201', '202']);
    expect(latest!.loading).toBe(false);
    expect(latest!.error).toBeNull();
  });

  it('a failure of the long lists does not turn the form into an error', async () => {
    (api.get as jest.Mock).mockImplementation(async (url: string) => {
      if (url === 'languages') {
        throw new Error('offline');
      }
      if (url === 'churches' || url === 'users/pastors' || url === 'geographical-regions') {
        return page([]);
      }
      return url === 'countries' || url === 'currencies' ? page([]) : list([]);
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let latest: ReturnType<typeof useFormOptions> | null = null;
    const Probe = () => {
      latest = useFormOptions();
      return null;
    };
    await act(async () => {
      renderer.create(<Probe />);
    });
    await act(async () => {});
    expect(latest!.error).toBeNull();
    expect(latest!.loading).toBe(false);
    warn.mockRestore();
  });

  it('a failure of the required lookups is reported', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('offline'));
    let latest: ReturnType<typeof useFormOptions> | null = null;
    const Probe = () => {
      latest = useFormOptions();
      return null;
    };
    await act(async () => {
      renderer.create(<Probe />);
    });
    await act(async () => {});
    expect((latest!.error as Error)?.message).toBe('offline');
    expect(latest!.loading).toBe(false);
  });
});
