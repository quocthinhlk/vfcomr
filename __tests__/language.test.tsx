/**
 * Languages: name rules, loading every page (the API search is prefix-only
 * with a wrong total), FAQ usage check and the list / add / edit / delete
 * screens against a mocked API (answers copied from staging).
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'Languages'}, {name: 'X'}]})),
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
  cleanLanguageName,
  filterLanguages,
  isDuplicateNameError,
  validateLanguageName,
} from '../app/modules/language/utils/language.utils';
import {
  getLanguageFaqCount,
  listAllLanguages,
} from '../app/modules/language/services/language.service';
import {LanguagesScreen} from '../app/modules/language/screens/LanguagesScreen';
import AddLanguageScreen from '../app/modules/language/screens/AddLanguageScreen';
import EditLanguageScreen from '../app/modules/language/screens/EditLanguageScreen';
import DeleteLanguageScreen from '../app/modules/language/screens/DeleteLanguageScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const LANGS = Array.from({length: 60}, (_, i) => ({id: i + 1, name: `Lang ${i + 1}`}));
LANGS[0].name = 'English';
LANGS[2].name = 'Português';
LANGS[13].name = 'Vietnamese';
LANGS[59].name = 'Vietnam - khmer Cambo';
const DUPLICATE = {
  isAxiosError: true,
  response: {status: 400, data: {success: false, message: 'Language name already exists'}},
};
let faqs: Record<number, number> = {};

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
  faqs = {};
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string, config?: any) => {
    if (url === '/languages') {
      const {page, limit} = config.params;
      const items = LANGS.slice((page - 1) * limit, page * limit);
      return {data: {success: true, data: {items, total: 60, page, limit, has_next: page * limit < 60}}};
    }
    if (url === '/faqs') {
      const n = faqs[config.params.language_id] ?? 0;
      return {data: {success: true, data: n ? Array.from({length: n}, (_, i) => ({id: i})) : null}};
    }
    const one = /^\/languages\/(\d+)$/.exec(url);
    const found = one && LANGS.find(l => l.id === Number(one[1]));
    if (found) {
      return {data: {success: true, data: found}};
    }
    throw {isAxiosError: true, response: {status: 400, data: {success: false, message: 'sql: no rows in result set'}}};
  });
});

describe('rules', () => {
  it('validates names and finds duplicates ignoring case and spaces', () => {
    expect(validateLanguageName('  ')).toBe('required');
    expect(validateLanguageName('x'.repeat(256))).toBe('tooLong');
    expect(validateLanguageName(' ENGLISH ', LANGS)).toBe('duplicate');
    expect(validateLanguageName('English', LANGS, 1)).toBeNull();
    expect(cleanLanguageName('  Old   Norse ')).toBe('Old Norse');
    expect(isDuplicateNameError(DUPLICATE)).toBe(true);
  });

  it('searches anywhere in the name, ignoring accents', () => {
    expect(filterLanguages(LANGS, 'nam').map(l => l.id)).toEqual([14, 60]);
    expect(filterLanguages(LANGS, 'portu').map(l => l.id)).toEqual([3]);
  });
});

describe('service', () => {
  it('loads every language in pages of 100 (larger limits fall back to 10)', async () => {
    const all = await listAllLanguages();
    expect(all).toHaveLength(60);
    expect(mockGet).toHaveBeenCalledWith('/languages', {params: {page: 1, limit: 100}});
  });

  it('counts FAQs of a language (null means none)', async () => {
    faqs[1] = 11;
    await expect(getLanguageFaqCount(1)).resolves.toBe(11);
    await expect(getLanguageFaqCount(5)).resolves.toBe(0);
  });
});

describe('list screen', () => {
  it('finds "nam" in Vietnamese with correct pages, without new requests', async () => {
    const root = mount(<LanguagesScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('60 languages');
    const calls = mockGet.mock.calls.length;
    await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText('nam'));
    expect(mockGet.mock.calls.length).toBe(calls);
    const all = texts(root).join('\n');
    expect(all).toContain('2 languages');
    expect(all).toContain('Vietnamese');
    expect(all).toContain('Vietnam - khmer Cambo');
    const bar = root.root.findAll(n => typeof n.props.onPageChange === 'function' && n.props.totalPages != null)[0];
    expect(bar.props.totalPages).toBe(1);
  });
});

describe('add screen', () => {
  it('validates under the field, saves once and returns to the list', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddLanguageScreen />);
    await typeName(root, '  ');
    await press(root, 'Save');
    expect(mockPost).not.toHaveBeenCalled();
    expect(texts(root)).toContain('The Name field is required.');
    expect(Alert.alert).not.toHaveBeenCalled();

    await typeName(root, ' Old   Norse ');
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/languages', {name: 'Old Norse'});
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('Languages', {reload: true});
  });

  it('shows the API duplicate answer under the field', async () => {
    mockPost.mockRejectedValue(DUPLICATE);
    const root = mount(<AddLanguageScreen />);
    await typeName(root, 'english');
    await press(root, 'Save');
    expect(texts(root)).toContain('A language with this name already exists.');
  });
});

describe('edit screen', () => {
  it('blocks a rename to an existing language (the API would allow it)', async () => {
    mockRouteParams = {languageId: 14};
    const root = mount(<EditLanguageScreen />);
    await flush();
    await typeName(root, 'English');
    await press(root, 'Save');
    expect(mockPatch).not.toHaveBeenCalled();
    expect(texts(root)).toContain('A language with this name already exists.');
  });

  it('saves a new name', async () => {
    mockRouteParams = {languageId: 14};
    mockPatch.mockResolvedValue({data: {success: true}});
    const root = mount(<EditLanguageScreen />);
    await flush();
    await typeName(root, 'Vietnamese (Tiếng Việt)');
    await press(root, 'Save');
    expect(mockPatch).toHaveBeenCalledWith('/languages/14', {name: 'Vietnamese (Tiếng Việt)'});
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });
});

describe('delete screen', () => {
  it('blocks deleting a language FAQs use and warns about churches', async () => {
    mockRouteParams = {languageId: 1};
    faqs[1] = 11;
    const root = mount(<DeleteLanguageScreen />);
    await flush();
    const all = texts(root).join('\n');
    expect(all).toContain('11 FAQ(s) still use it');
    expect(all).toContain('the app cannot check them');
    await press(root, 'Delete');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes an unused language once', async () => {
    mockRouteParams = {languageId: 5};
    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<DeleteLanguageScreen />);
    await flush();
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('Languages', expect.objectContaining({reload: true}));
  });
});
