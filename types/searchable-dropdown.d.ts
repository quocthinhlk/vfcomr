declare module 'react-native-searchable-dropdown' {
  import * as React from 'react';
  import { StyleProp, ViewStyle, TextStyle } from 'react-native';

  interface Item { id: number | string; name: string }

  interface Props {
    items: Item[];
    onItemSelect: (item: Item) => void;
    containerStyle?: StyleProp<ViewStyle>;
    itemsContainerStyle?: StyleProp<ViewStyle>;
    itemStyle?: StyleProp<ViewStyle>;
    itemTextStyle?: StyleProp<TextStyle>;
    textInputProps?: any;
    resetValue?: boolean;
    placeholder?: string;
  }

  export default class SearchableDropdown extends React.Component<Props> {}
} 