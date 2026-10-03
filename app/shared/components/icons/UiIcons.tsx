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
