/**
 * Church planting projections: date handling (no UTC day shift), business
 * rules mirrored from the web (original dates kept, optional distance, steps
 * completed), list paging / local search, and the add / edit / steps / delete
 * screens against a mocked API.
 */
// Run with TZ=America/New_York too (see the first test): west of UTC,
// `new Date('2026-02-10')` is Feb 9, which is the bug fixed here.
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert, Text, TextInput} from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('@ui-kitten/components', () => {
  const RN = require('react-native');
  return {Text: RN.Text, Layout: RN.View, Button: RN.TouchableOpacity, Input: RN.TextInput};
});
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  return {
    SafeAreaView: RN.View,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  };
});
jest.mock('../app/config/api', () => ({
  __esModule: true,
  DEFAULT_PAGE_LIMIT: 10,
  default: {get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn()},
}));
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
  getState: jest.fn(() => ({index: 1, routes: [{name: 'ChurchPlantingProjections'}, {name: 'X'}]})),
  canGoBack: () => true,
};
let mockRouteParams: any = {};
jest.mock('@react-navigation/native', () => {
  const ReactLib = require('react');
  return {
    useNavigation: () => mockNavigation,
    useRoute: () => ({params: mockRouteParams}),
    useFocusEffect: (cb: () => void) => ReactLib.useEffect(cb, [cb]),
  };
});
jest.mock('../app/shared/components/Header', () => ({Header: () => null}));
// RN 0.78's RefreshControl jest mock renders an invalid native component.
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const RN = jest.requireActual('react-native/Libraries/Components/View/View');
  return RN.default ?? RN;
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import DateTripleDropdown from '../app/shared/components/DateTripleDropdown';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import {
  addMonths,
  buildCreatePayload,
  buildStepsPayload,
  buildUpdatePayload,
  completedStepsOf,
  filterProjections,
  formValuesFromProjection,
  formatApiDate,
  formatDisplayDate,
  parseApiDate,
  parsePopulation,
  sanitizeDistance,
  sanitizePopulation,
  validateProjectionForm,
  EMPTY_PROJECTION_FORM,
} from '../app/modules/churchplantingprojections/utils/projection.utils';
import {
  listChurchPlantingProjections,
  ChurchPlantingProjectionItem,
} from '../app/modules/churchplantingprojections/services/churchPlantingProjection.service';
import ChurchPlantingProjectionsScreen from '../app/modules/churchplantingprojections/screens/ChurchPlantingProjectionsScreen';
import ChurchPlantingProjectionDetailScreen from '../app/modules/churchplantingprojections/screens/ChurchPlantingProjectionDetailScreen';
import AddChurchPlantingProjectionScreen from '../app/modules/churchplantingprojections/screens/AddChurchPlantingProjectionScreen';
import EditChurchPlantingProjectionScreen from '../app/modules/churchplantingprojections/screens/EditChurchPlantingProjectionScreen';
import DeleteChurchPlantingProjectionScreen from '../app/modules/churchplantingprojections/screens/DeleteChurchPlantingProjectionScreen';
import EditStepsChartScreen from '../app/modules/churchplantingprojections/screens/EditStepsChartScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

/** Shapes taken from the staging API (records 30 / 713). */
const projection = (over: Partial<ChurchPlantingProjectionItem> = {}): ChurchPlantingProjectionItem => ({
  id: 712,
  church_id: 76,
  town: 'QA Town',
  country_id: 231,
  proposed_church_name: 'QA CPP Test',
  proposed_leader_name: 'QA Leader',
  population: 1500,
  start_date_preparation: '2026-04-15',
  start_date_preparation_original: '2026-02-10',
  start_date_pioneering: '2026-10-15',
  start_date_pioneering_original: '2026-08-10',
  distance_to_town: '',
  distance_to_town_unit: 'km',
  user_id: 4825,
  steps_completed: [false, false, false, false, false, false],
  steps_date_completed: {
    step1_date_completed: null,
    step2_date_completed: null,
    step3_date_completed: null,
    step4_date_completed: null,
    step5_date_completed: null,
    step6_date_completed: null,
  },
  created: '2026-11-05T13:07:03Z',
  modified: '2026-11-05T13:07:03Z',
  ...over,
});

const stepsChart = (over: Record<string, unknown> = {}) => {
  const c: Record<string, unknown> = {
    id: 709,
    church_planting_projection_id: 712,
    date_proposed: null,
    date_completed: null,
    created: null,
    modified: null,
  };
  for (let r = 1; r <= 9; r++) {
    c[`row${r}_title`] = `Row ${r}`;
  }
  for (let s = 1; s <= 6; s++) {
    c[`step${s}_date_proposed`] = `2026-0${s}-15`;
    c[`step${s}_date_proposed_original`] = `2025-0${s}-15`;
    c[`step${s}_date_completed`] = null;
    for (let r = 1; r <= 9; r++) {
      c[`step${s}_row${r}_value`] = r === 7 ? 'Work out Budget.\r[To be Reproducible]' : `v${s}${r}`;
      c[`step${s}_row${r}_completed`] = null;
    }
  }
  for (let s = 7; s <= 9; s++) {
    for (let r = 1; r <= 9; r++) {
      c[`step${s}_row${r}_completed`] = null;
    }
  }
  return {...c, ...over} as any;
};

const COUNTRIES = [
  {id: 1, name: 'Afganistan'},
  {id: 2, name: 'Albania'},
];

const mount = (el: React.ReactElement) => {
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(
      <ThemeProvider>
        <LanguageProvider>{el}</LanguageProvider>
      </ThemeProvider>,
    );
  });
  return root;
};
const flush = () => act(async () => {});
const texts = (root: renderer.ReactTestRenderer) =>
  root.root
    .findAllByType(Text)
    .map(n => [].concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''));
const pressText = async (root: renderer.ReactTestRenderer, label: string) => {
  const target = root.root.findAll(
    n => typeof n.props.onPress === 'function' && texts({root: n} as any).some(s => s === label),
  )[0];
  if (!target) {
    throw new Error(`no button "${label}"`);
  }
  await act(async () => {
    target.props.onPress();
  });
  return target;
};
const inputByPlaceholder = (root: renderer.ReactTestRenderer, placeholder: string) =>
  root.root.findAll(n => n.type === TextInput && n.props.placeholder === placeholder)[0];
const type = async (root: renderer.ReactTestRenderer, placeholder: string, value: string) => {
  await act(async () => inputByPlaceholder(root, placeholder).props.onChangeText(value));
};
const dateDropdowns = (root: renderer.ReactTestRenderer) => root.root.findAllByType(DateTripleDropdown);

const routeApi = (handlers: Record<string, (config?: any) => any>) => {
  mockGet.mockImplementation(async (url: string, config?: any) => {
    const key = Object.keys(handlers).find(k => url === k || url.replace(/^\//, '') === k);
    if (!key) {
      throw {isAxiosError: true, response: {status: 404, data: {success: false, message: 'not found'}}};
    }
    return handlers[key](config);
  });
};

const defaultApi = (p = projection()) =>
  routeApi({
    'churches/76': () => ({data: {data: {id: 76, name: 'VFC Saigon'}}}),
    countries: () => ({data: {data: {items: COUNTRIES, has_next: true}}}),
    'countries/231': () => ({data: {data: {id: 231, name: 'Vietnam'}}}),
    [`church-planting-projections/${p.id}`]: () => ({data: {success: true, data: p}}),
    [`church-planting-projections/${p.id}/steps`]: () => ({data: {success: true, data: stepsChart()}}),
    'church-planting-projections': (config: any) => ({
      data: {success: true, data: {items: [p], total: 1, page: config?.params?.page ?? 1, has_next: false}},
    }),
  });

beforeEach(async () => {
  jest.clearAllMocks();
  mockRouteParams = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await AsyncStorage.setItem('selectedChurchId', '76');
  defaultApi();
});

describe('dates', () => {
  it('west of UTC, new Date("YYYY-MM-DD") is the day before (why parseApiDate exists)', () => {
    const west = new Date(2026, 1, 10).getTimezoneOffset() > 0;
    expect(new Date('2026-02-10').getDate()).toBe(west ? 9 : 10);
  });

  it('parses API dates as local days and formats them back unchanged', () => {
    const d = parseApiDate('2026-02-10')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 1, 10]);
    expect(formatApiDate(d)).toBe('2026-02-10');
    expect(formatApiDate(parseApiDate('2015-08-11T14:15:59Z'))).toBe('2015-08-11');
    expect(parseApiDate('2026-02-30')).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate(null)).toBeNull();
    expect(formatApiDate(null)).toBeNull();
    expect(formatDisplayDate(null)).toBe('-');
    expect(formatDisplayDate('2026-02-10')).toBe(new Date(2026, 1, 10).toLocaleDateString());
  });

  it('adds six months like the web (end of month clamps)', () => {
    expect(formatApiDate(addMonths(new Date(2026, 1, 10), 6))).toBe('2026-08-10');
    expect(formatApiDate(addMonths(new Date(2026, 7, 31), 6))).toBe('2027-02-28');
  });
});

describe('business rules', () => {
  it('counts completed steps from flags or completed dates, out of 6', () => {
    expect(completedStepsOf(projection({steps_completed: []}))).toEqual({done: 0, total: 6});
    expect(completedStepsOf(projection({steps_completed: [true, false, true, true, true, true]}))).toEqual({done: 5, total: 6});
    expect(
      completedStepsOf(
        projection({
          steps_completed: [],
          steps_date_completed: {...projection().steps_date_completed, step2_date_completed: '2023-04-01'},
        }),
      ),
    ).toEqual({done: 1, total: 6});
  });

  it('searches church, town and leader names ignoring case and accents', () => {
    const items = [
      projection({id: 1, proposed_church_name: 'Hội Thánh Vũng Tàu'}),
      projection({id: 2, town: 'Da Lat'}),
      projection({id: 3, proposed_leader_name: 'Thinh Truong'}),
    ];
    expect(filterProjections(items, 'vung tau').map(p => p.id)).toEqual([1]);
    expect(filterProjections(items, ' DA LAT ').map(p => p.id)).toEqual([2]);
    expect(filterProjections(items, 'truong').map(p => p.id)).toEqual([3]);
    expect(filterProjections(items, '')).toHaveLength(3);
  });

  it('keeps population and distance numeric', () => {
    expect(sanitizePopulation('1,500 people')).toBe('1500');
    expect(parsePopulation('1,500')).toBe(1500);
    expect(parsePopulation('')).toBeNull();
    expect(sanitizeDistance('2,5 km')).toBe('2.5');
    expect(sanitizeDistance('1.2.3')).toBe('1.23');
  });

  it('requires dates when creating only, and never the distance', () => {
    const filled = {
      ...EMPTY_PROJECTION_FORM,
      town: 'T',
      countryId: 231,
      proposedChurchName: 'C',
      proposedLeaderName: 'L',
    };
    expect(validateProjectionForm(filled, 'edit')).toEqual({});
    expect(validateProjectionForm(filled, 'create')).toEqual({
      startDatePreparation: true,
      startDatePioneering: true,
    });
    expect(validateProjectionForm({...filled, town: '  '}, 'edit')).toEqual({town: true});
  });

  it('edit keeps the original dates and sends null (not "") for no date', () => {
    const record = projection({start_date_preparation: null, start_date_pioneering: null});
    const values = formValuesFromProjection(record);
    // Web-created records only have the original dates: shown as current.
    expect(formatApiDate(values.startDatePreparation)).toBe('2026-02-10');
    const payload = buildUpdatePayload({...values, startDatePioneering: null}, record);
    expect(payload.start_date_preparation).toBe('2026-02-10');
    expect(payload.start_date_preparation_original).toBe('2026-02-10');
    expect(payload.start_date_pioneering).toBeNull();
    expect(payload.start_date_pioneering_original).toBe('2026-08-10');
    expect(payload.user_id).toBe(4825);
  });

  it('create sets the planned dates as current and original', () => {
    const payload = buildCreatePayload(
      {
        ...EMPTY_PROJECTION_FORM,
        town: ' T ',
        countryId: 231,
        proposedChurchName: 'C',
        proposedLeaderName: 'L',
        population: '1500',
        startDatePreparation: new Date(2026, 1, 10),
        startDatePioneering: new Date(2026, 7, 10),
      },
      76,
    );
    expect(payload).toMatchObject({
      church_id: 76,
      town: 'T',
      population: 1500,
      start_date_preparation: '2026-02-10',
      start_date_preparation_original: '2026-02-10',
      start_date_pioneering: '2026-08-10',
      start_date_pioneering_original: '2026-08-10',
      distance_to_town: '',
      distance_to_town_unit: 'km',
    });
  });

  it('steps payload has every field the web sends and keeps originals', () => {
    const payload = buildStepsPayload(stepsChart());
    // 2 chart dates + 9 titles + 6 steps × (3 dates + 9 values + 9 flags) + 3 × 9 flags.
    expect(Object.keys(payload)).toHaveLength(2 + 9 + 6 * 21 + 27);
    expect(payload.step1_date_proposed_original).toBe('2025-01-15');
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('created');
  });
});

describe('service', () => {
  it('loads every page of the church (the API pages by 10)', async () => {
    mockGet.mockReset();
    mockGet
      .mockResolvedValueOnce({data: {success: true, data: {items: [projection({id: 1})], total: 2, has_next: true}}})
      .mockResolvedValueOnce({data: {success: true, data: {items: [projection({id: 2})], total: 2, has_next: false}}});
    const res = await listChurchPlantingProjections(25, true);
    expect(res.data.items.map(p => p.id)).toEqual([1, 2]);
    expect(mockGet).toHaveBeenNthCalledWith(1, '/church-planting-projections', {
      params: {church_id: 25, completed_steps: true, page: 1, limit: 500},
    });
    expect(mockGet.mock.calls[1][1].params.page).toBe(2);
  });
});

describe('list screen', () => {
  it('shows the church, dates without day shift and steps; search is local', async () => {
    const items = [
      projection({id: 30, proposed_church_name: 'Hoe Mon', steps_completed: [true, false, true, true, true, true]}),
      projection({id: 713, proposed_church_name: 'Web created', start_date_preparation: null}),
    ];
    routeApi({
      'churches/76': () => ({data: {data: {name: 'VFC Saigon'}}}),
      'church-planting-projections': () => ({data: {success: true, data: {items, has_next: false}}}),
    });
    const root = mount(<ChurchPlantingProjectionsScreen />);
    await flush();
    const all = texts(root).join('\n');
    expect(all).toContain('VFC Saigon');
    expect(all).toContain('Hoe Mon');
    expect(all).toContain(new Date(2026, 3, 15).toLocaleDateString());
    // Web-created record: falls back to the original preparation date.
    expect(all).toContain(new Date(2026, 1, 10).toLocaleDateString());
    expect(all).toMatch(/5 \/ 6/);

    const calls = mockGet.mock.calls.length;
    const search = root.root.findAll(n => n.type === TextInput)[0];
    await act(async () => search.props.onChangeText('web'));
    await act(async () => search.props.onChangeText('web c'));
    expect(mockGet.mock.calls.length).toBe(calls);
    const after = texts(root).join('\n');
    expect(after).toContain('Web created');
    expect(after).not.toContain('Hoe Mon');
  });

  it('shows a retryable error when loading fails', async () => {
    mockGet.mockRejectedValue({isAxiosError: true, message: 'Network Error'});
    const root = mount(<ChurchPlantingProjectionsScreen />);
    await flush();
    expect(root.root.findAll(n => n.props.onRetry).length).toBeGreaterThan(0);
  });
});

describe('detail screen', () => {
  it('shows steps done, completed dates and values without \\r', async () => {
    mockRouteParams = {projectionId: 712};
    routeApi({
      'church-planting-projections/712': () => ({
        data: {data: projection({steps_completed: [], steps_date_completed: {...projection().steps_date_completed, step1_date_completed: '2026-03-20'}})},
      }),
      'church-planting-projections/712/steps': () => ({
        data: {data: stepsChart({step1_date_completed: '2026-03-20'})},
      }),
      'churches/76': () => ({data: {data: {name: 'VFC Saigon'}}}),
    });
    const root = mount(<ChurchPlantingProjectionDetailScreen />);
    await flush();
    const all = texts(root);
    expect(all.join('\n')).toContain('1 / 6');
    expect(all.some(s => s.includes(new Date(2026, 2, 20).toLocaleDateString()))).toBe(true);
    expect(all.some(s => s.includes('\r'))).toBe(false);
    expect(all).toContain('Work out Budget.\n[To be Reproducible]');
    // Distance not entered: "-" rather than " km".
    expect(all).not.toContain(' km');
  });
});

describe('add screen', () => {
  it('validates, defaults pioneering to +6 months, saves once and returns to the list', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddChurchPlantingProjectionScreen />);
    await flush();

    await pressText(root, 'Save');
    expect(mockPost).not.toHaveBeenCalled();
    expect(texts(root).filter(s => s === 'Required').length).toBe(6);

    await type(root, 'Town', 'QA Town');
    await type(root, 'Proposed Church Name', 'QA Church');
    await type(root, 'Proposed Leader Name', 'QA Leader');
    await type(root, 'Population', '1,500');
    await type(root, 'Distance', '2,5');
    const country = root.root.findAllByType(ElementDropdown).find(d => d.props.placeholder === 'Select Country')!;
    await act(async () => country.props.onChange(2));
    await act(async () => dateDropdowns(root)[0].props.onChange(new Date(2026, 1, 10)));
    expect(formatApiDate(dateDropdowns(root)[1].props.value)).toBe('2026-08-10');
    expect(texts(root)).not.toContain('Required');

    const save = root.root.findAll(
      n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes('Save'),
    )[0];
    await act(async () => {
      save.props.onPress();
      save.props.onPress(); // double tap
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][1]).toMatchObject({
      church_id: 76,
      country_id: 2,
      population: 1500,
      distance_to_town: '2.5',
      start_date_preparation: '2026-02-10',
      start_date_pioneering_original: '2026-08-10',
    });
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith(
      'ChurchPlantingProjections',
      expect.objectContaining({reload: true}),
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('replaces the form with the list when opened from the dashboard', async () => {
    mockNavigation.getState.mockReturnValueOnce({index: 1, routes: [{name: 'Dashboard'}, {name: 'AddChurchPlantingProjection'}]} as any);
    mockPost.mockResolvedValue({data: {success: true}});
    const root = mount(<AddChurchPlantingProjectionScreen />);
    await flush();
    await type(root, 'Town', 'T');
    await type(root, 'Proposed Church Name', 'C');
    await type(root, 'Proposed Leader Name', 'L');
    const country = root.root.findAllByType(ElementDropdown).find(d => d.props.placeholder === 'Select Country')!;
    await act(async () => country.props.onChange(1));
    await act(async () => dateDropdowns(root)[0].props.onChange(new Date(2026, 0, 31)));
    await pressText(root, 'Save');
    expect(mockPost.mock.calls[0][1].start_date_pioneering).toBe('2026-07-31');
    expect(mockNavigation.replace).toHaveBeenCalledWith('ChurchPlantingProjections', expect.anything());
  });
});

describe('edit screen', () => {
  it('shows the saved nation and dates; saving keeps the original dates', async () => {
    mockRouteParams = {projectionId: 712};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchPlantingProjectionScreen />);
    await flush();
    const country = root.root.findAllByType(ElementDropdown).find(d => d.props.placeholder === 'Select Country')!;
    expect(country.props.value).toBe(231);
    expect(country.props.data[0]).toEqual({label: 'Vietnam', value: 231});
    expect(formatApiDate(dateDropdowns(root)[0].props.value)).toBe('2026-04-15');

    // Empty distance (107 records) no longer blocks saving.
    await type(root, 'Town', 'QA Town edited');
    await pressText(root, 'Save');
    expect(mockPatch).toHaveBeenCalledTimes(1);
    const [url, payload] = mockPatch.mock.calls[0];
    expect(url).toBe('/church-planting-projections/712');
    expect(payload).toMatchObject({
      town: 'QA Town edited',
      start_date_preparation: '2026-04-15',
      start_date_preparation_original: '2026-02-10',
      start_date_pioneering: '2026-10-15',
      start_date_pioneering_original: '2026-08-10',
      distance_to_town: '',
    });
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });

  it('does not show a blank form when the record cannot be loaded', async () => {
    mockRouteParams = {projectionId: 999};
    const root = mount(<EditChurchPlantingProjectionScreen />);
    await flush();
    expect(root.root.findAllByType(DateTripleDropdown)).toHaveLength(0);
    expect(root.root.findAll(n => n.props.onRetry).length).toBeGreaterThan(0);
  });
});

describe('edit steps screen', () => {
  it('saves a changed date proposed and keeps the original', async () => {
    mockRouteParams = {projectionId: 712};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditStepsChartScreen />);
    await flush();
    // Step 1: date proposed, date completed.
    await act(async () => dateDropdowns(root)[0].props.onChange(new Date(2026, 2, 1)));
    await act(async () => dateDropdowns(root)[1].props.onChange(new Date(2026, 2, 20)));
    expect(formatApiDate(dateDropdowns(root)[0].props.value)).toBe('2026-03-01');
    await pressText(root, 'Save');
    const [url, payload] = mockPatch.mock.calls[0];
    expect(url).toBe('/church-planting-projections/712/steps');
    expect(payload.step1_date_proposed).toBe('2026-03-01');
    expect(payload.step1_date_proposed_original).toBe('2025-01-15');
    expect(payload.step1_date_completed).toBe('2026-03-20');
    expect(payload.step2_date_proposed).toBe('2026-02-15');
  });

  it('typing in two fields keeps both (functional updates)', async () => {
    mockRouteParams = {projectionId: 712};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditStepsChartScreen />);
    await flush();
    const values = root.root.findAll(n => n.type === TextInput && n.props.placeholder === 'Value');
    await act(async () => {
      values[0].props.onChangeText('A');
      values[1].props.onChangeText('B');
    });
    const box = root.root.findAll(n => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function')[0];
    await act(async () => box.props.onPress());
    await pressText(root, 'Save');
    const payload = mockPatch.mock.calls[0][1];
    expect(payload.step1_row1_value).toBe('A');
    expect(payload.step1_row2_value).toBe('B');
    expect(payload.step1_row1_completed).toBe(true);
  });
});

describe('delete screen', () => {
  it('deletes once on a double tap and returns to the list', async () => {
    mockRouteParams = {projectionId: 712};
    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<DeleteChurchPlantingProjectionScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('QA CPP Test');
    const del = root.root.findAll(
      n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes('Delete'),
    )[0];
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await act(async () => release({data: ''}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith(
      'ChurchPlantingProjections',
      expect.objectContaining({reload: true}),
    );
  });
});
