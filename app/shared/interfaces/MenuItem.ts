import { ImageSourcePropType } from 'react-native';

export interface CommonMenuItem {
  label: string;
  icon?: ImageSourcePropType;
  routeName?: string;
  params?: Record<string, unknown>;
  onPress?: () => void;
  children?: CommonMenuItem[];
  disabled?: boolean;
} 