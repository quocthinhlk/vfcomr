import { ImageSourcePropType } from 'react-native';

export interface CommonMenuItem {
  label: string;
  icon?: ImageSourcePropType;
  routeName?: string;
  onPress?: () => void;
  children?: CommonMenuItem[];
  disabled?: boolean;
} 