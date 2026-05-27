import React from 'react';
import { View, Image, ImageSourcePropType, Platform, StyleSheet } from 'react-native';
import { Text } from '@ui-kitten/components';
import { COLORS } from '../../../shared/constants/colors';
import HelpIcon from '../../../shared/components/HelpIcon';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import { fs, ms, ws, hs, rs } from '../../../shared/utils/scale';

interface DashboardStatCardProps {
  value: string;
  label: string;
  icon: ImageSourcePropType;
  helpTitle?: string;
  helpMessage?: string;
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
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';

  const match = label.match(/^(.*?)\s*\[([^\]]*)\]\s*$/);
  const mainLabel = (match?.[1] ?? label).trim();
  const helpText = (match?.[2] ?? '').trim();

  const resolvedHelpTitle = helpTitle || mainLabel;
  const resolvedHelpMessage = (helpMessage ?? helpText).trim();

  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: C.surface,
          borderColor: C.inputBorder,
          shadowColor: '#000',
          shadowOpacity: Platform.OS === 'ios' ? (isDark ? 0 : 0.08) : 0,
          shadowRadius: rs(7),
          shadowOffset: { width: 0, height: hs(2) },
          elevation: isDark ? 0 : 2,
        },
      ]}
    >
      <View style={cardStyles.iconWrap}>
        <Image
          source={icon}
          style={[cardStyles.icon, { tintColor: COLORS.mainColor }]}
          resizeMode="contain"
        />
      </View>
      <View style={cardStyles.textBlock}>
        <Text style={[cardStyles.value, { color: COLORS.mainColor }]}>
          {value}
        </Text>
        {secondaryValue ? (
          <Text style={[cardStyles.secondary, { color: C.textSecondary }]}>
            {secondaryValue}
          </Text>
        ) : null}
        <View style={cardStyles.labelRow}>
          <Text style={[cardStyles.label, { color: C.textSecondary }]}>
            {mainLabel}
          </Text>
          {resolvedHelpMessage ? (
            <HelpIcon
              title={resolvedHelpTitle}
              message={resolvedHelpMessage}
              size={13}
              color={C.textSecondary}
              marginLeft={1}
              offsetY={0}
              hitSlopSize={12}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    width: '48.5%',
    marginBottom: ms(4),
    paddingVertical: ms(8),
    paddingHorizontal: ms(10),
    borderRadius: rs(6),
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: ws(30),
    height: ws(30),
    borderRadius: rs(8),
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(8),
    flexShrink: 0,
  },
  icon: {
    width: ws(23),
    height: ws(23),
  },
  textBlock: {
    flex: 1,
  },
  value: {
    fontWeight: '700',
    fontSize: fs(16),
    lineHeight: fs(20),
  },
  secondary: {
    fontSize: fs(10),
    marginTop: ms(0.5),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(0.5),
  },
  label: {
    fontSize: fs(12),
    fontWeight: '500',
    flex: 1,
    lineHeight: fs(14),
  },
});
