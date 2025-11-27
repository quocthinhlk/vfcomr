import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { Text } from '@ui-kitten/components';
import { dashboardStyles } from '../styles';

interface DashboardStatCardProps {
  value: string;
  label: string;
  icon: ImageSourcePropType;
  /**
   * Optional secondary value, e.g. USD amount.
   * Rendered smaller and tucked to the corner to avoid clutter.
   */
  secondaryValue?: string;
}

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  value,
  label,
  icon,
  secondaryValue,
}) => {
  return (
    <View style={dashboardStyles.statCard}>
      <Image source={icon} style={dashboardStyles.statIcon} />
      <View style={dashboardStyles.statTextContainer}>
        <Text category="h6" style={dashboardStyles.statValue}>
          {value}
        </Text>
        {secondaryValue ? (
          <Text
            category="c1"
            appearance="hint"
            style={dashboardStyles.statSecondaryValue}
          >
            {secondaryValue}
          </Text>
        ) : null}
        <Text category="s2" appearance="hint" style={dashboardStyles.statLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
};