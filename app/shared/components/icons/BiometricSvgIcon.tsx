import React from 'react';
import Svg, {Circle, Ellipse, Path} from 'react-native-svg';
import type {IconProps} from './EditSvgIcon';
import type {BiometryKind} from '../../services/biometrics.service';

/** Face ID–style face outline (iOS). */
function FaceIdIcon({width = 22, height = 22, color = '#000'}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3H6a3 3 0 0 0-3 3v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M16 3h2a3 3 0 0 1 3 3v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M8 21H6a3 3 0 0 1-3-3v-2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M16 21h2a3 3 0 0 0 3-3v-2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={9} cy={10} r={1.1} fill={color} />
      <Circle cx={15} cy={10} r={1.1} fill={color} />
      <Path
        d="M9.5 15.5c.8.8 1.7 1.2 2.5 1.2s1.7-.4 2.5-1.2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Touch ID / Fingerprint ridges. */
function FingerprintIcon({width = 22, height = 22, color = '#000'}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11a3 3 0 0 1 3 3v1.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 7a7 7 0 0 1 7 7v1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 7a7 7 0 0 0-7 7v3.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 3a11 11 0 0 1 11 11v1.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M5.5 16.5V14A6.5 6.5 0 0 1 12 7.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 14v4.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Ellipse cx={12} cy={12} rx={1} ry={1} fill={color} />
    </Svg>
  );
}

type BiometricIconProps = IconProps & {
  biometryType: BiometryKind | null;
};

/** Platform-aware biometric glyph for Face ID / Touch ID / Fingerprint. */
export const BiometricSvgIcon: React.FC<BiometricIconProps> = ({
  biometryType,
  width = 22,
  height = 22,
  color = '#000',
}) => {
  if (biometryType === 'FaceID') {
    return <FaceIdIcon width={width} height={height} color={color} />;
  }
  return <FingerprintIcon width={width} height={height} color={color} />;
};

export default BiometricSvgIcon;
