/**
 * Worship services: day / time rules (the API saves any day text, blank
 * names and hours like 99), and the list / detail / add / edit / delete
 * screens against a mocked API (shapes from staging).
 */
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';

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
jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  const C = ({children}: any) => <RN.View>{children}</RN.View>;
  // Every export (Svg, Path, Circle, LinearGradient, ...) renders a View.
  return new Proxy({__esModule: true, default: C}, {get: (t: any, k) => (k in t ? t[k] : C)});
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'WorshipServices'}, {name: 'X'}]})),
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
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const RN = jest.requireActual('react-native/Libraries/Components/View/View');
  return RN.default ?? RN;
});


import api from '../app/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import TimePicker from '../app/shared/components/TimePicker';
import AppInput from '../app/shared/components/AppInput';
import {
  buildWorshipServicePayload,
  canonicalDay,
  dayLabel,
  dayOptions,
  formatServiceTime,
  parseTime,
  sortWorshipServices,
  validateWorshipService,
} from '../app/modules/worshipservices/utils/worshipService.utils';
import WorshipServicesScreen from '../app/modules/worshipservices/screens/WorshipServicesScreen';
import WorshipServiceDetailScreen from '../app/modules/worshipservices/screens/WorshipServiceDetailScreen';
import AddWorshipServiceScreen from '../app/modules/worshipservices/screens/AddWorshipServiceScreen';
import EditWorshipServiceScreen from '../app/modules/worshipservices/screens/EditWorshipServiceScreen';
import DeleteWorshipServiceScreen from '../app/modules/worshipservices/screens/DeleteWorshipServiceScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const t = (k: string) => k;
// Shapes from staging (church 76).
let SERVICES: any[] = [];

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
const button = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAll(
    n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes(label),
  )[0];
const press = async (root: renderer.ReactTestRenderer, label: string) => {
  await act(async () => button(root, label).props.onPress());
};


beforeEach(async () => {
  jest.clearAllMocks();
  mockRouteParams = {};
  await AsyncStorage.setItem('selectedChurchId', '76');
  SERVICES = [
    {id: 72, church_id: 76, name: 'Morning Service', day_name: 'Sunday', time: '10:00:00', created: '2014-07-13T11:46:00Z'},
    {id: 90, church_id: 76, name: 'Prayer', day_name: 'monday', time: '19:30:00', created: '2020-01-01T00:00:00Z'},
    {id: 91, church_id: 76, name: '   ', day_name: 'Funday', time: '99:00:00', created: '2020-01-01T00:00:00Z'},
  ];
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string) => {
    if (url === 'churches/76') {
      return {data: {success: true, data: {id: 76, name: 'Grace Church '}}};
    }
    if (url === 'churches/77') {
      return {data: {success: true, data: {id: 77, name: 'Hope Church'}}};
    }
    const list = /^\/worship-services\/churches\/(\d+)$/.exec(url);
    if (list) {
      return {data: {success: true, data: SERVICES.filter(s => s.church_id === Number(list[1]))}};
    }
    const one = /^\/worship-services\/(\d+)$/.exec(url);
    const found = one && SERVICES.find(s => s.id === Number(one[1]));
    if (found) {
      return {data: {success: true, data: found}};
    }
    throw {isAxiosError: true, response: {status: 400, data: {success: false, message: 'Worship service not found: sql: no rows in result set'}}};
  });
  mockPost.mockResolvedValue({data: {success: true, message: 'Worship service created successfully'}});
  mockPatch.mockResolvedValue({data: {success: true, message: 'Worship service updated successfully'}});
  mockDelete.mockResolvedValue({data: {success: true, message: 'Worship service deleted successfully'}});
});

describe('rules', () => {
  it('reads saved days in any case and translates them', () => {
    expect(canonicalDay(' monday ')).toBe('Monday');
    expect(canonicalDay('Funday')).toBe('Funday');
    expect(dayLabel('sunday', t)).toBe('weekDaySunday');
    expect(dayLabel('Funday', t)).toBe('Funday');
    expect(dayOptions(t).map(o => o.value)).toEqual([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    ]);
    // A non-standard saved day stays selectable on Edit.
    expect(dayOptions(t, 'Funday').slice(-1)[0]).toEqual({label: 'Funday', value: 'Funday'});
  });

  it('parses and formats times, rejecting hours the API still saves', () => {
    expect(parseTime('09:30:00')).toEqual({hour: 9, minute: 30});
    expect(parseTime('9:05')).toEqual({hour: 9, minute: 5});
    expect(parseTime('99:00:00')).toBeNull();
    expect(parseTime('')).toBeNull();
    expect(formatServiceTime('18:45:00')).toBe('18:45');
    expect(formatServiceTime('99:00:00')).toBe('99:00:00');
  });

  it('validates name / day / time and builds the payload', () => {
    const ok = {name: '  Evening   Service ', dayName: 'friday', time: '18:45'};
    expect(validateWorshipService(ok, t)).toEqual({});
    expect(buildWorshipServicePayload(ok)).toEqual({name: 'Evening Service', day_name: 'Friday', time: '18:45:00'});
    expect(validateWorshipService({name: '   ', dayName: null, time: '99:00:00'}, t)).toEqual({
      name: 'required',
      dayName: 'required',
      time: 'required',
    });
    expect(validateWorshipService({...ok, name: 'x'.repeat(256)}, t).name).toBe('worshipServiceNameTooLong');
    expect(validateWorshipService({...ok, name: 'x'.repeat(255)}, t)).toEqual({});
  });

  it('sorts services by week day, then time', () => {
    const sorted = sortWorshipServices([
      {id: 1, day_name: 'Sunday', time: '18:00:00'},
      {id: 2, day_name: 'Sunday', time: '09:00:00'},
      {id: 3, day_name: 'Funday', time: '01:00:00'},
      {id: 4, day_name: 'wednesday', time: '19:00:00'},
    ] as any);
    expect(sorted.map(s => s.id)).toEqual([4, 2, 1, 3]);
  });
});

describe('TimePicker', () => {
  const setup = (value: string | null) => {
    const onChange = jest.fn();
    const root = mount(<TimePicker value={value} onChange={onChange} />);
    const [hour, minute] = root.root.findAllByType(ElementDropdown);
    return {root, onChange, hour, minute};
  };

  it('clearing the hour empties it instead of setting 00', async () => {
    const {root, onChange, hour} = setup('18:45:00');
    await act(async () => hour.props.onChange(null));
    expect(onChange).toHaveBeenLastCalledWith(null);
    const [h, m] = root.root.findAllByType(ElementDropdown);
    expect(h.props.value).toBeUndefined();
    // The minute that is still chosen stays.
    expect(m.props.value).toBe(45);
    await act(async () => h.props.onChange(7));
    expect(onChange).toHaveBeenLastCalledWith('07:45:00');
  });

  it('shows an out-of-range saved hour as empty', () => {
    const {hour, minute} = setup('99:00:00');
    expect(hour.props.value).toBeUndefined();
    expect(minute.props.value).toBe(0);
  });
});

describe('screens', () => {
  it('lists the church services in week order with translated days', async () => {
    const root = mount(<WorshipServicesScreen />);
    await flush();
    await flush();
    const all = texts(root);
    expect(all).toContain('Grace Church');
    const titles = all.filter(x => ['Prayer', 'Morning Service', '—'].includes(x));
    expect(titles).toEqual(['Prayer', 'Morning Service', '—']);
    expect(all.join('|')).toContain('Monday • 19:30');
    expect(all.join('|')).toContain('Sunday • 10:00');
    expect(all.join('|')).not.toContain('monday');
  });

  it('reloads when another church is picked on the dashboard', async () => {
    SERVICES.push({id: 95, church_id: 77, name: 'Hope Sunday', day_name: 'Sunday', time: '09:00:00', created: ''});
    const root = mount(<WorshipServicesScreen />);
    await flush();
    await flush();
    expect(texts(root)).toContain('Morning Service');
    await AsyncStorage.setItem('selectedChurchId', '77');
    // Re-focus: the focus effect re-runs when its callback changes; simulate by remounting the hook.
    const root2 = mount(<WorshipServicesScreen />);
    await flush();
    await flush();
    expect(texts(root2)).toContain('Hope Sunday');
    expect(texts(root2)).not.toContain('Morning Service');
  });

  it('shows the day and time on the detail screen', async () => {
    mockRouteParams = {worshipServiceId: 90};
    const root = mount(<WorshipServiceDetailScreen />);
    await flush();
    const all = texts(root);
    expect(all).toContain('Prayer');
    expect(all).toContain('Monday');
    expect(all).toContain('19:30');
  });

  it('adds a service once, then goes back to the list instead of pushing another', async () => {
    const root = mount(<AddWorshipServiceScreen />);
    await flush();
    await press(root, 'Save');
    expect(mockPost).not.toHaveBeenCalled();
    expect(texts(root).filter(x => x === 'Required').length).toBe(3);

    await act(async () => root.root.findByType(AppInput).props.onChangeText('  Youth   night '));
    await act(async () => root.root.findAllByType(ElementDropdown)[0].props.onChange('Friday'));
    await act(async () => root.root.findByType(TimePicker).props.onChange('18:45:00'));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/worship-services/churches/76', {
      name: 'Youth night',
      day_name: 'Friday',
      time: '18:45:00',
    });
    expect(mockNavigation.popTo).toHaveBeenCalledWith('WorshipServices', {reload: true});
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('shows the API message when the add fails', async () => {
    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'Failed to create worship service'}},
    });
    const root = mount(<AddWorshipServiceScreen />);
    await flush();
    await act(async () => root.root.findByType(AppInput).props.onChangeText('Youth'));
    await act(async () => root.root.findAllByType(ElementDropdown)[0].props.onChange('Friday'));
    await act(async () => root.root.findByType(TimePicker).props.onChange('18:45:00'));
    await press(root, 'Save');
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to create worship service');
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
  });

  it('edits a lowercase-day service and keeps a bad saved time from being sent', async () => {
    mockRouteParams = {worshipServiceId: 90};
    const root = mount(<EditWorshipServiceScreen />);
    await flush();
    await flush();
    expect(root.root.findAllByType(ElementDropdown)[0].props.value).toBe('Monday');
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/worship-services/90', {
      name: 'Prayer',
      day_name: 'Monday',
      time: '19:30:00',
    });

    mockPatch.mockClear();
    mockRouteParams = {worshipServiceId: 91};
    const root2 = mount(<EditWorshipServiceScreen />);
    await flush();
    await flush();
    await press(root2, 'Save');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('deletes once and returns to the list', async () => {
    mockRouteParams = {worshipServiceId: 72};
    const root = mount(<DeleteWorshipServiceScreen />);
    await flush();
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('/worship-services/72');
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });
});
