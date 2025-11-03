import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './EditSvgIcon';

export const DeleteSvgIcon: React.FC<IconProps> = ({ width = 14, height = 14, color = '#fff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H4V4h4l1-1z" fill={color} />
  </Svg>
);

export default DeleteSvgIcon; 