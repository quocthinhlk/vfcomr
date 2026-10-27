import React from 'react';
import {ViewStyle} from 'react-native';
import ElementDropdown, {type ElementDropdownItem} from './ElementDropdown';

interface Props {
  data: ElementDropdownItem[];
  /** Selected values (numbers or strings, matching `data[].value`). */
  value: Array<string | number>;
  onChange: (value: Array<string | number>) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Multi-value counterpart of ElementDropdown: the same field (labels, ⌵ / ×)
 * and the same bottom sheet with search and checkboxes; rows toggle and the
 * sheet stays open until Done.
 */
const ElementMultiSelect: React.FC<Props> = ({
  data,
  value,
  onChange,
  placeholder = 'Select options',
  error = false,
  disabled = false,
  containerStyle,
  accessibilityLabel,
}) => (
  <ElementDropdown
    multiple
    data={data}
    value={null}
    onChange={() => {}}
    values={value}
    onChangeValues={onChange}
    placeholder={placeholder}
    error={error}
    disabled={disabled}
    containerStyle={containerStyle}
    accessibilityLabel={accessibilityLabel}
  />
);

export default ElementMultiSelect;
