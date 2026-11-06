/**
 * OMR Support: the request needs an e-mail (every request without it was
 * rejected), validation, prefill from the profile and the API's per-field
 * errors (mocked API, answers copied from staging).
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
jest.mock('../app/shared/components/ApiErrorState', () => {
  const RN = require('react-native');
  return {__esModule: true, default: ({onRetry}: any) => <RN.Text onPress={onRetry}>retry</RN.Text>};
});
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
  buildSupportPayload,
  contactFromProfile,
  shouldShowEditEmail,
  validateSupport,
} from '../app/modules/omrsupport/utils/omrSupport.utils';
import {OmrSupportScreen} from '../app/modules/omrsupport/screens/OmrSupportScreen';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const INTRO = {title: 'OMR Support', message: 'Hi Tin,\nWelcome to OMR'};
const ME = {id: 4825, name: 'Tin Trann', first_name: 'Tin', last_name: 'Trann', email_address: 'tin@example.com'};

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
const input = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAll(n => n.type === TextInput && n.props.accessibilityLabel?.startsWith(label))[0];
const send = (root: renderer.ReactTestRenderer) =>
  root.root.findAll(n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes('Send Request'))[0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockGet.mockImplementation(async (url: string) => {
    if (url === 'support') {
      return {data: {success: true, data: INTRO}};
    }
    if (url === 'users/me') {
      return {data: {success: true, data: ME}};
    }
    throw new Error('unexpected ' + url);
  });
});

describe('rules', () => {
  it('only requires the fields; the e-mail is checked by the server', () => {
    expect(validateSupport({name: ' ', email: '', subject: 'a', message: '  '})).toEqual({
      name: 'required',
      email: 'required',
      message: 'required',
    });
    expect(validateSupport({name: 'a', email: 'not-mail', subject: 'a', message: 'a'})).toEqual({});
    expect(buildSupportPayload({name: ' A ', email: ' a@b.co ', subject: ' S ', message: ' M '})).toEqual({
      name: 'A',
      email: 'a@b.co',
      subject: 'S',
      message: 'M',
    });
    expect(shouldShowEditEmail({email: 'x', showEditEmailButton: 'true'})).toBe(true);
    expect(shouldShowEditEmail({email: 'x'})).toBe(false);
  });

  it('reads name and id from the profile', () => {
    expect(contactFromProfile({...ME, id: 4825})).toEqual({name: 'Tin Trann', id: 4825});
    expect(contactFromProfile({first_name: 'A', last_name: 'B'})).toEqual({name: 'A B', id: null});
  });
});

describe('screen', () => {
  it('shows the intro, prefills the name only, and sends once with the matching e-mail', async () => {
    let release: (v?: unknown) => void = () => {};
    mockPost.mockImplementation(() => new Promise(r => (release = r)));
    const root = mount(<OmrSupportScreen />);
    await flush();
    expect(texts(root).join('\n')).toContain('Welcome to OMR');
    expect(input(root, 'Name').props.value).toBe('Tin Trann');
    // Not prefilled: typing the profile e-mail is the check.
    expect(input(root, 'E-mail').props.value).toBe('');

    await act(async () => input(root, 'E-mail').props.onChangeText('Tin@Example.com'));
    await act(async () => input(root, 'Subject').props.onChangeText('Login issue'));
    await act(async () => input(root, 'Message').props.onChangeText('Cannot sign in'));
    await act(async () => {
      send(root).props.onPress();
      send(root).props.onPress();
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('support', {
      name: 'Tin Trann',
      email: 'Tin@Example.com',
      subject: 'Login issue',
      message: 'Cannot sign in',
    });
    await act(async () => release({data: {success: true}}));
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Support request sent successfully.');
    // Who is writing stays; the request is cleared.
    expect(input(root, 'Name').props.value).toBe('Tin Trann');
    expect(input(root, 'Subject').props.value).toBe('');
  });

  it('shows translated "required" errors and never blocks on the e-mail', async () => {
    mockGet.mockImplementation(async (url: string) =>
      url === 'support' ? {data: {data: INTRO}} : {data: {data: {}}},
    );
    mockPost.mockResolvedValue({data: {success: true}});
    const root = mount(<OmrSupportScreen />);
    await flush();
    await act(async () => send(root).props.onPress());
    const all = texts(root);
    expect(all).toContain('The Name field is required.');
    expect(all).toContain('The E-mail field is required.');
    expect(mockPost).not.toHaveBeenCalled();
    await act(async () => input(root, 'Name').props.onChangeText('A'));
    await act(async () => input(root, 'E-mail').props.onChangeText('not-an-email'));
    await act(async () => input(root, 'Subject').props.onChangeText('S'));
    await act(async () => input(root, 'Message').props.onChangeText('M'));
    await act(async () => send(root).props.onPress());
    // Sent as typed: the server decides.
    expect(mockPost).toHaveBeenCalledWith('support', expect.objectContaining({email: 'not-an-email'}));
  });

  it('shows the server e-mail mismatch with an Edit Profile link', async () => {
    const root = mount(<OmrSupportScreen />);
    await flush();
    await act(async () => input(root, 'E-mail').props.onChangeText('wrong@example.org'));
    await act(async () => input(root, 'Subject').props.onChangeText('S'));
    await act(async () => input(root, 'Message').props.onChangeText('M'));
    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          success: false,
          message: 'Validation failed',
          errors: {
            email: 'Your email does not match the OMR system records. Please update your email information.',
            showEditEmailButton: true,
          },
        },
      },
    });
    await act(async () => send(root).props.onPress());
    expect(texts(root).join('\n')).toContain('does not match the OMR system records');
    const link = root.root.findAll(n => typeof n.props.onPress === 'function' && texts({root: n} as any).includes('Edit Profile'))[0];
    await act(async () => link.props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile', {id: 4825});
    // Typing a new e-mail hides the link again.
    await act(async () => input(root, 'E-mail').props.onChangeText('tin@example.com'));
    expect(texts(root)).not.toContain('Edit Profile');
  });

  it('shows API field errors; an error on another field is not swallowed', async () => {
    const root = mount(<OmrSupportScreen />);
    await flush();
    await act(async () => input(root, 'E-mail').props.onChangeText('tin@example.com'));
    await act(async () => input(root, 'Subject').props.onChangeText('S'));
    await act(async () => input(root, 'Message').props.onChangeText('M'));
    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'Validation failed', errors: {email: 'Email must be a valid email address'}}},
    });
    await act(async () => send(root).props.onPress());
    expect(texts(root)).toContain('Email must be a valid email address');

    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: {status: 400, data: {success: false, message: 'Validation failed', errors: {phone: 'Phone is a required field'}}},
    });
    await act(async () => send(root).props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  });

  it('a failed intro offers a retry and keeps the form usable', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url === 'support') {
        throw {isAxiosError: true, message: 'Network Error'};
      }
      return {data: {data: ME}};
    });
    const root = mount(<OmrSupportScreen />);
    await flush();
    expect(texts(root)).toContain('retry');
    expect(input(root, 'Name').props.value).toBe('Tin Trann');
  });
});
