import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { fs, ws, hs, ms, rs } from '../utils/scale';

interface HamburgerMenuIconProps {
  onPress: () => void;
}

export const HamburgerMenuIcon: React.FC<HamburgerMenuIconProps> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuButton}>
    <View style={styles.menuButtonInner}>
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menuButton: {
    width: ws(35),
    height: ws(35),
    borderRadius: rs(20),
    backgroundColor: COLORS.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: ws(15),
    height: ws(1),
    backgroundColor: '#fff',
    borderRadius: rs(1),
    marginVertical: ws(2),
  },
});