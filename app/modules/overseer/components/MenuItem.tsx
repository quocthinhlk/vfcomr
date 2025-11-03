import React from 'react';
import { TouchableOpacity, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Text } from '@ui-kitten/components';
import { icons } from '../config/overseer.constants';

interface MenuItemProps {
  label: string;
  onPress?: () => void;
  icon: ImageSourcePropType; // Add icon prop
}

export const MenuItem: React.FC<MenuItemProps> = ({ label, onPress, icon }) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Image source={icon} style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
    resizeMode: 'contain',
  },
  menuLabel: {
    fontSize: 16,
    color: '#1976d2',
  },
}); 