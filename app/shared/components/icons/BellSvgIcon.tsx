import React from 'react';
import Svg, {Path} from 'react-native-svg';
import type {IconProps} from './EditSvgIcon';

export const BellSvgIcon: React.FC<IconProps> = ({
  width = 16,
  height = 16,
  color = '#1F6FEB',
}) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3a4 4 0 0 0-4 4c0 .7-.14 1.27-.4 1.81-.26.55-.62 1.03-1.1 1.7-.6.86-.9 1.3-1.05 1.86A3 3 0 0 0 5.5 15h13a3 3 0 0 0-.95-2.63c-.15-.56-.45-1-1.05-1.86-.48-.67-.84-1.15-1.1-1.7A4.3 4.3 0 0 1 16 7a4 4 0 0 0-4-4Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 18a2 2 0 0 0 4 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default BellSvgIcon;

