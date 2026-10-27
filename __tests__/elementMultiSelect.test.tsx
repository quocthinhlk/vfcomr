/** ElementMultiSelect uses ElementDropdown's field and sheet; rows toggle values. */
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable, Text, TouchableOpacity} from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

import ElementMultiSelect from '../app/shared/components/ElementMultiSelect';
import {ThemeProvider} from '../app/shared/context/ThemeContext';
import {LanguageProvider} from '../app/shared/context/LanguageContext';

const data = [
  {label: 'Asia', value: 1},
  {label: 'Europe', value: 2},
];

function setup(value: number[]) {
  const onChange = jest.fn();
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <ElementMultiSelect data={data} value={value} onChange={onChange} placeholder="Regions" />
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  return {root, onChange};
}

const texts = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(n => [].concat(n.props.children).join(''));

it('shows the picked labels in the field, like ElementDropdown', () => {
  const {root} = setup([1, 2]);
  expect(texts(root)).toContain('Asia, Europe');
});

it('toggles rows without closing, and × clears all', () => {
  const {root, onChange} = setup([2]);
  const field = root.root.findAllByType(Pressable)[0];
  act(() => field.props.onPress());
  const rowFor = (label: string) =>
    root.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityRole === 'checkbox' && p.props.accessibilityLabel === label)!;
  act(() => rowFor('Asia').props.onPress());
  expect(onChange).toHaveBeenLastCalledWith([2, 1]);
  act(() => rowFor('Europe').props.onPress());
  expect(onChange).toHaveBeenLastCalledWith([]);
  const clear = root.root
    .findAllByType(TouchableOpacity)
    .find(p => p.props.accessibilityLabel === 'Clear')!;
  act(() => clear.props.onPress());
  expect(onChange).toHaveBeenLastCalledWith([]);
  expect(texts(root)).toContain('Done');
});
