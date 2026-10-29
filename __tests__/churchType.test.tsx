/**
 * Church type module: validation, local search / paging, service calls and
 * the add / edit / delete / list screens (rendered with a mocked API).
 */
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert, TextInput, Text} from 'react-native';

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
  setParams: jest.fn(),
  getState: jest.fn(() => ({index: 1, routes: [{name: 'ChurchTypes'}, {name: 'X'}]})),
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

import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import {
  pageChurchTypes,
  validateChurchTypeName,
  normalizeChurchTypeName,
} from '../app/modules/churchtype/utils/churchType.utils';
import {listChurchTypes, deleteChurchType} from '../app/modules/churchtype/services/churchtype.service';
import AddChurchTypeScreen from '../app/modules/churchtype/screens/AddChurchTypeScreen';
import EditChurchTypeScreen from '../app/modules/churchtype/screens/EditChurchTypeScreen';
import DeleteChurchTypeScreen from '../app/modules/churchtype/screens/DeleteChurchTypeScreen';
import ChurchTypesScreen from '../app/modules/churchtype/screens/ChurchTypesScreen';

const TYPES = [
  {id: 1, name: 'Daughter Church - Pioneer / House Church'},
  {id: 2, name: 'Daughter Church - Developing'},
  {id: 3, name: 'Sister Church - Regional'},
];
const many = Array.from({length: 23}, (_, i) => ({id: i + 1, name: `Type ${i + 1}`}));

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
  root.root.findAllByType(Text).map(n => [].concat(n.props.children).filter(x => typeof x === 'string').join(''));
const press = async (root: renderer.ReactTestRenderer, label: string) => {
  const target = root.root.findAll(n => n.props.onPress && texts({root: n} as any).some(s => s === label))[0]
    ?? root.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label)[0];
  if (!target) {
    throw new Error(`no button "${label}"`);
  }
  await act(async () => {
    target.props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (api.get as jest.Mock).mockImplementation(async (url: string) => {
    if (url === 'church-types') {
      return {data: {success: true, data: TYPES}};
    }
    const id = Number(url.split('/')[1]);
    const found = TYPES.find(x => x.id === id);
    if (!found) {
      throw {isAxiosError: true, response: {status: 404, data: {success: false, message: 'Church type not found'}}};
    }
    return {data: {success: true, data: found}};
  });
});

describe('validation and local search / paging', () => {
  it('rejects blank, too long and duplicate names (the API accepts all three)', () => {
    expect(validateChurchTypeName('   ', TYPES)).toBe('required');
    expect(validateChurchTypeName('x'.repeat(256), TYPES)).toBe('tooLong');
    expect(validateChurchTypeName('x'.repeat(255), TYPES)).toBeNull();
    expect(validateChurchTypeName('  sister   church - REGIONAL ', TYPES)).toBe('duplicate');
    expect(validateChurchTypeName('Sister Church - Regional', TYPES, 3)).toBeNull();
    expect(normalizeChurchTypeName('  A   B ')).toBe('A B');
  });

  it('searches by name or #id and pages locally', () => {
    expect(pageChurchTypes(TYPES, 'daughter', 1, 10).items.map(i => i.id)).toEqual([1, 2]);
    expect(pageChurchTypes(TYPES, '#3', 1, 10).items.map(i => i.id)).toEqual([3]);
    const p3 = pageChurchTypes(many, '', 3, 10);
    expect([p3.items.length, p3.total, p3.totalPages, p3.page]).toEqual([3, 23, 3, 3]);
    expect(pageChurchTypes(many, 'Type 2', 9, 10).page).toBe(1);
  });
});

describe('service', () => {
  it('lists without hand-made auth headers and normalizes the rows', async () => {
    const list = await listChurchTypes();
    expect((api.get as jest.Mock).mock.calls[0]).toEqual(['church-types']);
    expect(list).toEqual(TYPES);
  });

  it('deletes by id', async () => {
    (api.delete as jest.Mock).mockResolvedValue({data: {success: true}});
    await deleteChurchType(7);
    expect(api.delete).toHaveBeenCalledWith('church-types/7');
  });
});

describe('Add church type screen', () => {
  const typeName = async (root: renderer.ReactTestRenderer, value: string) => {
    const input = root.root.findAllByType(TextInput)[0];
    await act(async () => input.props.onChangeText(value));
  };

  it('blank name: field error, nothing sent', async () => {
    const root = mount(<AddChurchTypeScreen />);
    await typeName(root, '   ');
    await press(root, 'Save');
    expect(texts(root).some(s => /required/i.test(s))).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('duplicate name: field error, nothing sent', async () => {
    const root = mount(<AddChurchTypeScreen />);
    await typeName(root, 'sister church - regional');
    await press(root, 'Save');
    expect(texts(root)).toContain('A church type with this name already exists.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('saves the trimmed name once, marks the list and returns to it', async () => {
    let release!: () => void;
    (api.post as jest.Mock).mockImplementation(
      () => new Promise(resolve => (release = () => resolve({data: {success: true}}))),
    );
    const root = mount(<AddChurchTypeScreen />);
    await typeName(root, '  New   Type ');
    await press(root, 'Save');
    // A second tap while saving does nothing.
    await act(async () => root.root.findAllByType(TextInput)[0].props.onSubmitEditing());
    await act(async () => release());
    await flush();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('church-types', {name: 'New Type'});
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ChurchTypes');
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Church type created.');
  });

  it('a server error is shown (not swallowed) and the form stays', async () => {
    (api.post as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'Invalid request'}},
    });
    const root = mount(<AddChurchTypeScreen />);
    await typeName(root, 'Another');
    await press(root, 'Save');
    expect((Alert.alert as jest.Mock).mock.calls[0][0]).toBe('Error');
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
  });

  it('limits the name to the 255 characters the API can store', async () => {
    const root = mount(<AddChurchTypeScreen />);
    expect(root.root.findAllByType(TextInput)[0].props.maxLength).toBe(255);
  });
});

describe('Edit church type screen', () => {
  it('loads the name and saves changes', async () => {
    mockRouteParams = {churchTypeId: 2};
    (api.patch as jest.Mock).mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchTypeScreen />);
    await flush();
    const input = root.root.findAllByType(TextInput)[0];
    expect(input.props.value).toBe('Daughter Church - Developing');
    await act(async () => input.props.onChangeText('Daughter Church - Growing'));
    await press(root, 'Save');
    expect(api.patch).toHaveBeenCalledWith('church-types/2', {name: 'Daughter Church - Growing'});
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });

  it('keeping its own name is not a duplicate; emptying it is blocked (API would save "")', async () => {
    mockRouteParams = {churchTypeId: 3};
    (api.patch as jest.Mock).mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchTypeScreen />);
    await flush();
    await press(root, 'Save');
    expect(api.patch).toHaveBeenCalledTimes(1);
    await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText(''));
    await press(root, 'Save');
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it('without an id: an error state instead of a blank form', async () => {
    mockRouteParams = {};
    const root = mount(<EditChurchTypeScreen />);
    await flush();
    expect(texts(root)).toContain('Church type not found.');
    expect(root.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it('a deleted record (404): error state, no form', async () => {
    mockRouteParams = {churchTypeId: 999};
    const root = mount(<EditChurchTypeScreen />);
    await flush();
    expect(root.root.findAllByType(TextInput)).toHaveLength(0);
  });
});

describe('Delete church type screen', () => {
  it('warns that churches lose the type, deletes once, then returns to the list', async () => {
    mockRouteParams = {churchTypeId: 1};
    let release!: () => void;
    (api.delete as jest.Mock).mockImplementation(
      () => new Promise(resolve => (release = () => resolve({data: {success: true}}))),
    );
    const root = mount(<DeleteChurchTypeScreen />);
    await flush();
    const all = texts(root).join(' ');
    expect(all).toContain('Churches of this type will be left without a church type');
    expect(all).toContain('Daughter Church - Pioneer / House Church');
    await press(root, 'Delete');
    await press(root, 'Deleting...').catch(() => {});
    await act(async () => release());
    await flush();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ChurchTypes', expect.anything());
  });

  it('a failed delete shows the reason on the screen', async () => {
    mockRouteParams = {churchTypeId: 1};
    (api.delete as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: {status: 500, data: {success: false, message: 'Failed to delete church type'}},
    });
    const root = mount(<DeleteChurchTypeScreen />);
    await flush();
    const before = texts(root).length;
    await press(root, 'Delete');
    // An inline error box appears above the buttons; the screen stays.
    expect(texts(root).length).toBe(before + 1);
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('Church types list', () => {
  it('loads once; searching filters locally without new requests', async () => {
    const root = mount(<ChurchTypesScreen />);
    await flush();
    expect(texts(root)).toEqual(expect.arrayContaining(TYPES.map(x => x.name)));
    const search = root.root.findAllByType(TextInput)[0];
    await act(async () => search.props.onChangeText('sister'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 500)));
    expect(texts(root)).toContain('Sister Church - Regional');
    expect(texts(root)).not.toContain('Daughter Church - Developing');
    expect((api.get as jest.Mock).mock.calls.filter(c => c[0] === 'church-types')).toHaveLength(1);
  });

  it('a failed load is a retryable error, not "no data"', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce({isAxiosError: true, request: {}, message: 'Network Error'});
    const root = mount(<ChurchTypesScreen />);
    await flush();
    expect(texts(root)).not.toContain('No data found');
    expect(texts(root)).toContain('Try again');
  });
});
