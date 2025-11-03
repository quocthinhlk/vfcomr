import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type IconProps = { width?: number; height?: number; color?: string };

export const EditSvgIcon: React.FC<IconProps> = ({ width = 14, height = 14, color = '#fff' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17.25V21h3.75L17.81 9.94a1.5 1.5 0 0 0 0-2.12l-2.63-2.63a1.5 1.5 0 0 0-2.12 0L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill={color} />
  </Svg>
);

export default EditSvgIcon; 