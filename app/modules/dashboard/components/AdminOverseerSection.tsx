import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {dashboardIcons} from '../../../shared/config/dashboard.constants';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {dashboardStyles} from '../styles';
import {DashboardStatCard} from './DashboardStatCard';
import {buildOverseerStatItems} from '../utils/overseerStats';
import type {AdminOverseerSummary} from '../services/adminDashboard.service';

const COLLAPSED_COUNT = 4;

/**
 * Indicators of the overseer chosen in OverseerSwitcher (profile is shown there).
 * Same cards and "View more" toggle as the other dashboards.
 */
export const AdminOverseerSection: React.FC<{overseer: AdminOverseerSummary}> = ({
  overseer,
}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(
    () => buildOverseerStatItems(overseer.indicators, t),
    [overseer.indicators, t],
  );

  return (
    <View style={styles.section}>
      <View style={dashboardStyles.statCardContainer}>
        {(expanded ? stats : stats.slice(0, COLLAPSED_COUNT)).map((stat, index) => (
          <DashboardStatCard key={index} {...stat} />
        ))}
      </View>

      <TouchableOpacity
        onPress={() => setExpanded(prev => !prev)}
        style={dashboardStyles.viewMoreButton}
        accessibilityRole="button"
        accessibilityState={{expanded}}>
        <Text
          style={[
            dashboardStyles.viewMoreText,
            {color: C.textSecondary, fontSize: fs(12)},
          ]}>
          {expanded ? `${t('viewLess')} ` : `${t('viewMore')} `}
          <Image
            source={dashboardIcons.iconDown}
            style={[styles.chevron, expanded && styles.chevronUp]}
          />
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/** Placeholder with the final layout while overseers load (no layout jump). */
export const AdminOverseerSkeleton: React.FC = () => {
  const C = useThemedColors();
  const block = {backgroundColor: C.border};
  return (
    <View accessibilityLabel="Loading" accessible>
      {/* Matches OverseerSwitcher: "Overseer · n" + small pill, then a subtitle line. */}
      <View style={styles.skelHeader}>
        <View style={[styles.skelTitle, block]} />
        <View style={[styles.skelChip, block]} />
      </View>
      <View style={[styles.skelSubtitle, block]} />
      <View style={[styles.grid, styles.section]}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.skelTile, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
            <View style={[styles.skelDot, block]} />
            <View style={styles.skelText}>
              <View style={[styles.skelLineWide, block]} />
              <View style={[styles.skelLine, block]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: ms(4),
  },
  chevron: {
    width: ws(12),
    height: ws(12),
    marginLeft: ms(4),
  },
  chevronUp: {
    transform: [{rotate: '180deg'}],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: ms(4),
  },
  skelHeader: {
    marginTop: ms(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skelTitle: {
    width: ws(90),
    height: 16,
    borderRadius: 6,
  },
  skelChip: {
    width: ws(140),
    height: 32,
    borderRadius: 16,
  },
  skelSubtitle: {
    marginTop: ms(8),
    width: '70%',
    height: 12,
    borderRadius: 6,
  },
  // Same footprint as DashboardStatCard (icon left, value + label right).
  skelTile: {
    width: '48.5%',
    paddingVertical: ms(8),
    paddingHorizontal: ms(10),
    borderRadius: rs(6),
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    minHeight: ms(56),
  },
  skelDot: {
    width: ws(26),
    height: ws(26),
    borderRadius: ws(6),
  },
  skelText: {
    flex: 1,
    gap: ms(6),
  },
  skelLineWide: {
    width: '50%',
    height: 14,
    borderRadius: 6,
  },
  skelLine: {
    width: '85%',
    height: 12,
    borderRadius: 6,
  },
});

export default AdminOverseerSection;
