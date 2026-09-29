import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms} from '../../../shared/utils/scale';

type Props = {
  title: string;
  pastorName?: string;
  regionNation?: string;
  reportDate?: string;
  reportingPeriod?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function MetaLine({label, value}: {label: string; value: string}) {
  const C = useThemedColors();
  return (
    <View style={styles.line}>
      <Text style={[styles.label, {color: C.textSecondary}]}>{`${label}: `}</Text>
      <Text style={[styles.value, {color: C.textPrimary}]}>{value}</Text>
    </View>
  );
}

export function OverseerChartTitleBlock({
  title,
  pastorName,
  regionNation,
  reportDate,
  reportingPeriod,
  action,
  style,
}: Props) {
  const C = useThemedColors();
  const {t} = useTranslation();

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, {color: C.textPrimary}]} numberOfLines={2}>
          {title}
        </Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <MetaLine
        label={t('forPastor') || 'For Pastor'}
        value={pastorName || '-'}
      />
      <MetaLine
        label={t('regionNation') || 'Region / Nation'}
        value={regionNation || '-'}
      />
      <MetaLine
        label={t('reportDate') || 'Report Date'}
        value={reportDate || '-'}
      />
      <MetaLine
        label={t('reportingPeriod') || 'Reporting Period'}
        value={reportingPeriod || '-'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: ms(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '700',
    lineHeight: fs(20),
    marginRight: ms(8),
  },
  action: {
    flexShrink: 0,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: ms(3),
  },
  label: {
    fontSize: fs(13),
    lineHeight: fs(18),
    fontWeight: '400',
  },
  value: {
    flexShrink: 1,
    fontSize: fs(13),
    lineHeight: fs(18),
    fontWeight: '600',
  },
});
