import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { Text } from '@ui-kitten/components';
import { dashboardStyles } from '../styles';

interface DashboardStatCardProps {
  value: string;
  label: string;
  icon: ImageSourcePropType;
}

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({ value, label, icon }) => {
  return (
    <View style={dashboardStyles.statCard}>
      <Image source={icon} style={dashboardStyles.statIcon} />
      <View style={dashboardStyles.statTextContainer}>
        <Text category="h6" style={dashboardStyles.statValue}>{value}</Text>
        <Text category="s2" appearance="hint" style={dashboardStyles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}; 