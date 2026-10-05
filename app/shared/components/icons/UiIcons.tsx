import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {ws} from '../../utils/scale';

/** Outline icon family (24 grid, 2px stroke) used by the shared CRUD UI. */
export type UiIconProps = {size?: number; color: string};

const SM = ws(14);
const MD = ws(18);
const LG = ws(28);

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const LockIcon: React.FC<UiIconProps> = ({size = SM, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={11} width={16} height={10} rx={2} {...stroke(color)} />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...stroke(color)} />
  </Svg>
);

export const UnlockIcon: React.FC<UiIconProps> = ({size = SM, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={11} width={16} height={10} rx={2} {...stroke(color)} />
    <Path d="M8 11V7a4 4 0 0 1 7.9-.9" {...stroke(color)} />
  </Svg>
);

export const MoreIcon: React.FC<UiIconProps> = ({size = MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Circle cx={5} cy={12} r={2} />
    <Circle cx={12} cy={12} r={2} />
    <Circle cx={19} cy={12} r={2} />
  </Svg>
);

export const ChevronRightIcon: React.FC<UiIconProps> = ({size = MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" {...stroke(color)} />
  </Svg>
);

export const EyeIcon: React.FC<UiIconProps> = ({size = MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" {...stroke(color)} />
    <Circle cx={12} cy={12} r={3} {...stroke(color)} />
  </Svg>
);

export const PencilIcon: React.FC<UiIconProps> = ({size = MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" {...stroke(color)} />
  </Svg>
);

export const TrashIcon: React.FC<UiIconProps> = ({size = MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
      {...stroke(color)}
    />
  </Svg>
);

export const AlertIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l9.5 17h-19L12 3z" {...stroke(color)} />
    <Path d="M12 10v4" {...stroke(color)} />
    <Circle cx={12} cy={17} r={1.2} fill={color} />
  </Svg>
);

export const InboxIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" {...stroke(color)} />
    <Path d="M3 13h5l1 3h6l1-3h5" {...stroke(color)} />
  </Svg>
);

export const NetworkIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={5} r={2.5} {...stroke(color)} />
    <Circle cx={5} cy={19} r={2.5} {...stroke(color)} />
    <Circle cx={19} cy={19} r={2.5} {...stroke(color)} />
    <Path d="M12 7.5v5M12 12.5L6.5 17M12 12.5l5.5 4.5" {...stroke(color)} />
  </Svg>
);

export const WifiOffIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 2l20 20" {...stroke(color)} />
    <Path d="M8.5 16.4a5 5 0 0 1 7 0" {...stroke(color)} />
    <Path d="M5 12.9a10 10 0 0 1 5.2-2.7M14 10.3a10 10 0 0 1 5 2.6" {...stroke(color)} />
    <Path d="M1.5 9.3a15 15 0 0 1 4.3-2.8M10.7 5a15 15 0 0 1 11.8 4.3" {...stroke(color)} />
    <Circle cx={12} cy={20} r={1.2} fill={color} />
  </Svg>
);

export const ServerIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={4} width={18} height={7} rx={2} {...stroke(color)} />
    <Rect x={3} y={13} width={18} height={7} rx={2} {...stroke(color)} />
    <Circle cx={7} cy={7.5} r={1} fill={color} />
    <Circle cx={7} cy={16.5} r={1} fill={color} />
  </Svg>
);

export const ClockIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} {...stroke(color)} />
    <Path d="M12 7v5l3 2" {...stroke(color)} />
  </Svg>
);

export const RefreshIcon: React.FC<UiIconProps> = ({size = MD, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" {...stroke(color)} />
    <Path d="M4 3v5h5" {...stroke(color)} />
    <Path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" {...stroke(color)} />
    <Path d="M20 21v-5h-5" {...stroke(color)} />
  </Svg>
);

export const ChurchIcon: React.FC<UiIconProps> = ({size = LG, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2v4M10 4h4" {...stroke(color)} />
    <Path d="M12 6l-6 5v10h12V11l-6-5z" {...stroke(color)} />
    <Path d="M3 21h18M10 21v-4a2 2 0 0 1 4 0v4" {...stroke(color)} />
  </Svg>
);
