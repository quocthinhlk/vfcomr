import React, {useEffect, useState} from 'react';
import {Image, Pressable, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {getListStyles} from '../../../shared/styles/list';
import {MoreIcon} from '../../../shared/components/icons/UiIcons';
import {fs, ms} from '../../../shared/utils/scale';
import type {ChurchListItem} from '../services/church.service';
import {ChurchAttributeBadges} from './ChurchAttributeBadges';

const DEFAULT_CHURCH_LIST_PHOTO = require('../../../assets/images/group-user.jpg');

/** Church photo, or the default group picture when there is none / it fails. */
const ChurchThumb: React.FC<{item: ChurchListItem; listStyles: ReturnType<typeof getListStyles>}> = ({
  item,
  listStyles,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = String(item.photo_url ?? '').trim();

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const useRemote = uri.length > 0 && !imageFailed;

  return (
    <View style={listStyles.avatarWrap as any}>
      <View style={listStyles.avatarPhotoWrap as any}>
        <Image
          source={useRemote ? {uri} : DEFAULT_CHURCH_LIST_PHOTO}
          style={listStyles.avatarPhoto as any}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      </View>
    </View>
  );
};

type Props = {
  item: ChurchListItem;
  onPress: () => void;
  /** Opens the row's action sheet (also on long-press). */
  onMorePress: () => void;
  /** Spoken label for the "…" button, e.g. "Name: Detail, Edit". */
  moreAccessibilityLabel?: string;
};

/**
 * The church row used by Churches, Disabled Churches and Clone Church:
 * photo, name, city/country, pastor, attribute badges with #id on the right,
 * and a floating "…" for the row's actions.
 */
export const ChurchListCard: React.FC<Props> = ({
  item,
  onPress,
  onMorePress,
  moreAccessibilityLabel,
}) => {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const listStyles = getListStyles(C, theme);
  const name = item.name || '';
  const metaParts = [item.city, item.country_name].filter(Boolean);

  return (
    <Pressable
      style={({pressed}) => [listStyles.itemCard as any, pressed && {opacity: 0.75}]}
      onPress={onPress}
      onLongPress={onMorePress}
      delayLongPress={280}
      android_ripple={{color: C.inputBorder, borderless: false}}>
      <View style={listStyles.itemRow as any}>
        <ChurchThumb item={item} listStyles={listStyles} />

        <View style={styles.itemCol}>
          {/* Right padding keeps the name clear of the floating "…" button. */}
          <Text style={[styles.name, styles.nameWithMore, {color: C.textPrimary}]} numberOfLines={2}>
            {name}
          </Text>
          {metaParts.length > 0 && (
            <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={1}>
              {metaParts.join(', ')}
            </Text>
          )}
          {!!item.pastor_name && (
            <Text style={[styles.pastor, {color: C.textSecondary}]} numberOfLines={1}>
              {item.pastor_name}
            </Text>
          )}
          <View style={styles.badgeIdRow}>
            <ChurchAttributeBadges
              church={{
                is_mother_church: item.is_mother_church,
                is_msc: (item as any)?.is_msc,
                is_first_msc: (item as any)?.is_first_msc,
                omr_map_location: (item as any)?.omr_map_location,
                omr_map_url: (item as any)?.omr_map_url,
              }}
              style={styles.badgeRowFlex}
            />
            <Text style={[styles.churchId, {color: C.textSecondary}]}>#{item.id}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onMorePress}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel={moreAccessibilityLabel || name}>
          <MoreIcon color={C.textSecondary} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  itemCol: {flex: 1},
  name: {fontSize: fs(13.5), fontWeight: '600', marginBottom: ms(2)},
  nameWithMore: {paddingRight: 32},
  meta: {fontSize: fs(12), marginBottom: ms(1)},
  pastor: {fontSize: fs(12), marginBottom: ms(4)},
  badgeIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(1),
  },
  badgeRowFlex: {flex: 1},
  churchId: {
    fontSize: fs(11),
    fontWeight: '500',
    marginLeft: 'auto',
  },
  // Floats over the card's top-right corner; content keeps its full width.
  moreButton: {
    position: 'absolute',
    top: -ms(8),
    right: -ms(8),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChurchListCard;
