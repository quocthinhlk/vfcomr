import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { Text } from '@ui-kitten/components';
import { dashboardStyles } from '../styles';
import HelpIcon from '../../../shared/components/HelpIcon';
import { useThemedColors } from '../../../shared/styles/theme';
import { fs } from '../../../shared/utils/scale';

interface DashboardStatCardProps {
  value: string;
  label: string;
  icon: ImageSourcePropType;
  helpTitle?: string;
  helpMessage?: string;
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
  helpTitle,
  helpMessage,
}) => {
  const C = useThemedColors();
  const match = label.match(/^(.*?)\s*\[([^\]]*)\]\s*$/);
  const mainLabel = (match?.[1] ?? label).trim();
  const helpText = (match?.[2] ?? '').trim();

  const resolvedHelpTitle = helpTitle || mainLabel;
  const resolvedHelpMessage = (helpMessage ?? helpText).trim();

  return (
    <View style={dashboardStyles.statCard}>
      <Image source={icon} style={dashboardStyles.statIcon} />
      <View style={dashboardStyles.statTextContainer}>
        <Text category="h6" style={[dashboardStyles.statValue, { fontSize: fs(18) }]}>
          {value}
        </Text>
        {secondaryValue ? (
          <Text
            category="c1"
            style={[dashboardStyles.statSecondaryValue, { color: C.textPrimary }]}
          >
            {secondaryValue}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            category="s2"
            style={[dashboardStyles.statLabel, { flexShrink: 1, color: C.textPrimary }]}
          >
            {mainLabel}
          </Text>
          {resolvedHelpMessage ? (
            <HelpIcon
              title={resolvedHelpTitle}
              message={resolvedHelpMessage}
              size={12}
              color={C.textSecondary}
              backgroundColor="transparent"
              marginLeft={6}
              offsetY={0}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};