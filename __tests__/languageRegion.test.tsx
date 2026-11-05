/**
 * Language regions: parent choices, broken UTF-8 names, duplicates, and the
 * list / add / edit / delete screens against a mocked API (shapes from staging).
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'LanguageRegions'}, {name: 'X'}]})),
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
jest.mock('../app/shared/components/PaginatedListPager', () => ({
  PaginatedListPager: ({children}: any) => children,
}));
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const RN = jest.requireActual('react-native/Libraries/Components/View/View');
  return RN.default ?? RN;
});

import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import {
  childrenOf,
  filterRegions,
  parentNames,
  parentOptions,
  regionName,
  validateRegionName,
} from '../app/modules/languageregion/utils/languageRegion.utils';
import {listLanguageRegions} from '../app/modules/languageregion/services/languageregion.service';
import LanguageRegionsScreen from '../app/modules/languageregion/screens/LanguageRegionsScreen';
import AddLanguageRegionScreen from '../app/modules/languageregion/screens/AddLanguageRegionScreen';
import EditLanguageRegionScreen from '../app/modules/languageregion/screens/EditLanguageRegionScreen';
import DeleteLanguageRegionScreen from '../app/modules/languageregion/screens/DeleteLanguageRegionScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const R = (id: number, name: string, parent_id: number | null = null, disabled = false) => ({
  id,
  name,
  parent_id,
  disabled,
});
const REGIONS = [
  R(4, 'English'),
  R(6, 'PortuguÃªs'),
  R(26, 'Russian'),
  R(29, 'Russian'),
  R(39, 'Nigeria English', 4),
  R(44, 'Orphan', 40, true),
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
const button = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAll(
    n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes(label),
  )[0];
const press = async (root: renderer.ReactTestRenderer, label: string) => {
  await act(async () => button(root, label).props.onPress());
};
const typeName = async (root: renderer.ReactTestRenderer, value: string) => {
  await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText(value));
};
let detail: Record<number, any> = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  detail = Object.fromEntries(REGIONS.map(r => [r.id, r]));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/language-regions') {
      return {data: {success: true, data: REGIONS}};
    }
    const one = /^\/language-regions\/(\d+)$/.exec(url);
    if (one && detail[Number(one[1])]) {
      return {data: {success: true, data: detail[Number(one[1])]}};
    }
    throw {isAxiosError: true, response: {status: 400, data: {success: false, message: 'not found'}}};
  });
});

describe('rules', () => {
  it('repairs broken UTF-8 names and searches through them', () => {
    expect(regionName(REGIONS[1])).toBe('Português');
    expect(regionName(R(42, '   '))).toBe('#42');
    const parents = parentNames(REGIONS);
    expect(parents.get(39)).toBe('English');
    expect(filterRegions(REGIONS, 'portugues', parents).map(r => r.id)).toEqual([6]);
    expect(filterRegions(REGIONS, 'english', parents).map(r => r.id)).toEqual([4, 39]);
  });

  it('offers top-level parents, never the region itself, keeping the saved parent', () => {
    expect(parentOptions(REGIONS).map(o => o.value)).toEqual([4, 6, 26, 29]);
    expect(parentOptions(REGIONS, 4).map(o => o.value)).toEqual([6, 26, 29]);
    expect(parentOptions(REGIONS, 1, 39).map(o => o.value)).toEqual([4, 6, 26, 29, 39]);
    expect(childrenOf(REGIONS, 4).map(r => r.id)).toEqual([39]);
  });

  it('validates names; an unchanged duplicate (two "Russian") can still be saved', () => {
    expect(validateRegionName('  ')).toBe('required');
    expect(validateRegionName('x'.repeat(256))).toBe('tooLong');
    expect(validateRegionName(' english ', REGIONS)).toBe('duplicate');
    expect(validateRegionName('Português', REGIONS)).toBe('duplicate');
    expect(validateRegionName('Russian', REGIONS, 26, 'Russian')).toBeNull();
    expect(validateRegionName('English', REGIONS, 26, 'Russian')).toBe('duplicate');
  });

  it('service lets the api interceptor set the token', async () => {
    await listLanguageRegions();
    expect(mockGet).toHaveBeenCalledWith('/language-regions');
  });
});

describe('list screen', () => {
  it('shows repaired names, parents and status; search is local', async () => {
    const root = mount(<LanguageRegionsScreen />);
    await flush();
    const all = texts(root).join('\n');
    expect(all).toContain('Português');
    expect(all).not.toContain('PortuguÃªs');
    expect(all).toMatch(/Under: English/);
    const calls = mockGet.mock.calls.length;
    await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText('russ'));
    expect(mockGet.mock.calls.length).toBe(calls);
    expect(texts(root).filter(s => s === 'Russian')).toHaveLength(2);
  });
});

describe('add screen', () => {
  it('blocks blank and duplicate names under the field; saves once', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddLanguageRegionScreen />);
    await flush();
    await press(root, 'Save');
    expect(texts(root)).toContain('The Name field is required.');
    expect(Alert.alert).not.toHaveBeenCalled();
    await typeName(root, 'english');
    await press(root, 'Save');
    expect(texts(root)).toContain('A language region with this name already exists.');
    expect(mockPost).not.toHaveBeenCalled();

    await typeName(root, '  Tagalog  ');
    await act(async () => root.root.findByType(ElementDropdown).props.onChange(4));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/language-regions', {name: 'Tagalog', parent_id: 4, disabled: false});
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('LanguageRegions', {reload: true});
  });

  it('shows a retry when the parent list fails (was an empty dropdown)', async () => {
    mockGet.mockRejectedValue({isAxiosError: true, message: 'Network Error'});
    const root = mount(<AddLanguageRegionScreen />);
    await flush();
    expect(root.root.findAllByType(ElementDropdown)).toHaveLength(0);
    expect(root.root.findAll(n => n.props.onRetry).length).toBeGreaterThan(0);
  });
});

describe('edit screen', () => {
  it('does not offer itself as parent and saves the repaired name', async () => {
    mockRouteParams = {languageRegionId: 6};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditLanguageRegionScreen />);
    await flush();
    expect(root.root.findByType(ElementDropdown).props.data.map((o: any) => o.value)).toEqual([4, 26, 29]);
    expect(root.root.findAllByType(TextInput)[0].props.value).toBe('Português');
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/language-regions/6', {name: 'Português', parent_id: null, disabled: false});
  });

  it('warns when the API kept the parent the user removed', async () => {
    mockRouteParams = {languageRegionId: 39};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditLanguageRegionScreen />);
    await flush();
    await act(async () => root.root.findByType(ElementDropdown).props.onChange(null));
    await press(root, 'Save');
    expect(mockPatch.mock.calls[0][1]).toMatchObject({parent_id: null});
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('could not be removed'));
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
  });

  it('keeps an unchanged duplicate name saveable', async () => {
    mockRouteParams = {languageRegionId: 29};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditLanguageRegionScreen />);
    await flush();
    await act(async () => root.root.findAll(n => typeof n.props.onValueChange === 'function')[0].props.onValueChange(true));
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/language-regions/29', {name: 'Russian', parent_id: null, disabled: true});
  });
});

describe('delete screen', () => {
  it('blocks deleting a region with sub-regions and warns about churches', async () => {
    mockRouteParams = {languageRegionId: 4};
    const root = mount(<DeleteLanguageRegionScreen />);
    await flush();
    const all = texts(root).join('\n');
    expect(all).toContain('1 sub-region(s)');
    expect(all).toContain('the app cannot check them');
    await press(root, 'Delete');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('shows a retry instead of a Delete button when loading fails', async () => {
    mockRouteParams = {languageRegionId: 999};
    const root = mount(<DeleteLanguageRegionScreen />);
    await flush();
    expect(button(root, 'Delete')).toBeUndefined();
  });

  it('deletes a leaf once and returns to the list', async () => {
    mockRouteParams = {languageRegionId: 39};
    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<DeleteLanguageRegionScreen />);
    await flush();
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('LanguageRegions', expect.objectContaining({reload: true}));
  });
});
