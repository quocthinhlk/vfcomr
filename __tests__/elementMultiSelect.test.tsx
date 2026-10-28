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

it('shows the picks as removable tags inside the field', () => {
  expect(texts(setup([1]).root)).toContain('Asia');
  const {root, onChange} = setup([1, 2]);
  expect(texts(root)).toEqual(expect.arrayContaining(['Asia', 'Europe']));
  const removeEurope = root.root
    .findAllByType(TouchableOpacity)
    .find(p => p.props.accessibilityLabel === 'Remove Europe')!;
  act(() => removeEurope.props.onPress());
  expect(onChange).toHaveBeenLastCalledWith([1]);
});

it('tags drop the tree dashes and fix broken accents', () => {
  const onChange = jest.fn();
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <ElementMultiSelect
            data={[
              {label: '--- Sarawak', value: 1},
              {label: 'PortuguÃªs', value: 2},
            ]}
            value={[1, 2]}
            onChange={onChange}
          />
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  expect(texts(root)).toEqual(expect.arrayContaining(['Sarawak', 'Português']));
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

it('single select rows are round radios, multi-select rows are square checkboxes', () => {
  const ElementDropdown = require('../app/shared/components/ElementDropdown').default;
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <ElementDropdown data={data} value={1} onChange={() => {}} />
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  act(() => root.root.findAllByType(Pressable)[0].props.onPress());
  const rows = root.root.findAllByType(Pressable).filter(p => p.props.accessibilityRole === 'radio');
  expect(rows).toHaveLength(2);
  expect(root.root.findAllByType(Pressable).some(p => p.props.accessibilityRole === 'checkbox')).toBe(false);
});
