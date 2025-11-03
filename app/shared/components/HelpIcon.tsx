import React from 'react';
import { TouchableOpacity, View, Text, ViewStyle } from 'react-native';
import { COLORS } from '../../shared/constants/colors';

type Props = {
  onPress: () => void;
  size?: number;
  color?: string;
  marginLeft?: number;
  offsetY?: number;
  backgroundColor?: string;
  containerStyle?: ViewStyle;
};

export default function HelpIcon({
  onPress,
  size = 16,
  color = COLORS.mainColor,
  marginLeft = 4,
  offsetY = 0,
  backgroundColor = 'rgba(53,99,233,0.12)',
  containerStyle,
}: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={[{ marginLeft, transform: [{ translateY: offsetY }] }, containerStyle]}> 
      <View style={{ width: size, height: size, borderRadius: size, borderWidth: 1, borderColor: color, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontWeight: '700', fontSize: Math.max(10, Math.round(size * 0.55)) }}>?</Text>
      </View>
    </TouchableOpacity>
  );
}


