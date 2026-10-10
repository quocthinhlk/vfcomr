import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {ChevronRightIcon} from '../../../shared/components/icons/UiIcons';
import {SelectionSheet} from '../../../shared/components/SelectionSheet';
import {fs, ms, ws} from '../../../shared/utils/scale';
import type {AdminOverseerSummary} from '../services/adminDashboard.service';

const subtitleOf = (o: AdminOverseerSummary) =>
  [o.profile.role_name, o.profile.title].filter(Boolean).join(' · ');

type Props = {
  overseers: AdminOverseerSummary[];
  selected: AdminOverseerSummary;
  onSelect: (id: number) => void;
};

/**
 * Compact overseer picker for the Admin dashboard: "Overseer · n" with the
 * selected name as a borderless dropdown on the right and the full role · title
 * underneath. Tapping the name slides up the shared SelectionSheet listing
 * every overseer with their avatar.
 */
export const OverseerSwitcher: React.FC<Props> = ({overseers, selected, onSelect}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);

  const canSwitch = overseers.length > 1;
  const subtitle = subtitleOf(selected);
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
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
          {t('overseer') || 'Overseer'}
          <Text style={[styles.count, {color: C.textSecondary}]}>{`  ·  ${overseers.length}`}</Text>
        </Text>

        <Pressable
          onPress={canSwitch ? () => setOpen(true) : undefined}
          disabled={!canSwitch}
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          accessibilityRole={canSwitch ? 'button' : 'text'}
          accessibilityLabel={`${t('overseer')}: ${selected.profile.name}`}
          accessibilityHint={canSwitch ? t('selectOverseer') : undefined}
          accessibilityState={canSwitch ? {expanded: open} : undefined}
          style={({pressed}) => [
            styles.pill,
            (pressed || open) && canSwitch && {backgroundColor: T.brandTint},
          ]}>
          <Text
            style={[styles.pillText, {color: canSwitch ? T.brandText : C.textPrimary}]}
            numberOfLines={1}>
            {selected.profile.name}
          </Text>
          {canSwitch ? (
            <View style={styles.chevronDown}>
              <ChevronRightIcon color={T.brandText} size={ws(12)} />
            </View>
          ) : null}
        </Pressable>
      </View>

      {subtitle ? (
        // Full role · title, wrapping onto as many lines as it needs.
        <Text style={[styles.subtitle, {color: C.textSecondary}]} accessibilityLiveRegion="polite">
          {subtitle}
        </Text>
      ) : null}

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
  // Sits right under the header (the list container already pads the top).
  wrap: {
    marginTop: ms(2),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
  },
  title: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  count: {
    fontSize: fs(13),
    fontWeight: '500',
  },
  // Borderless: brand-coloured text + chevron mark it as a dropdown.
  pill: {
    flexShrink: 1,
    maxWidth: '62%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingLeft: ms(10),
    paddingRight: ms(8),
    borderRadius: 16,
  },
  pillText: {
    fontSize: fs(13),
    fontWeight: '600',
    flexShrink: 1,
  },
  chevronDown: {
    transform: [{rotate: '90deg'}],
  },
  subtitle: {
    marginTop: ms(2),
    fontSize: fs(12),
    lineHeight: fs(17),
  },
});

export default OverseerSwitcher;
