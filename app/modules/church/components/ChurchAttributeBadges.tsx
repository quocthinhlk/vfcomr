import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, ms, rs} from '../../../shared/utils/scale';
import {getChurchMscFlags} from '../utils/churchListOrder';

export interface ChurchBadgeSource {
  is_mother_church?: boolean;
  is_msc?: boolean;
  is_first_msc?: boolean;
  omr_map_location?: string | null;
  omr_map_url?: string | null;
}

type ChurchAttributeBadgesProps = {
  church: ChurchBadgeSource;
  style?: object;
};

export const churchAttributeBadgeStyles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ms(4),
  },
  badge: {
    paddingVertical: ms(1),
    paddingHorizontal: ms(6),
    borderRadius: rs(3),
    borderWidth: 1,
  },
  badgeMother: {backgroundColor: '#DEEAD4', borderColor: '#BCD4A7'},
  badgeMsc: {backgroundColor: '#F1E0D1', borderColor: '#E3BE9D'},
  badgeMap: {backgroundColor: '#DDE5F4', borderColor: '#B8C9E8'},
  badgeTextMother: {color: '#6EA43D', fontSize: fs(11), fontWeight: '500'},
  badgeTextMsc: {color: '#B65C16', fontSize: fs(11), fontWeight: '500'},
  badgeTextMap: {color: '#3E68B5', fontSize: fs(11), fontWeight: '500'},
});

export const ChurchAttributeBadges: React.FC<ChurchAttributeBadgesProps> = ({
  church,
  style,
}) => {
  const {t} = useTranslation();
  const flags = getChurchMscFlags(church);
  const isMother = !!church.is_mother_church;
  const isFirstMsc = flags.is_first_msc;
  const isMsc = flags.is_msc;
  const isOnMap = !!(church.omr_map_location || church.omr_map_url);

  if (!isMother && !isFirstMsc && !isMsc && !isOnMap) {
    return null;
  }

  const s = churchAttributeBadgeStyles;

  return (
    <View style={[s.badgeRow, style]}>
      {isMother && (
        <View style={[s.badge, s.badgeMother]}>
          <Text style={s.badgeTextMother}>{t('mother') || 'Mother'}</Text>
        </View>
      )}
      {isFirstMsc && (
        <View style={[s.badge, s.badgeMsc]}>
          <Text style={s.badgeTextMsc}>{t('firstMsc') || 'First MSC'}</Text>
        </View>
      )}
      {isMsc && (
        <View style={[s.badge, s.badgeMsc]}>
          <Text style={s.badgeTextMsc}>{t('msc') || 'MSC'}</Text>
        </View>
      )}
      {isOnMap && (
        <View style={[s.badge, s.badgeMap]}>
          <Text style={s.badgeTextMap}>On Map</Text>
        </View>
      )}
    </View>
  );
};
