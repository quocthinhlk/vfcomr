/**
 * Event types: colour / meeting-type rules, the colour picker (draft until
 * Apply, drag uses the latest hue), and the list / detail / add / edit /
 * delete screens against a mocked API (shapes from staging).
 */
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'EventTypes'}, {name: 'X'}]})),
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
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ColorPicker, {hexToHsv, hsvToHex} from '../app/shared/components/ColorPicker';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import {
  buildEventTypePayload,
  normalizeHex,
  safeColor,
  strictMeetingType,
  validateEventTypeForm,
} from '../app/modules/eventTypes/utils/eventType.utils';
import {
  isEventTypeInUse,
  resolveEventMeetingType,
} from '../app/modules/eventTypes/services/eventType.service';
import EventTypesScreen from '../app/modules/eventTypes/screens/EventTypesScreen';
import EventTypeDetailScreen from '../app/modules/eventTypes/screens/EventTypeDetailScreen';
import AddEventTypeScreen from '../app/modules/eventTypes/screens/AddEventTypeScreen';
import EditEventTypeScreen from '../app/modules/eventTypes/screens/EditEventTypeScreen';
import DeleteEventTypeScreen from '../app/modules/eventTypes/screens/DeleteEventTypeScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const TYPES = [
  {id: 1, name: 'Conference / Seminar', color: '#C0504D', cell_color: '#E6B8B7', meeting_type: 'attendance'},
  {id: 4, name: '1 to 1 Meeting', color: '#76933C', cell_color: '#D8E4BC', meeting_type: 'meeting_with'},
  {id: 12, name: 'QA Bad Color', color: 'red', cell_color: 'zzz', meeting_type: 'attendance'},
  {id: 13, name: 'QA Bad Type', color: '#000000', cell_color: '#FFFFFF', meeting_type: 'Both'},
];
let EVENTS: {event_type_id: number}[] = [];

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

/** A minimal responder event for PanResponder handlers. */
const touch = (x: number, y: number, t: number) => {
  const touchBank = [
    {
      touchActive: true,
      startPageX: x,
      startPageY: y,
      startTimeStamp: t,
      currentPageX: x,
      currentPageY: y,
      currentTimeStamp: t,
      previousPageX: x,
      previousPageY: y,
      previousTimeStamp: t,
    },
  ];
  return {
    nativeEvent: {pageX: x, pageY: y, locationX: x, locationY: y, touches: [{}], changedTouches: [{}]},
    touchHistory: {numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: t, touchBank},
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  EVENTS = [{event_type_id: 1}, {event_type_id: 4}];
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string, config?: any) => {
    if (url === '/event-types') {
      return {data: {success: true, data: TYPES}};
    }
    if (url === '/events') {
      const {page, limit} = config.params;
      const items = EVENTS.slice((page - 1) * limit, page * limit);
      return {data: {success: true, data: {items, has_next: page * limit < EVENTS.length}}};
    }
    const one = /^\/event-types\/(\d+)$/.exec(url);
    const found = one && TYPES.find(x => x.id === Number(one[1]));
    if (found) {
      return {data: {success: true, data: found}};
    }
    throw {isAxiosError: true, response: {status: 404, data: {success: false, message: 'Event type not found'}}};
  });
});

describe('rules', () => {
  it('normalizes hex colours and keeps bad saved colours out of styles', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('19e7ad')).toBe('#19E7AD');
    expect(normalizeHex('red')).toBeNull();
    expect(safeColor('zzz')).toBeUndefined();
    expect(safeColor('#c0504d')).toBe('#C0504D');
  });

  it('reads meeting types like the web; visit forms keep a fallback', () => {
    expect(strictMeetingType('Pastors List')).toBe('meeting_with');
    expect(strictMeetingType('1-1')).toBe('meeting_with');
    expect(strictMeetingType('ATTENDANCE')).toBe('attendance');
    expect(strictMeetingType('Both')).toBeNull();
    expect(resolveEventMeetingType('Both')).toBe('attendance');
    expect(resolveEventMeetingType('meeting_with')).toBe('meeting_with');
  });

  it('validates required fields, colours and duplicate names', () => {
    const ok = {name: 'Leaders', color: '#000', cellColor: '#FFFFFF', meetingType: 'attendance' as const};
    expect(validateEventTypeForm(ok)).toEqual({});
    expect(validateEventTypeForm({...ok, name: '  ', color: 'red', meetingType: null})).toEqual({
      name: 'required',
      color: 'invalidColor',
      meetingType: 'required',
    });
    expect(validateEventTypeForm({...ok, name: ' 1 TO 1  meeting'}, TYPES).name).toBe('duplicate');
    expect(validateEventTypeForm({...ok, name: '1 to 1 Meeting'}, TYPES, 4)).toEqual({});
    expect(buildEventTypePayload({...ok, name: ' A  B '})).toEqual({
      name: 'A B',
      color: '#000000',
      cell_color: '#FFFFFF',
      meeting_type: 'attendance',
    });
  });

  it('finds events of a type across pages', async () => {
    EVENTS = [...Array.from({length: 2500}, () => ({event_type_id: 1})), {event_type_id: 8}];
    await expect(isEventTypeInUse(8)).resolves.toBe(true);
    await expect(isEventTypeInUse(99)).resolves.toBe(false);
  });
});

describe('colour picker', () => {
  it('round-trips hex and HSV', () => {
    expect(hsvToHex(...(hexToHsv('#19E7AD') as [number, number, number]))).toBe('#19E7AD');
    expect(hexToHsv('zzz')).toBeNull();
  });

  it('keeps the colour until Apply; Cancel discards; swatches and hex work', async () => {
    const onChange = jest.fn();
    const root = mount(<ColorPicker value="#C0504D" onChange={onChange} label="Text Colour" />);
    const openField = () =>
      root.root.findAll(n => n.props.accessibilityRole === 'button' && /Text Colour/.test(n.props.accessibilityLabel ?? ''))[0];
    await act(async () => openField().props.onPress());
    await act(async () => root.root.findAll(n => n.props.accessibilityLabel === '#1677FF' && n.props.onPress)[0].props.onPress());
    await press(root, 'Cancel');
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => openField().props.onPress());
    const hex = root.root.findAll(n => n.type === TextInput && n.props.placeholder === '#000000')[0];
    await act(async () => hex.props.onChangeText('#abc'));
    await press(root, 'Apply');
    expect(onChange).toHaveBeenCalledWith('#AABBCC');
  });

  it('dragging the plane after the hue keeps the new hue (no stale closure)', async () => {
    const onChange = jest.fn();
    const root = mount(<ColorPicker value="#FF0000" onChange={onChange} label="Text Colour" />);
    await act(async () =>
      root.root.findAll(n => n.props.accessibilityRole === 'button' && /Text Colour/.test(n.props.accessibilityLabel ?? ''))[0].props.onPress(),
    );
    const plane = root.root.findAll(n => typeof n.props.onLayout === 'function' && typeof n.props.onResponderGrant === 'function')[0];
    await act(async () => plane.props.onLayout({nativeEvent: {layout: {width: 300, height: 165}}}));
    const hue = root.root.findAll(n => n.props.accessibilityLabel === 'Hue')[0];
    // Hue at 1/3 of the bar: green.
    await act(async () => hue.props.onResponderGrant(touch(100, 10, 1)));
    await act(async () => hue.props.onResponderRelease(touch(100, 10, 2)));
    // Full saturation, full brightness in the plane.
    const plane2 = root.root.findAll(n => typeof n.props.onLayout === 'function' && typeof n.props.onResponderGrant === 'function')[0];
    await act(async () => plane2.props.onResponderGrant(touch(300, 0, 3)));
    await act(async () => plane2.props.onResponderRelease(touch(300, 0, 4)));
    await press(root, 'Apply');
    const [h, s, v] = hexToHsv(onChange.mock.calls[0][0]) as number[];
    expect(Math.round(h)).toBe(120);
    expect(s).toBeCloseTo(1);
    expect(v).toBeCloseTo(1);
  });
});

describe('list and detail', () => {
  it('lists types with safe colours and the raw unknown meeting type', async () => {
    const root = mount(<EventTypesScreen />);
    await flush();
    const all = texts(root).join('\n');
    expect(all).toContain('QA Bad Color');
    expect(all).toContain('Both');
    expect(all).toContain('Meeting With');
    const styled = root.root.findAll(n => {
      const flat = [].concat(n.props.style ?? []).filter(Boolean) as any[];
      return flat.some(st => st && (st.backgroundColor === 'red' || st.backgroundColor === 'zzz'));
    });
    expect(styled).toHaveLength(0);
  });

  it('detail shows an unknown meeting type as saved, not as Attendance', async () => {
    mockRouteParams = {eventTypeId: 13};
    const root = mount(<EventTypeDetailScreen />);
    await flush();
    const all = texts(root);
    expect(all).toContain('Both');
    expect(all).not.toContain('Attendance');
  });
});

describe('add / edit', () => {
  it('add starts with the web colours, blocks a duplicate name and saves once', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddEventTypeScreen />);
    const name = root.root.findAll(n => n.type === TextInput)[0];
    expect(texts(root)).toContain('#19E7AD');

    await act(async () => name.props.onChangeText('1 to 1 meeting'));
    await act(async () => root.root.findByType(ElementDropdown).props.onChange('attendance'));
    await press(root, 'Save');
    expect(mockPost).not.toHaveBeenCalled();
    expect(texts(root)).toContain('An event type with this name already exists.');

    await act(async () => name.props.onChangeText('QA Event'));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/event-types', {
      name: 'QA Event',
      color: '#19E7AD',
      cell_color: '#BE19E7',
      meeting_type: 'attendance',
    });
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('EventTypes', {reload: true});
  });

  it('edit asks to fix a bad saved colour and an unknown meeting type', async () => {
    mockRouteParams = {eventTypeId: 12};
    const root = mount(<EditEventTypeScreen />);
    await flush();
    await press(root, 'Save');
    expect(mockPatch).not.toHaveBeenCalled();
    expect(texts(root).filter(s => s.startsWith('Enter a colour'))).toHaveLength(2);

    mockRouteParams = {eventTypeId: 13};
    const root2 = mount(<EditEventTypeScreen />);
    await flush();
    expect(root2.root.findByType(ElementDropdown).props.value).toBeNull();
  });

  it('edit keeps its own name and saves normalized colours', async () => {
    mockRouteParams = {eventTypeId: 4};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditEventTypeScreen />);
    await flush();
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/event-types/4', {
      name: '1 to 1 Meeting',
      color: '#76933C',
      cell_color: '#D8E4BC',
      meeting_type: 'meeting_with',
    });
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });
});

describe('delete', () => {
  it('blocks deleting a type that events use', async () => {
    mockRouteParams = {eventTypeId: 4};
    const root = mount(<DeleteEventTypeScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain("can't be deleted: events still use it");
    await press(root, 'Delete');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes an unused type once and returns to the list', async () => {
    mockRouteParams = {eventTypeId: 13};
    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<DeleteEventTypeScreen />);
    await flush();
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('EventTypes', expect.objectContaining({reload: true}));
  });
});
