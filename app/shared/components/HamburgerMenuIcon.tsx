import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 15,
    height: 1,
    backgroundColor: '#fff',
    borderRadius: 1,
    marginVertical: 2,
  },
});