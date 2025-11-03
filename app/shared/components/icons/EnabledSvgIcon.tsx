import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './EditSvgIcon';

export const EnabledSvgIcon: React.FC<IconProps> = ({ width = 14, height = 14, color = '#fff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    {/* Circle */}
    <Path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill={color} opacity={0.2} />
    {/* Check mark */}
    <Path d="M9.5 12.5l2 2 4-4" stroke={color} strokeWidth={2} fill="none" />
  </Svg>
);

export default EnabledSvgIcon;

