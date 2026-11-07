/**
 * Watch lists: the church picker (paged, ticked churches first, ticks kept on
 * a parent re-render), the form (full PATCH body, Cancel, one save) and the
 * list (delete), against a mocked API with staging shapes.
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'WatchList'}, {name: 'X'}]})),
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
jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  const C = ({children}: any) => <RN.View>{children}</RN.View>;
  return new Proxy({__esModule: true, default: C}, {get: (t: any, k) => (k in t ? t[k] : C)});
});
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const RN = jest.requireActual('react-native/Libraries/Components/View/View');
  return RN.default ?? RN;
});

import {FlatList} from 'react-native';
import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ChurchMultiSelectModal from '../app/modules/watchlist/components/ChurchMultiSelectModal';
import WatchListFormScreen from '../app/modules/watchlist/screens/WatchListFormScreen';
import {WatchListScreen} from '../app/modules/watchlist/screens/WatchListScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const ALL = Array.from({length: 120}, (_, i) => ({id: 1000 + i, name: i === 0 ? '  Calvary Leading Space' : `Church ${String(i).padStart(3, '0')}`}));
const WL = {
  id: 67,
  name: 'QA WL',
  user_id: 4825,
  sort_by: null,
  sortlist: null,
  churches: [{church_id: 76, church_name: 'Victory Family Centre - Ho Chi Minh City'}],
};

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

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string, config?: any) => {
    if (url === 'churches') {
      const {page, limit, search} = config.params;
      const pool = search ? ALL.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : ALL;
      const items = pool.slice((page - 1) * limit, page * limit);
      return {data: {success: true, data: {items, total: pool.length, page, limit, has_next: page * limit < pool.length}}};
    }
    if (url === '/watchlists') {
      return {data: {success: true, data: [WL]}};
    }
    if (url === '/watchlists/67') {
      return {data: {success: true, data: WL}};
    }
    const church = /^churches\/(\d+)$/.exec(url);
    if (church) {
      return {data: {success: true, data: {id: Number(church[1]), name: 'VFC HCMC', country_name: 'Vietnam'}}};
    }
    throw new Error('unexpected ' + url);
  });
});

describe('church picker', () => {
  it('pages through all churches, shows ticked ones first, trims names', async () => {
    const onDone = jest.fn();
    const root = mount(
      <ChurchMultiSelectModal visible selected={{76: 'Victory Family Centre - Ho Chi Minh City'}} onClose={() => {}} onDone={onDone} />,
    );
    await flush();
    const list = () => root.root.findByType(FlatList);
    const ids = () => list().props.data.map((c: any) => c.id);
    expect(ids()[0]).toBe(76);
    expect(ids()).toHaveLength(51);
    expect(texts(root)).toContain('Calvary Leading Space');
    await act(async () => list().props.onEndReached());
    expect(ids()).toHaveLength(101);
    await act(async () => list().props.onEndReached());
    expect(ids()).toHaveLength(121);
    await act(async () => list().props.onEndReached());
    expect(mockGet.mock.calls.filter(c => c[0] === 'churches')).toHaveLength(3);
  });

  it('keeps the ticks when the parent re-renders with a new selected object', async () => {
    const onDone = jest.fn();
    const props = {visible: true, onClose: () => {}, onDone};
    const root = mount(<ChurchMultiSelectModal {...props} selected={{}} />);
    await flush();
    const row = root.root.findAll(n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes('Church 001'))[0];
    await act(async () => row.props.onPress());
    act(() => {
      root.update(
        <ThemeProvider>
          <LanguageProvider>
            <ChurchMultiSelectModal {...props} selected={{}} />
          </LanguageProvider>
        </ThemeProvider>,
      );
    });
    await act(async () => button(root, 'Done').props.onPress());
    expect(onDone).toHaveBeenCalledWith({1001: 'Church 001'});
  });
});

describe('form', () => {
  it('edit sends the whole watch list once (PATCH replaces missing fields) and returns', async () => {
    mockRouteParams = {watchListId: 67};
    let release: (v?: unknown) => void = () => {};
    mockPatch.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<WatchListFormScreen />);
    await flush();
    await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText('  QA   WL 2 '));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/watchlists/67', {
      name: 'QA WL 2',
      sort_by: 'country_id',
      sortlist: '',
      church_ids: [76],
    });
    await act(async () => release({data: {success: true, message: 'Watchlist updated successfully'}}));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('has Cancel and blocks a blank name', async () => {
    const root = mount(<WatchListFormScreen />);
    await flush();
    await act(async () => button(root, 'Save').props.onPress());
    expect(mockPost).not.toHaveBeenCalled();
    expect(texts(root)).toContain('Required');
    await act(async () => button(root, 'Cancel').props.onPress());
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});

describe('list', () => {
  it('shows the churches with details and deletes after confirmation', async () => {
    mockDelete.mockResolvedValue({data: {success: true}});
    (Alert.alert as jest.Mock).mockImplementation((_t, _m, buttons?: any[]) => {
      buttons?.find(b => b.style === 'destructive')?.onPress?.();
    });
    const root = mount(<WatchListScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('VFC HCMC');
    const del = root.root.findAll(n => n.props.accessibilityLabel === 'Delete' && n.props.onPress)[0];
    await act(async () => del.props.onPress());
    await flush();
    expect(mockDelete).toHaveBeenCalledWith('/watchlists/67');
    expect(texts(root).join('\n')).not.toContain('VFC HCMC');
  });
});
