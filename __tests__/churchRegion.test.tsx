/**
 * Church (apostolic) regions: tree helpers, service calls, and the list /
 * add / edit / delete screens against a mocked API (shapes from staging).
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'ChurchRegions'}, {name: 'X'}]})),
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
const mockPicker = {imagePath: null as string | null, clearImage: jest.fn(), handleImagePick: jest.fn()};
jest.mock('../app/modules/church/hooks/useImagePicker', () => ({
  useImagePicker: () => mockPicker,
}));

import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import {
  buildParentOptions,
  descendantIds,
  filterRegions,
  parentNames,
  validateRegionName,
} from '../app/modules/churchregion/utils/churchRegion.utils';
import {
  createChurchRegion,
  getChurchRegionChildren,
  listChurchRegions,
  ChurchRegionItem,
} from '../app/modules/churchregion/services/churchregion.service';
import ChurchRegionsScreen from '../app/modules/churchregion/screens/ChurchRegionsScreen';
import AddChurchRegionScreen from '../app/modules/churchregion/screens/AddChurchRegionScreen';
import EditChurchRegionScreen from '../app/modules/churchregion/screens/EditChurchRegionScreen';
import DeleteChurchRegionScreen from '../app/modules/churchregion/screens/DeleteChurchRegionScreen';
import {ChurchRegionLogoField} from '../app/modules/churchregion/components/ChurchRegionUI';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const region = (id: number, parent_id: number | null, name: string, logo_url = ''): ChurchRegionItem => ({
  id,
  parent_id,
  left: 0,
  right: 0,
  name,
  logo_url,
});
const REGIONS: ChurchRegionItem[] = [
  region(1, null, 'VFC - Singapore', 'https://x/logo1.png'),
  region(4, 1, 'VFC Reg. 2', 'https://x/logo4.jpg'),
  region(72, 4, 'VFC Reg. 2 -  SC Ken Chee'),
  region(5, 1, 'VFC Kovan'),
  region(113, null, 'Région Sud'),
  region(123, null, '  '),
];
const TREE = [
  {
    id: 1,
    name: 'VFC - Singapore',
    children: [
      {id: 4, name: 'VFC Reg. 2', children: [{id: 72, name: 'VFC Reg. 2 -  SC Ken Chee', children: []}]},
      {id: 5, name: 'VFC Kovan', children: []},
    ],
  },
  {id: 113, name: 'Région Sud', children: []},
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
  const b = button(root, label);
  if (!b) {
    throw new Error(`no button "${label}"`);
  }
  await act(async () => b.props.onPress());
};
const nameInput = (root: renderer.ReactTestRenderer) => root.root.findAllByType(TextInput)[0];
const parentDropdown = (root: renderer.ReactTestRenderer) => root.root.findAllByType(ElementDropdown)[0];

let children: Record<number, ChurchRegionItem[] | null> = {};
let detail: Record<number, any> = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  mockPicker.imagePath = null;
  children = {};
  detail = {4: REGIONS[1], 72: REGIONS[2], 113: REGIONS[4]};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/church-regions') {
      return {data: {success: true, data: REGIONS}};
    }
    if (url === '/church-regions/hierarchy') {
      return {data: {success: true, data: TREE}};
    }
    const kids = /^\/church-regions\/(\d+)\/children$/.exec(url);
    if (kids) {
      return {data: {success: true, data: children[Number(kids[1])] ?? null}};
    }
    const one = /^\/church-regions\/(\d+)$/.exec(url);
    if (one && detail[Number(one[1])]) {
      return {data: {success: true, data: detail[Number(one[1])]}};
    }
    throw {isAxiosError: true, response: {status: 400, data: {success: false, message: 'Church region not found'}}};
  });
});

describe('tree helpers', () => {
  it('builds indented parent options (hyphens, not "— ")', () => {
    expect(buildParentOptions(TREE).map(o => o.label)).toEqual([
      'VFC - Singapore',
      '- VFC Reg. 2',
      '-- VFC Reg. 2 -  SC Ken Chee',
      '- VFC Kovan',
      'Région Sud',
    ]);
  });

  it('leaves out the edited region and its sub-regions (no loops)', () => {
    expect(buildParentOptions(TREE, 4).map(o => o.value)).toEqual([1, 5, 113]);
    expect(buildParentOptions(TREE, 1).map(o => o.value)).toEqual([113]);
    expect([...descendantIds(REGIONS, 1)].sort((a, b) => a - b)).toEqual([4, 5, 72]);
  });

  it('names parents and searches by name or parent, ignoring accents and spaces', () => {
    const parents = parentNames(REGIONS);
    expect(parents.get(72)).toBe('VFC Reg. 2');
    expect(parents.has(1)).toBe(false);
    expect(filterRegions(REGIONS, 'region sud', parents).map(r => r.id)).toEqual([113]);
    expect(filterRegions(REGIONS, 'reg. 2 - sc ken', parents).map(r => r.id)).toEqual([72]);
    expect(filterRegions(REGIONS, 'kovan', parents).map(r => r.id)).toEqual([5]);
    expect(filterRegions(REGIONS, '', parents)).toHaveLength(REGIONS.length);
  });

  it('requires a name that is not only spaces', () => {
    expect(validateRegionName('   ')).toBe('required');
    expect(validateRegionName('x'.repeat(256))).toBe('tooLong');
    expect(validateRegionName(' VFC ')).toBeNull();
  });
});

describe('service', () => {
  it('lets the api interceptor set the token (no stored-token header / throw)', async () => {
    const res = await listChurchRegions();
    expect(res.data.items).toHaveLength(REGIONS.length);
    expect(mockGet).toHaveBeenCalledWith('/church-regions');
  });

  it('children: null means none; create always sends logo_path', async () => {
    await expect(getChurchRegionChildren(72)).resolves.toEqual([]);
    children[4] = [REGIONS[2]];
    await expect(getChurchRegionChildren(4)).resolves.toHaveLength(1);
    mockPost.mockResolvedValue({data: {success: true}});
    await createChurchRegion({name: 'A', parent_id: null});
    expect(mockPost).toHaveBeenCalledWith('/church-regions', {logo_path: '', name: 'A', parent_id: null});
  });
});

describe('list screen', () => {
  it('shows parents, never an empty title, and searches locally', async () => {
    const root = mount(<ChurchRegionsScreen />);
    await flush();
    const all = texts(root).join('\n');
    expect(all).toContain('VFC Reg. 2 -  SC Ken Chee');
    expect(all).toMatch(/Under: VFC Reg\. 2/);
    expect(all).toContain('#123');

    const calls = mockGet.mock.calls.length;
    const search = root.root.findAllByType(TextInput)[0];
    await act(async () => search.props.onChangeText('r'));
    await act(async () => search.props.onChangeText('region sud'));
    expect(mockGet.mock.calls.length).toBe(calls);
    const after = texts(root).join('\n');
    expect(after).toContain('Région Sud');
    expect(after).not.toContain('VFC Kovan');
  });
});

describe('add screen', () => {
  it('blocks a blank name, saves once on a double tap and returns to the list', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddChurchRegionScreen />);
    await flush();
    expect(parentDropdown(root).props.data[1].label).toBe('- VFC Reg. 2');

    await act(async () => nameInput(root).props.onChangeText('   '));
    await press(root, 'Save');
    expect(mockPost).not.toHaveBeenCalled();

    await act(async () => nameInput(root).props.onChangeText('  QA Region  '));
    await act(async () => parentDropdown(root).props.onChange(4));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/church-regions', {name: 'QA Region', parent_id: 4, logo_path: ''});
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ChurchRegions', {reload: true});
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});

describe('edit screen', () => {
  it('offers no loop parents and keeps the logo when untouched', async () => {
    mockRouteParams = {churchRegionId: 4};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchRegionScreen />);
    await flush();
    expect(parentDropdown(root).props.data.map((o: any) => o.value)).toEqual([1, 5, 113]);
    expect(parentDropdown(root).props.value).toBe(1);
    await act(async () => nameInput(root).props.onChangeText('VFC Reg. 2 edited'));
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/church-regions/4', {name: 'VFC Reg. 2 edited', parent_id: 1});
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });

  it('removing the saved logo sends logo_path ""', async () => {
    mockRouteParams = {churchRegionId: 4};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchRegionScreen />);
    await flush();
    const logo = () => root.root.findByType(ChurchRegionLogoField);
    expect(logo().props.imageUri).toBe('https://x/logo4.jpg');
    await act(async () => logo().props.onClear());
    expect(logo().props.imageUri).toBeNull();
    await press(root, 'Save');
    expect(mockPatch.mock.calls[0][1]).toEqual({name: 'VFC Reg. 2', parent_id: 1, logo_path: ''});
  });

  it('tells the user when the API kept the parent they removed', async () => {
    mockRouteParams = {churchRegionId: 72};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchRegionScreen />);
    await flush();
    await act(async () => parentDropdown(root).props.onChange(null));
    await press(root, 'Save');
    expect(mockPatch.mock.calls[0][1]).toMatchObject({parent_id: null});
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('parent region could not be removed'));
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
    expect(parentDropdown(root).props.value).toBe(4);
  });

  it('shows a retryable error instead of a blank form for a missing region', async () => {
    mockRouteParams = {churchRegionId: 999};
    const root = mount(<EditChurchRegionScreen />);
    await flush();
    expect(root.root.findAllByType(ElementDropdown)).toHaveLength(0);
  });
});

describe('delete screen', () => {
  it('blocks deleting a region with sub-regions', async () => {
    mockRouteParams = {churchRegionId: 4};
    children[4] = [REGIONS[2]];
    const root = mount(<DeleteChurchRegionScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('1 sub-region(s)');
    await press(root, 'Delete');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes a leaf once on a double tap; shows the API reason on failure', async () => {
    mockRouteParams = {churchRegionId: 72};
    mockDelete.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'Region is used by churches'}},
    });
    const root = mount(<DeleteChurchRegionScreen />);
    await flush();
    await press(root, 'Delete');
    expect(texts(root).join('\n')).toContain('Region is used by churches');

    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(2);
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ChurchRegions', expect.objectContaining({reload: true}));
  });
});
