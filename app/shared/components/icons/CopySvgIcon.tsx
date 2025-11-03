import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import type { IconProps } from './EditSvgIcon';

export const CopySvgIcon: React.FC<IconProps> = ({ width = 14, height = 14, color = '#fff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="10" height="10" rx="2" stroke={color} strokeWidth="2" />
    <Rect x="5" y="5" width="10" height="10" rx="2" stroke={color} strokeWidth="2" opacity="0.6" />
  </Svg>
);

export default CopySvgIcon;

