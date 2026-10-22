import React, {useMemo, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {ChevronRightIcon} from '../../../shared/components/icons/UiIcons';
import {SelectionSheet} from '../../../shared/components/SelectionSheet';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import type {AdminOverseerSummary} from '../services/adminDashboard.service';

const blankAvatar = require('../../../assets/icons/avatar_blank.png');

const subtitleOf = (o: AdminOverseerSummary) =>
  [o.profile.title, o.profile.role_name].filter(Boolean).join(' · ');

type Props = {
  overseers: AdminOverseerSummary[];
  selected: AdminOverseerSummary;
  onSelect: (id: number) => void;
};

/**
 * Top of the Admin dashboard's overseer block: an "Overseer · n" label, then the
 * selected overseer as a light outlined field (avatar, name, one-line title and
 * a round ⌄ button) so it reads as tappable, and a one-line hint that the
 * figures underneath belong to this overseer. Tapping opens the SelectionSheet.
 */
export const OverseerSwitcher: React.FC<Props> = ({overseers, selected, onSelect}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState<number | null>(null);

  const canSwitch = overseers.length > 1;
  const subtitle = subtitleOf(selected);
  const photo = String(selected.profile.photo_url ?? '').trim();
  const showPhoto = !!photo && photoFailed !== selected.profile.id;
  const items = useMemo(
    () =>
      overseers.map(o => ({
        key: o.profile.id,
        title: o.profile.name,
        subtitle: subtitleOf(o),
        imageUrl: o.profile.photo_url,
      })),
    [overseers],
  );

  return (
    <View>
      <Text style={[styles.label, {color: C.textSecondary}]} accessibilityRole="header">
        {(t('overseer') || 'Overseer').toUpperCase()}
        {canSwitch ? `  ·  ${overseers.length}` : ''}
      </Text>

      <Pressable
        onPress={canSwitch ? () => setOpen(true) : undefined}
        disabled={!canSwitch}
        accessibilityRole={canSwitch ? 'button' : 'text'}
        accessibilityLabel={`${t('overseer')}: ${selected.profile.name}${subtitle ? `, ${subtitle}` : ''}`}
        accessibilityHint={canSwitch ? t('selectOverseer') : undefined}
        accessibilityState={canSwitch ? {expanded: open} : undefined}
        style={({pressed}) => [
          styles.field,
          {
            backgroundColor: pressed && canSwitch ? T.pressedBg : 'transparent',
            borderColor: open ? T.brandText : C.border,
          },
        ]}>
        <Image
          source={showPhoto ? {uri: photo} : blankAvatar}
          onError={() => setPhotoFailed(selected.profile.id)}
          style={styles.avatar}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.fieldText}>
          <Text style={[styles.name, {color: C.textPrimary}]} numberOfLines={1}>
            {selected.profile.name}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, {color: C.textSecondary}]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {canSwitch ? (
          <View style={[styles.chevronButton, {backgroundColor: T.brandTint}]}>
            <View style={styles.chevronDown}>
              <ChevronRightIcon color={T.brandText} size={ws(12)} />
            </View>
          </View>
        ) : null}
      </Pressable>

      <Text style={[styles.hint, {color: C.textSecondary}]} accessibilityLiveRegion="polite">
        {t('overseerFiguresHint')}
      </Text>

      <SelectionSheet
        visible={open}
        title={t('selectOverseer')}
        items={items}
        selectedKey={selected.profile.id}
        onSelect={key => onSelect(Number(key))}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: fs(11),
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: ms(6),
  },
  // Light outline + round ⌄ button say "tap to pick" without a heavy box.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    minHeight: 52,
    paddingVertical: ms(8),
    paddingLeft: ms(10),
    paddingRight: ms(8),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: rs(12),
  },
  avatar: {
    width: ws(32),
    height: ws(32),
    borderRadius: ws(16),
  },
  fieldText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  subtitle: {
    marginTop: ms(1),
    fontSize: fs(12),
    lineHeight: fs(16),
  },
  chevronButton: {
    width: ws(28),
    height: ws(28),
    borderRadius: ws(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronDown: {
    transform: [{rotate: '90deg'}],
  },
  hint: {
    marginTop: ms(6),
    fontSize: fs(12),
    lineHeight: fs(16),
  },
});

export default OverseerSwitcher;
