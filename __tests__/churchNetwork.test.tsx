/**
 * Church network module: validation, API answers, local search / paging,
 * service calls and the add / edit / delete / list screens (mocked API).
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'ChurchNetworks'}, {name: 'X'}]})),
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
  churchesBlockingDelete,
  isDuplicateNameError,
  pageChurchNetworks,
  validateChurchNetworkName,
} from '../app/modules/churchnetwork/utils/churchNetwork.utils';
import {listChurchNetworks, getChurchNetworkById} from '../app/modules/churchnetwork/services/churchnetwork.service';
import AddChurchNetworkScreen from '../app/modules/churchnetwork/screens/AddChurchNetworkScreen';
import EditChurchNetworkScreen from '../app/modules/churchnetwork/screens/EditChurchNetworkScreen';
import DeleteChurchNetworkScreen from '../app/modules/churchnetwork/screens/DeleteChurchNetworkScreen';
import ChurchNetworksScreen from '../app/modules/churchnetwork/screens/ChurchNetworksScreen';

const NETWORKS = [
  {id: 4, name: 'VFC Network  [World Wide]', pastor_credential_locked: false},
  {id: 5, name: 'CCP Network [Far East]', pastor_credential_locked: false},
  {id: 6, name: 'Other', pastor_credential_locked: true},
];
const many = Array.from({length: 23}, (_, i) => ({id: i + 1, name: `Net ${i + 1}`, pastor_credential_locked: false}));
const IN_USE = {
  isAxiosError: true,
  response: {
    status: 500,
    data: {
      success: false,
      message: 'Failed to delete church network',
      errors: {detail: 'cannot delete church network: 3 churches are associated with this network'},
    },
  },
};
const DUPLICATE = {isAxiosError: true, response: {status: 400, data: {success: false, message: 'Church network name already exists'}}};

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
  const target = root.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label)[0]
    ?? root.root.findAll(n => n.props.onPress && texts({root: n} as any).some(s => s === label))[0];
  if (!target) {
    throw new Error(`no button "${label}"`);
  }
  await act(async () => {
    target.props.onPress();
  });
};
const typeName = async (root: renderer.ReactTestRenderer, value: string) => {
  await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText(value));
};
const toggleLock = async (root: renderer.ReactTestRenderer, value: boolean) => {
  const sw = root.root.findAll(n => typeof n.props.onValueChange === 'function')[0];
  await act(async () => sw.props.onValueChange(value));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (api.get as jest.Mock).mockImplementation(async (url: string) => {
    if (url === 'church-networks') {
      return {data: {success: true, data: NETWORKS}};
    }
    const id = Number(url.split('/')[1]);
    const found = NETWORKS.find(x => x.id === id);
    if (!found) {
      throw {isAxiosError: true, response: {status: 400, data: {success: false, message: 'Church network not found'}}};
    }
    return {data: {success: true, data: found}};
  });
});

describe('validation, API answers, local search / paging', () => {
  it('rejects blank (the API would save it), too long and duplicate names', () => {
    expect(validateChurchNetworkName('  ', NETWORKS)).toBe('required');
    expect(validateChurchNetworkName('x'.repeat(256), NETWORKS)).toBe('tooLong');
    expect(validateChurchNetworkName('x'.repeat(255), NETWORKS)).toBeNull();
    expect(validateChurchNetworkName(' vfc network [world   wide] ', NETWORKS)).toBe('duplicate');
    expect(validateChurchNetworkName('Other', NETWORKS, 6)).toBeNull();
  });

  it('reads the API\'s duplicate and "in use" answers', () => {
    expect(isDuplicateNameError(DUPLICATE)).toBe(true);
    expect(isDuplicateNameError(IN_USE)).toBe(false);
    expect(churchesBlockingDelete(IN_USE)).toBe(3);
    expect(churchesBlockingDelete(DUPLICATE)).toBeNull();
  });

  it('searches by name or #id and pages locally', () => {
    expect(pageChurchNetworks(NETWORKS, 'network', 1, 10).items.map(i => i.id)).toEqual([4, 5]);
    expect(pageChurchNetworks(NETWORKS, '#6', 1, 10).items.map(i => i.id)).toEqual([6]);
    const p3 = pageChurchNetworks(many, '', 3, 10);
    expect([p3.items.length, p3.total, p3.totalPages, p3.page]).toEqual([3, 23, 3, 3]);
  });

  it('service: no hand-made auth header; the lock flag is a real boolean', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({data: {data: [{id: 1, name: 'A', pastor_credential_locked: 'false'}]}});
    expect(await listChurchNetworks()).toEqual([{id: 1, name: 'A', pastor_credential_locked: false}]);
    expect((api.get as jest.Mock).mock.calls[0]).toEqual(['church-networks']);
    expect(await getChurchNetworkById(6)).toEqual(NETWORKS[2]);
  });
});

describe('Add church network', () => {
  it('blank or duplicate name: field error, nothing sent', async () => {
    const root = mount(<AddChurchNetworkScreen />);
    await press(root, 'Save');
    expect(texts(root).some(s => /required/i.test(s))).toBe(true);
    await typeName(root, 'other');
    await press(root, 'Save');
    expect(texts(root)).toContain('A church network with this name already exists.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sends the trimmed name and the lock flag once, then returns to the list', async () => {
    let release!: () => void;
    (api.post as jest.Mock).mockImplementation(
      () => new Promise(resolve => (release = () => resolve({data: {success: true}}))),
    );
    const root = mount(<AddChurchNetworkScreen />);
    await typeName(root, '  New   Network ');
    await toggleLock(root, true);
    await press(root, 'Save');
    await act(async () => root.root.findAllByType(TextInput)[0].props.onSubmitEditing());
    await act(async () => release());
    await flush();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('church-networks', {name: 'New Network', pastor_credential_locked: true});
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ChurchNetworks');
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Church network created.');
  });

  it('a duplicate the API reports (created meanwhile) shows under the name, not as an alert', async () => {
    (api.post as jest.Mock).mockRejectedValue(DUPLICATE);
    const root = mount(<AddChurchNetworkScreen />);
    await typeName(root, 'Brand new');
    await press(root, 'Save');
    expect(texts(root)).toContain('A church network with this name already exists.');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
  });

  it('limits the name to 255 characters (the API fails above that)', () => {
    const root = mount(<AddChurchNetworkScreen />);
    expect(root.root.findAllByType(TextInput)[0].props.maxLength).toBe(255);
  });
});

describe('Edit church network', () => {
  it('loads name + lock and saves both', async () => {
    mockRouteParams = {churchNetworkId: 6};
    (api.patch as jest.Mock).mockResolvedValue({data: {success: true}});
    const root = mount(<EditChurchNetworkScreen />);
    await flush();
    expect(root.root.findAllByType(TextInput)[0].props.value).toBe('Other');
    expect(root.root.findAll(n => typeof n.props.onValueChange === 'function')[0].props.value).toBe(true);
    await toggleLock(root, false);
    await press(root, 'Save');
    expect(api.patch).toHaveBeenCalledWith('church-networks/6', {name: 'Other', pastor_credential_locked: false});
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });

  it('a server error is shown with its reason (was a fixed "Failed to update")', async () => {
    mockRouteParams = {churchNetworkId: 6};
    (api.patch as jest.Mock).mockRejectedValue({isAxiosError: true, response: {status: 403, data: {success: false, message: 'Forbidden'}}});
    const root = mount(<EditChurchNetworkScreen />);
    await flush();
    await press(root, 'Save');
    const [title, message] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Error');
    expect(message).not.toBe('Failed to update');
  });

  it('no id or an unknown id: error state, no form', async () => {
    mockRouteParams = {};
    let root = mount(<EditChurchNetworkScreen />);
    await flush();
    expect(texts(root)).toContain('Church network not found.');
    mockRouteParams = {churchNetworkId: 999};
    root = mount(<EditChurchNetworkScreen />);
    await flush();
    expect(root.root.findAllByType(TextInput)).toHaveLength(0);
  });
});

describe('Delete church network', () => {
  it('deletes once and returns to the list', async () => {
    mockRouteParams = {churchNetworkId: 5};
    let release!: () => void;
    (api.delete as jest.Mock).mockImplementation(
      () => new Promise(resolve => (release = () => resolve({data: {success: true}}))),
    );
    const root = mount(<DeleteChurchNetworkScreen />);
    await flush();
    expect(texts(root).join(' ')).toContain('CCP Network [Far East]');
    await press(root, 'Delete');
    await press(root, 'Deleting...').catch(() => {});
    await act(async () => release());
    await flush();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('church-networks/5');
    expect(mockNavigation.popTo).toHaveBeenCalledWith('ChurchNetworks', expect.anything());
  });

  it('a network with churches: a translated explanation, the screen stays', async () => {
    mockRouteParams = {churchNetworkId: 4};
    (api.delete as jest.Mock).mockRejectedValue(IN_USE);
    const root = mount(<DeleteChurchNetworkScreen />);
    await flush();
    await press(root, 'Delete');
    expect(texts(root).join(' ')).toContain("This network can't be deleted: 3 church(es) still belong to it");
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
  });
});

describe('Church networks list', () => {
  it('loads once, shows the lock badges, and searches locally', async () => {
    const root = mount(<ChurchNetworksScreen />);
    await flush();
    expect(texts(root)).toEqual(expect.arrayContaining(['3 church networks', 'Other']));
    const search = root.root.findAllByType(TextInput)[0];
    await act(async () => search.props.onChangeText('other'));
    await act(async () => new Promise(resolve => setTimeout(resolve, 500)));
    expect(texts(root)).toContain('1 church network');
    expect(texts(root)).not.toContain('CCP Network [Far East]');
    expect((api.get as jest.Mock).mock.calls.filter(c => c[0] === 'church-networks')).toHaveLength(1);
  });

  it('a failed load is a retryable error, not "no networks"', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce({isAxiosError: true, request: {}, message: 'Network Error'});
    const root = mount(<ChurchNetworksScreen />);
    await flush();
    expect(texts(root)).toContain('Try again');
  });
});
