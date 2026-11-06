/**
 * Resources: folder loops, file edit payload (boolean flag, name kept),
 * file_ids / child_ids read fresh before saving, moving to the top level,
 * blocked folder deletes and out-of-order searches (mocked API, staging shapes).
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
    SafeAreaProvider: ({children}: any) => children,
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'Resources'}, {name: 'X'}]})),
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
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  exists: jest.fn(async () => false),
  stat: jest.fn(async () => ({size: 0})),
  unlink: jest.fn(async () => {}),
  downloadFile: jest.fn(() => ({promise: Promise.resolve({statusCode: 404})})),
}));
jest.mock('react-native-file-viewer', () => ({open: jest.fn(async () => {})}));
jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
  isErrorWithCode: () => false,
  pick: jest.fn(),
  types: {allFiles: '*/*'},
}));
jest.mock('react-native-gesture-handler', () => {
  const chain: any = new Proxy({}, {get: () => () => chain});
  return {Gesture: {Pan: () => chain, LongPress: () => chain, Simultaneous: () => chain, Exclusive: () => chain}, GestureDetector: ({children}: any) => children};
});
jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  const C = ({children}: any) => <RN.View>{children}</RN.View>;
  return new Proxy({__esModule: true, default: C}, {get: (t: any, k) => (k in t ? t[k] : C)});
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

import * as RNFS from 'react-native-fs';
import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import {
  descendantIds,
  parentChoices,
  positiveInt,
  stripHtml,
} from '../app/modules/resources/utils/resource.utils';
import {
  detachFromParent,
  listResources,
  payloadFromDetail,
  updateResourceFile,
} from '../app/modules/resources/services/resource.service';
import SearchResourcesScreen from '../app/modules/resources/screens/SearchResourcesScreen';
import ResourceDetailScreen from '../app/modules/resources/screens/ResourceDetailScreen';
import AddNewResourceScreen from '../app/modules/resources/screens/AddNewResourceScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = (api as any).delete as jest.Mock;

const file = (id: number, over: any = {}) => ({
  id,
  resource_id: 2,
  filename: `doc${id}.pdf`,
  part_no: 1,
  format_id: 1,
  sort_order: id,
  path: `/uploads/resources/2/en/doc${id}.pdf`,
  url: `https://api-staging.vfc-omr.org/storage/uploads/resources/2/en/doc${id}.pdf`,
  created: '',
  modified: '',
  is_ai_translated: false,
  lang: 'en',
  ...over,
});
const LIST = [
  {id: 1, parent_id: null, name: 'VFC Visions & Values', short_description: null, graphic_path: '', available_languages: ['en'], sort_order: 1},
  {id: 2, parent_id: null, name: 'VFC ADN', short_description: 'A &amp; B&#39;s <b>DNA</b><br>line', graphic_path: '/uploads/resources/x.jpg', available_languages: ['en', 'ms'], sort_order: 2},
  {id: 20, parent_id: 2, name: 'Grow track', short_description: null, graphic_path: '', available_languages: ['en'], sort_order: 1},
  {id: 30, parent_id: 20, name: 'Week 1', short_description: null, graphic_path: '', available_languages: ['en'], sort_order: 1},
];
let DETAIL: Record<number, any> = {};

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
const byLabel = (root: renderer.ReactTestRenderer, re: RegExp) =>
  root.root.findAll(n => typeof n.props.onPress === 'function' && re.test(n.props.accessibilityLabel ?? ''))[0];
const button = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAll(
    n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes(label),
  )[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  mockPicker.imagePath = null;
  DETAIL = {
    2: {...LIST[1], files: [file(11), file(13)], children: [LIST[2]]},
    20: {...LIST[2], files: [], children: [LIST[3]]},
    30: {...LIST[3], files: [], children: []},
  };
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string, config?: any) => {
    if (url === '/users/me') {
      return {data: {data: {role_id: 2, role: 'Admin'}}};
    }
    if (url === '/resources/formats') {
      return {data: {success: true, data: [{id: 1, name: 'Transcript', description: null}]}};
    }
    if (url === '/resources/') {
      const name = config?.params?.name;
      const items = name ? LIST.filter(r => r.name.toLowerCase().includes(name.toLowerCase())) : LIST;
      return {data: {success: true, data: items}};
    }
    const one = /^\/resources\/(\d+)$/.exec(url);
    if (one && DETAIL[Number(one[1])]) {
      return {data: {success: true, data: DETAIL[Number(one[1])]}};
    }
    throw {isAxiosError: true, response: {status: 404, data: {success: false, message: 'not found'}}};
  });
  mockPatch.mockResolvedValue({data: {success: true}});
});

describe('helpers', () => {
  it('blocks a resource and everything under it as parent', () => {
    expect([...descendantIds(LIST, 2)].sort()).toEqual([20, 30]);
    expect(parentChoices(LIST, 2).map(o => o.value)).toEqual([1]);
    expect(parentChoices(LIST).map(o => o.value)).toEqual([1, 2, 20, 30]);
  });

  it('turns old web HTML into text and parses numbers', () => {
    expect(stripHtml(LIST[1].short_description, '\n')).toBe("A & B's DNA\nline");
    expect(stripHtml('a&nbsp;&lt;b&gt;')).toBe('a <b>');
    expect(positiveInt('3')).toBe(3);
    expect(positiveInt('2.5')).toBe(1);
    expect(positiveInt('abc')).toBe(1);
  });
});

describe('service', () => {
  it('sends the AI flag as a JSON boolean (1/0 is rejected by the API)', async () => {
    await updateResourceFile(14, {filename: 'a.txt', part_no: 2, lang: 'vi', is_ai_translated: true});
    expect(mockPatch).toHaveBeenCalledWith('/resources/files/14', {
      filename: 'a.txt',
      part_no: 2,
      lang: 'vi',
      is_ai_translated: true,
    });
  });

  it('moves a resource to the top level by removing it from the parent', async () => {
    await detachFromParent(2, 20);
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/resources/2');
    expect(body).toEqual({...payloadFromDetail(DETAIL[2]), child_ids: []});
    // The parent's files are kept (an empty file_ids detaches them).
    expect(body.file_ids).toEqual([11, 13]);
    expect(body.short_description).toBe(LIST[1].short_description);
  });
});

describe('list names', () => {
  it('takes name / description from the detail (the list shows another resource\'s text)', async () => {
    const wrong = {
      id: 29,
      parent_id: null,
      name: 'Discipleship Foundations (EN)',
      short_description: 'Foundations for growth (EN)',
      graphic_path: '',
      available_languages: ['en'],
      sort_order: 1,
    };
    DETAIL[29] = {...wrong, name: 'QA Android Resource', short_description: 'QA description', files: [], children: []};
    mockGet.mockImplementationOnce(async () => ({data: {success: true, data: [LIST[0], wrong]}}));
    const res = await listResources();
    expect(res.data.map(r => r.name)).toEqual(['VFC Visions & Values', 'QA Android Resource']);
    expect(res.data[1].short_description).toBe('QA description');

    // The API search matched it on the wrong text: dropped.
    mockGet.mockImplementationOnce(async () => ({data: {success: true, data: [wrong]}}));
    expect((await listResources({name: 'disciple'})).data).toEqual([]);
  });
});

describe('edit resource', () => {
  it('sends fresh file / child ids, clears the description with "" and detaches for top level', async () => {
    mockRouteParams = {resourceId: 20};
    const root = mount(<AddNewResourceScreen />);
    await flush();
    const parent = root.root.findAllByType(ElementDropdown)[0];
    // Itself and its sub-folder are not offered.
    expect(parent.props.data.map((o: any) => o.value)).toEqual([-1, 1, 2]);
    // A file was uploaded after the form opened.
    DETAIL[20] = {...DETAIL[20], files: [file(99, {resource_id: 20})]};
    await act(async () => parent.props.onChange(-1));
    await act(async () => button(root, 'Save').props.onPress());
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/resources/20');
    expect(body).toMatchObject({parent_id: null, short_description: '', file_ids: [99], child_ids: [30]});
    // Then removed from the old parent's children, keeping its files.
    expect(mockPatch.mock.calls[1][0]).toBe('/resources/2');
    expect(mockPatch.mock.calls[1][1]).toMatchObject({child_ids: [], file_ids: [11, 13]});
    expect(mockNavigation.popTo).toHaveBeenCalled();
  });

  it('creates once on a double tap; a failed graphic upload is reported', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddNewResourceScreen />);
    await flush();
    await act(async () => root.root.findAllByType(TextInput)[0].props.onChangeText('QA folder'));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][1]).toMatchObject({name: 'QA folder', file_ids: [], child_ids: [], short_description: ''});
    await act(async () => release({data: {success: true, data: {resource_id: 50}}}));
    expect(mockNavigation.replace).toHaveBeenCalledWith('ResourceDetail', {resourceId: 50});

    mockPost.mockReset();
    mockPicker.imagePath = '/tmp/pic.jpg';
    mockPost.mockResolvedValueOnce({data: {success: true, data: {}}});
    const root2 = mount(<AddNewResourceScreen />);
    await flush();
    await act(async () => root2.root.findAllByType(TextInput)[0].props.onChangeText('QA folder 2'));
    await act(async () => button(root2, 'Save').props.onPress());
    expect(mockPost).toHaveBeenCalledTimes(1); // only the upload, no create
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  });
});

describe('detail', () => {
  it('file edit keeps the name read-only and saves the flag as boolean', async () => {
    mockRouteParams = {resourceId: 2};
    const root = mount(<ResourceDetailScreen />);
    await flush();
    await act(async () => byLabel(root, /^doc11\.pdf: /).props.onPress());
    await act(async () => button(root, 'Edit').props.onPress());
    const nameInput = root.root.findAll(n => n.type === TextInput && n.props.value === 'doc11.pdf')[0];
    expect(nameInput.props.editable).toBe(false);
    expect(texts(root).join('\n')).toContain("can't be changed here");
    await act(async () => root.root.findAll(n => typeof n.props.onValueChange === 'function').pop()!.props.onValueChange(true));
    const save = root.root.findAll(n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes('Save')).pop()!;
    await act(async () => save.props.onPress());
    expect(mockPatch).toHaveBeenCalledWith('/resources/files/11', {
      filename: 'doc11.pdf',
      part_no: 1,
      lang: 'en',
      is_ai_translated: true,
    });
  });

  it('blocks deleting a folder that has child resources', async () => {
    mockRouteParams = {resourceId: 2};
    const root = mount(<ResourceDetailScreen />);
    await flush();
    await act(async () => byLabel(root, /^VFC ADN: /).props.onPress());
    await act(async () => button(root, 'Delete').props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('1 child resource'));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deleting a sub-folder goes back to its parent folder', async () => {
    mockRouteParams = {resourceId: 30};
    mockDelete.mockResolvedValue({data: {success: true}});
    mockNavigation.getState.mockReturnValue({
      index: 2,
      routes: [{name: 'Resources'}, {name: 'ResourceDetail'}, {name: 'ResourceDetail'}],
    } as any);
    (Alert.alert as jest.Mock).mockImplementation((_t, _m, buttons?: any[]) => {
      buttons?.find(b => b.style === 'destructive')?.onPress?.();
    });
    const root = mount(<ResourceDetailScreen />);
    await flush();
    await act(async () => byLabel(root, /^Week 1: /).props.onPress());
    await act(async () => button(root, 'Delete').props.onPress());
    await flush();
    expect(mockDelete).toHaveBeenCalledWith('/resources/30');
    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(mockNavigation.popTo).not.toHaveBeenCalled();
  });

  it('removes a failed download from the cache', async () => {
    mockRouteParams = {resourceId: 2};
    const root = mount(<ResourceDetailScreen />);
    await flush();
    await act(async () => byLabel(root, /^doc11\.pdf, /).props.onPress());
    expect(RNFS.unlink).toHaveBeenCalledWith(expect.stringContaining('resource-11-doc11.pdf'));
  });
});

describe('search', () => {
  it('shows the newest search even when an older answer arrives last', async () => {
    const root = mount(<SearchResourcesScreen />);
    await flush();
    let releaseOld: (v: any) => void = () => {};
    mockGet.mockImplementationOnce(() => new Promise(r => (releaseOld = r)));
    const search = root.root.findAllByType(TextInput)[0];
    await act(async () => {
      search.props.onChangeText('v');
      await new Promise(r => setTimeout(r, 450));
    });
    await act(async () => {
      search.props.onChangeText('grow');
      await new Promise(r => setTimeout(r, 450));
    });
    await act(async () => releaseOld({data: {success: true, data: LIST}}));
    const all = texts(root).join('\n');
    expect(all).toContain('Grow track');
    expect(all).not.toContain('VFC Visions & Values');
  });
});
