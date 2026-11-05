/**
 * Countries: name rules, service calls (no stored-token header, duplicate and
 * usage lookups) and the list / add / edit / delete screens against a mocked
 * API (answers copied from staging).
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'Countries'}, {name: 'X'}]})),
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
import {
  cleanCountryName,
  isDuplicateNameError,
  validateCountryName,
} from '../app/modules/country/utils/country.utils';
import {
  findCountryByName,
  getCountryUsage,
  listCountries,
} from '../app/modules/country/services/country.service';
import {CountriesScreen} from '../app/modules/country/screens/CountriesScreen';
import AddCountryScreen from '../app/modules/country/screens/AddCountryScreen';
import EditCountryScreen from '../app/modules/country/screens/EditCountryScreen';
import DeleteCountryScreen from '../app/modules/country/screens/DeleteCountryScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const COUNTRIES = [
  {id: 1, name: 'Afganistan'},
  {id: 53, name: "Cote d'Ivoire"},
  {id: 231, name: 'Vietnam'},
  {id: 255, name: 'QA Country'},
];
const DUPLICATE = {
  isAxiosError: true,
  response: {status: 400, data: {success: false, message: 'Country name already exists'}},
};
const page = (items: any[], p = 1, total = items.length, pages = 1) => ({
  data: {success: true, data: {items, total, page: p, limit: 10, total_pages: pages}},
});

let usage: Record<number, {churches: number; cities: number}> = {};

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

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  usage = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string, config?: any) => {
    if (url === '/countries') {
      const q = (config?.params?.name || '').toLowerCase();
      return page(COUNTRIES.filter(c => c.name.toLowerCase().includes(q)));
    }
    if (url === 'churches') {
      return {data: {success: true, data: {items: [], total: usage[config.params.country_id]?.churches ?? 0}}};
    }
    const cities = /^cities\/country\/(\d+)$/.exec(url);
    if (cities) {
      const n = usage[Number(cities[1])]?.cities ?? 0;
      return {data: {success: true, data: n ? Array.from({length: n}, (_, i) => ({id: i})) : null}};
    }
    const one = /^\/countries\/(\d+)$/.exec(url);
    const found = one && COUNTRIES.find(c => c.id === Number(one[1]));
    if (found) {
      return {data: {success: true, data: found}};
    }
    throw {isAxiosError: true, response: {status: 400, data: {success: false, message: 'sql: no rows in result set'}}};
  });
});

describe('name rules', () => {
  it('requires a non-blank name of at most 255 characters', () => {
    expect(validateCountryName('   ')).toBe('required');
    expect(validateCountryName('x'.repeat(256))).toBe('tooLong');
    expect(validateCountryName('x'.repeat(255))).toBeNull();
    expect(cleanCountryName('  Bosnia   and  Herzegovina ')).toBe('Bosnia and Herzegovina');
    expect(isDuplicateNameError(DUPLICATE)).toBe(true);
    expect(isDuplicateNameError(new Error('Network Error'))).toBe(false);
  });
});

describe('service', () => {
  it('lets the api interceptor add the token and trims the search', async () => {
    await listCountries({page: 2, search: '  viet '});
    expect(mockGet).toHaveBeenCalledWith('/countries', {params: {page: 2, limit: 10, name: 'viet'}});
  });

  it('finds another country with the same name, ignoring case and spaces', async () => {
    await expect(findCountryByName(' VIETNAM ')).resolves.toEqual({id: 231, name: 'Vietnam'});
    await expect(findCountryByName('vietnam', 231)).resolves.toBeNull();
    await expect(findCountryByName('Viet')).resolves.toBeNull();
  });

  it('counts churches and cities using a country (cities answer null for none)', async () => {
    usage[231] = {churches: 29, cities: 8};
    await expect(getCountryUsage(231)).resolves.toEqual({churches: 29, cities: 8});
    await expect(getCountryUsage(255)).resolves.toEqual({churches: 0, cities: 0});
    expect(mockGet).toHaveBeenCalledWith('churches', {params: {country_id: 231, page: 1, limit: 1}});
  });
});

describe('list screen', () => {
  it('shows the newest search even when an older answer arrives last', async () => {
    const root = mount(<CountriesScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('Vietnam');

    let releaseOld: (v: any) => void = () => {};
    mockGet.mockImplementationOnce(() => new Promise(r => (releaseOld = r)));
    mockGet.mockImplementationOnce(async () => page([COUNTRIES[1]]));
    const search = root.root.findAllByType(TextInput)[0];
    await act(async () => {
      search.props.onChangeText('a');
      await new Promise(r => setTimeout(r, 450));
    });
    await act(async () => {
      search.props.onChangeText('cote');
      await new Promise(r => setTimeout(r, 450));
    });
    await act(async () => releaseOld(page(COUNTRIES)));
    const all = texts(root).join('\n');
    expect(all).toContain("Cote d'Ivoire");
    expect(all).not.toContain('Vietnam');
  });

  it('a page past the end after a delete shows the new last page', async () => {
    let pages = 2;
    mockGet.mockImplementation(async (_url: string, config?: any) => {
      const p = config.params.page;
      if (p === 2 && pages === 2) {
        return page([COUNTRIES[3]], 2, 11, 2);
      }
      return p === 1 ? page(COUNTRIES.slice(0, 3), 1, pages === 2 ? 11 : 10, pages) : page([], p, 10, 1);
    });
    const root = mount(<CountriesScreen />);
    await flush();
    const bar = () => root.root.findAll(n => typeof n.props.onPageChange === 'function')[0];
    await act(async () => bar().props.onPageChange(2));
    expect(texts(root).join('\n')).toContain('QA Country');
    // The only item on page 2 was deleted elsewhere; pull to refresh.
    pages = 1;
    const refresh = root.root.findAll(n => typeof n.props.onRefresh === 'function')[0];
    await act(async () => refresh.props.onRefresh());
    const all = texts(root).join('\n');
    expect(all).toContain('Vietnam');
    expect(all).not.toContain('No data found');
  });
});

describe('add screen', () => {
  it('validates, saves once on a double tap and returns to the list', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddCountryScreen />);
    await typeName(root, '   ');
    await press(root, 'Save');
    expect(mockPost).not.toHaveBeenCalled();
    expect(texts(root)).toContain('The Name field is required.');

    await typeName(root, '  New   Country ');
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/countries', {name: 'New Country'});
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('Countries', {reload: true});
  });

  it('shows the duplicate-name answer under the field', async () => {
    mockPost.mockRejectedValue(DUPLICATE);
    const root = mount(<AddCountryScreen />);
    await typeName(root, 'vietnam');
    await press(root, 'Save');
    expect(texts(root)).toContain('A country with this name already exists.');
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('edit screen', () => {
  it('blocks renaming to an existing country (the API would save a duplicate)', async () => {
    mockRouteParams = {countryId: 255};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditCountryScreen />);
    await flush();
    await typeName(root, 'Vietnam');
    await press(root, 'Save');
    expect(mockPatch).not.toHaveBeenCalled();
    expect(texts(root)).toContain('A country with this name already exists.');
  });

  it('saves a new or re-cased name and returns', async () => {
    mockRouteParams = {countryId: 255};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditCountryScreen />);
    await flush();
    await typeName(root, 'qa country');
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/countries/255', {name: 'qa country'});
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });
});

describe('delete screen', () => {
  it('blocks deleting a country that churches or cities use', async () => {
    mockRouteParams = {countryId: 231};
    usage[231] = {churches: 29, cities: 8};
    const root = mount(<DeleteCountryScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('29 church(es) and 8 city/cities');
    await press(root, 'Delete');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes an unused country once and shows API errors in the page', async () => {
    mockRouteParams = {countryId: 255};
    mockDelete.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'sql: no rows in result set'}},
    });
    const root = mount(<DeleteCountryScreen />);
    await flush();
    await press(root, 'Delete');
    expect(Alert.alert).not.toHaveBeenCalled();
    const view = root.root.findAll(n => n.props.errorMessage !== undefined && n.props.onConfirm)[0];
    expect(view.props.errorMessage).toBeTruthy();

    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(2);
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('Countries', expect.objectContaining({reload: true}));
  });
});
