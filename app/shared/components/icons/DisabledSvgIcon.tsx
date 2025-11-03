import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './EditSvgIcon';

export const DisabledSvgIcon: React.FC<IconProps> = ({ width = 14, height = 14, color = '#fff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    {/* Circle */}
    <Path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill={color} opacity={0.2} />
    {/* Diagonal slash */}
    <Path d="M5.636 4.222L19.778 18.364l-1.414 1.414L4.222 5.636 5.636 4.222z" fill={color} />
  </Svg>
);

export default DisabledSvgIcon;

