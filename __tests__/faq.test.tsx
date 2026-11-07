/**
 * FAQ, checked against the live API: no stored-token requirement, "no match"
 * answers data: null, tags replace (deduped), field errors named
 * question_header (POST) or QuestionHeader (PATCH), searches that race.
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
  getState: jest.fn(() => ({index: 1, routes: [{name: 'FAQs'}, {name: 'X'}]})),
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
jest.mock('react-native-pell-rich-editor', () => {
  const RN = require('react-native');
  return {
    RichEditor: () => null,
    RichToolbar: () => <RN.View testID="docked-toolbar" />,
    actions: {},
  };
});
jest.mock('../app/modules/faq/components/FAQRichTextEditor', () => {
  const RN = require('react-native');
  const ReactLib = require('react');
  const DockedToolbarContext = ReactLib.createContext(null);
  return {
    DockedToolbarContext,
    TOOLBAR_ACTIONS: [],
    // Focus reports itself to the form, as the real editor does.
    FAQRichTextEditor: ({initialHtml, onChange}: any) => {
      const dock: any = ReactLib.useContext(DockedToolbarContext);
      const ref = ReactLib.useRef(null);
      return (
        <RN.TextInput
          testID="answer"
          defaultValue={initialHtml}
          onChangeText={onChange}
          onFocus={() => dock?.setDockedEditor(ref)}
          onBlur={() => dock?.setDockedEditor(null)}
        />
      );
    },
  };
});
jest.mock('../app/modules/faq/components/FAQAnswer', () => {
  const RN = require('react-native');
  return {FAQAnswer: ({answer}: any) => <RN.Text>{answer}</RN.Text>};
});
jest.mock('../app/shared/components/PaginatedListPager', () => ({
  PaginatedListPager: ({children}: any) => children,
}));
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  const RN = jest.requireActual('react-native/Libraries/Components/View/View');
  return RN.default ?? RN;
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../app/config/api';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';
import ElementDropdown from '../app/shared/components/ElementDropdown';
import {buildFaqTags, faqFieldErrors, tagNames} from '../app/modules/faq/utils/faq.utils';
import {encodeUrlSpaces} from '../app/modules/faq/utils/faqHtml';
import {ScrollView} from 'react-native';
import {listFAQs, getFAQById} from '../app/modules/faq/services/faq.service';
import FAQsScreen from '../app/modules/faq/screens/FAQsScreen';
import SearchFAQScreen from '../app/modules/faq/screens/SearchFAQScreen';
import AddFAQScreen from '../app/modules/faq/screens/AddFAQScreen';
import EditFAQScreen from '../app/modules/faq/screens/EditFAQScreen';
import DeleteFAQScreen from '../app/modules/faq/screens/DeleteFAQScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const FAQS = [
  {id: 23, question_header: 'How do I reset my password?', answer: 'To reset…', language_id: 1, created_at: '', modified_at: '', tags: [{id: 98, tag_name: 'account', question_id: 23}]},
  {id: 19, question_header: 'Visits: How do I enter visits?', answer: '<ol><li>Go</li></ol>', language_id: 1, created_at: '', modified_at: '', tags: [{id: 5, tag_name: '', question_id: 19}]},
  {id: 30, question_header: 'Comment réinitialiser ?', answer: '<p>fr</p>', language_id: 3, created_at: '', modified_at: ''},
];
const LANGS = [
  {id: 1, name: 'English'},
  {id: 3, name: 'Français'},
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
const inputs = (root: renderer.ReactTestRenderer) => root.root.findAllByType(TextInput);
const wait = (ms: number) => act(async () => new Promise(r => setTimeout(r, ms)));

const apiFilter = (params: any = {}) => {
  const q = (params.question_header || '').toLowerCase();
  const found = FAQS.filter(
    f =>
      (!q || f.question_header.toLowerCase().includes(q)) &&
      (!params.language_id || f.language_id === params.language_id),
  );
  // The API answers data: null when nothing matches.
  return {data: {success: true, data: found.length ? found : null, message: 'FAQs retrieved successfully'}};
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockRouteParams = {};
  // As with the dev test token: nothing saved in AsyncStorage.
  await AsyncStorage.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string, config?: any) => {
    if (url === '/faqs') {
      return apiFilter(config?.params);
    }
    if (url === 'users/me') {
      return {data: {data: {id: 4825, role: {id: 2, name: 'Admin'}}}};
    }
    if (url === '/languages') {
      return {data: {data: {items: LANGS, has_next: false}}};
    }
    const one = /^\/faqs\/(\d+)$/.exec(url);
    const found = one && FAQS.find(f => f.id === Number(one[1]));
    if (found) {
      return {data: {success: true, data: found}};
    }
    throw {isAxiosError: true, response: {status: 404, data: {success: false, message: 'FAQ not found'}}};
  });
});

describe('helpers', () => {
  it('builds tags like the web: trimmed, no empties, no repeats ignoring case', () => {
    expect(buildFaqTags([' qa ', 'QA', '', 'test', 'Test  case'])).toEqual([
      {tag_name: 'qa'},
      {tag_name: 'test'},
      {tag_name: 'Test case'},
    ]);
    expect(tagNames(FAQS[1].tags)).toEqual([]);
    expect(tagNames(undefined)).toEqual([]);
  });

  it('maps POST and PATCH field error names', () => {
    expect(faqFieldErrors({question_header: 'a', language_id: 'b'})).toEqual({questionHeader: 'a', languageId: 'b'});
    expect(faqFieldErrors({QuestionHeader: 'a', Answer: 'c', LanguageID: 'b'})).toEqual({
      questionHeader: 'a',
      answer: 'c',
      languageId: 'b',
    });
  });
});

describe('answer HTML', () => {
  it('encodes spaces in image and link URLs only', () => {
    expect(encodeUrlSpaces('<p>a b</p><img src="/uploads/Church Pic Add.jpg" alt="x y">')).toBe(
      '<p>a b</p><img src="/uploads/Church%20Pic%20Add.jpg" alt="x y">',
    );
    expect(encodeUrlSpaces("<a href='/a b'>c d</a>")).toBe("<a href='/a%20b'>c d</a>");
  });
});

describe('service', () => {
  it('works without a token in AsyncStorage and turns data: null into []', async () => {
    await expect(listFAQs({question_header: 'xyz'})).resolves.toMatchObject({data: []});
    await expect(getFAQById(23)).resolves.toMatchObject({data: {id: 23}});
    expect(mockGet).toHaveBeenCalledWith('/faqs', {params: {question_header: 'xyz'}});
  });
});

describe('list', () => {
  it('keeps the newest search when an older answer arrives last', async () => {
    const root = mount(<FAQsScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('How do I reset my password?');
    let releaseOld: (v: any) => void = () => {};
    mockGet.mockImplementationOnce(() => new Promise(r => (releaseOld = r)));
    const search = inputs(root)[0];
    await act(async () => search.props.onChangeText('h'));
    await wait(350);
    await act(async () => search.props.onChangeText('visits'));
    await wait(350);
    await act(async () => releaseOld(apiFilter({})));
    const all = texts(root).join('\n');
    expect(all).toContain('Visits: How do I enter visits?');
    expect(all).not.toContain('How do I reset my password?');
  });
});

describe('search', () => {
  it('lists languages without a stored token and searches as you type', async () => {
    const root = mount(<SearchFAQScreen />);
    await flush();
    const lang = root.root.findByType(ElementDropdown);
    expect(lang.props.data.map((o: any) => o.label)).toEqual(['All', 'English', 'Français']);
    expect(mockGet).not.toHaveBeenCalledWith('/faqs', expect.anything());
    await act(async () => inputs(root)[0].props.onChangeText('reset'));
    await wait(450);
    expect(texts(root).join('\n')).toContain('How do I reset my password?');
    await act(async () => lang.props.onChange(3));
    await wait(450);
    expect(mockGet).toHaveBeenLastCalledWith('/faqs', {params: {language_id: 3, question_header: 'reset'}});
    expect(texts(root).join('\n')).toContain('No data found');
  });
});

describe('add / edit / delete', () => {
  it('adds once with deduped tags and returns to the list below', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<AddFAQScreen />);
    await flush();
    await act(async () => inputs(root)[0].props.onChangeText('QA question'));
    await act(async () => root.root.findByProps({testID: 'answer'}).props.onChangeText('<p>QA</p>'));
    await act(async () => root.root.findByType(ElementDropdown).props.onChange(1));
    const tagInput = () => inputs(root).filter(i => i.props.testID !== 'answer').slice(-1)[0];
    await act(async () => tagInput().props.onChangeText('qa'));
    const addTag = root.root.findAll(
      n => typeof n.props.onPress === 'function' && texts({root: n} as any).join('').startsWith('+ '),
    )[0];
    await act(async () => addTag.props.onPress());
    const tagFields = inputs(root).filter(i => i.props.testID !== 'answer').slice(1);
    expect(tagFields).toHaveLength(2);
    await act(async () => tagFields[1].props.onChangeText(' QA '));
    const save = button(root, 'Save');
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/faqs', {
      question_header: 'QA question',
      answer: '<p>QA</p>',
      language_id: 1,
      tags: [{tag_name: 'qa'}],
    });
    await act(async () => release({data: {success: true, data: {id: 40}}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('FAQs', {reload: true});
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('edit drops the empty saved tag and shows a PATCH field error under the field', async () => {
    mockRouteParams = {faqId: 19};
    mockPatch.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'Invalid request body', errors: {LanguageID: "failed on the 'required' tag"}}},
    });
    const root = mount(<EditFAQScreen />);
    await flush();
    const tagFields = inputs(root).filter(i => i.props.testID !== 'answer').slice(1);
    expect(tagFields.map(i => i.props.value)).toEqual(['']);
    await act(async () => button(root, 'Save').props.onPress());
    expect(mockPatch.mock.calls[0][1]).toMatchObject({tags: [], language_id: 1});
    expect(texts(root)).toContain("failed on the 'required' tag");
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('question is multi-line; a docked toolbar shows while the answer is focused', async () => {
    mockRouteParams = {faqId: 19};
    const root = mount(<EditFAQScreen />);
    await flush();
    const question = inputs(root)[0];
    expect(question.props.multiline).toBe(true);
    expect(question.props.value).toBe('Visits: How do I enter visits?');
    expect(root.root.findAllByProps({testID: 'docked-toolbar'})).toHaveLength(0);
    await act(async () => root.root.findByProps({testID: 'answer'}).props.onFocus());
    expect(root.root.findAllByProps({testID: 'docked-toolbar'}).length).toBeGreaterThan(0);
    await act(async () => root.root.findByProps({testID: 'answer'}).props.onBlur());
    expect(root.root.findAllByProps({testID: 'docked-toolbar'})).toHaveLength(0);
  });

  it('scrolls to the first invalid field on Save, not while typing', async () => {
    mockRouteParams = {faqId: 23};
    const scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo').mockImplementation(() => {});
    const root = mount(<EditFAQScreen />);
    await flush();
    await act(async () => inputs(root)[0].props.onChangeText(''));
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => button(root, 'Save').props.onPress());
    expect(mockPatch).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    await act(async () => inputs(root)[0].props.onChangeText('Q'));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockRestore();
  });

  it('deletes once and shows the API reason on failure', async () => {
    mockRouteParams = {faqId: 23};
    mockDelete.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'FAQ is locked'}},
    });
    const root = mount(<DeleteFAQScreen />);
    await flush();
    await act(async () => button(root, 'Delete').props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'FAQ is locked');
    let release: (v?: unknown) => void = () => {};
    mockDelete.mockImplementation(() => new Promise(r => (release = r)));
    const del = button(root, 'Delete');
    await act(async () => {
      del.props.onPress();
      del.props.onPress();
    });
    expect(mockDelete).toHaveBeenCalledTimes(2);
    await act(async () => release({data: {success: true}}));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('FAQs', expect.objectContaining({reload: true}));
  });
});
