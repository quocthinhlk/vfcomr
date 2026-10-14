import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../styles/theme';
import {useThemeMode} from '../../context/ThemeContext';
import {useUiTokens} from '../../styles/uiTokens';
import {getListStyles} from '../../styles/list';
import {useTranslation} from '../../hooks/useTranslation';
import {COLORS} from '../../constants/colors';
import {fs, ms, rs, ws} from '../../utils/scale';
import AddNewHeaderButton from '../AddNewHeaderButton';
import {InboxIcon, MoreIcon, UiIconProps} from '../icons/UiIcons';

/* ------------------------------------------------------------------ */
/* ListToolbar: "{count} items" on the left, "+ Add New" on the right  */
/* ------------------------------------------------------------------ */

type ToolbarProps = {
  /** Text on the left, e.g. `${total} church networks`. Omit to show nothing. */
  countText?: string;
  /** Route for the Add New button. Omit to hide the button (e.g. no permission). */
  addRoute?: string;
  addParams?: Record<string, any>;
  addLabel?: string;
  /** Extra content rendered on the right, before the Add button. */
  right?: React.ReactNode;
};

export const ListToolbar: React.FC<ToolbarProps> = ({
  countText,
  addRoute,
  addParams,
  addLabel,
  right,
}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  return (
    <View style={styles.toolbar}>
      <Text
        style={[styles.countText, {color: C.textSecondary}]}
        accessibilityLiveRegion="polite">
        {countText ?? ''}
      </Text>
      <View style={styles.toolbarRight}>
        {right}
        {!!addRoute && (
          <AddNewHeaderButton
            name={addRoute}
            params={addParams}
            text={addLabel ?? t('addNew')}
            style={{
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: COLORS.mainColor,
            }}
            textStyle={{color: COLORS.mainColor}}
          />
        )}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* EntityListCard                                                      */
/* ------------------------------------------------------------------ */

type CardProps = {
  title: string;
  /** Secondary lines / badges under the title. */
  children?: React.ReactNode;
  /** Small trailing text, e.g. `#123`. */
  trailingText?: string;
  onPress?: () => void;
  /** Opens the action sheet. Omit to hide the ⋯ button (e.g. read-only users). */
  onMorePress?: () => void;
  titleLines?: number;
  accessibilityLabel?: string;
};

/**
 * Tap the card = primary action (usually View); ⋯ / long-press = action sheet.
 * Same layout as ChurchListCard: ⋯ floats top-right, `#id` sits bottom-right.
 */
export const EntityListCard = React.memo(function EntityListCard({
  title,
  children,
  trailingText,
  onPress,
  onMorePress,
  titleLines = 2,
  accessibilityLabel,
}: CardProps) {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onMorePress}
      delayLongPress={300}
      disabled={!onPress && !onMorePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        styles.card,
        {
          backgroundColor: C.surface,
          borderColor: C.surfaceBorder,
          shadowOpacity: T.shadowOpacity,
        },
      ]}>
      <View style={styles.cardBody}>
        <Text
          style={[
            styles.cardTitle,
            {color: C.textPrimary},
            !!onMorePress && styles.cardTitleWithMore,
          ]}
          numberOfLines={titleLines}>
          {title}
        </Text>
        {(!!children || !!trailingText) && (
          <View style={styles.cardBottom}>
            <View style={styles.cardChildren}>{children}</View>
            {!!trailingText && (
              <Text style={[styles.trailing, {color: C.textSecondary}]}>
                {trailingText}
              </Text>
            )}
          </View>
        )}
      </View>
      {!!onMorePress && (
        <TouchableOpacity
          onPress={onMorePress}
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel={`${t('moreActions')}: ${title}`}>
          <MoreIcon color={C.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

/** Secondary text line inside an EntityListCard. */
export const CardMeta: React.FC<{children: React.ReactNode; lines?: number}> = ({
  children,
  lines = 2,
}) => {
  const C = useThemedColors();
  return (
    <Text style={[styles.meta, {color: C.textSecondary}]} numberOfLines={lines}>
      {children}
    </Text>
  );
};

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

type EmptyProps = {
  title?: string;
  hint?: string;
  icon?: React.FC<UiIconProps>;
};

export const ListEmptyState: React.FC<EmptyProps> = ({
  title,
  hint,
  icon: Icon = InboxIcon,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, {backgroundColor: T.brandTint}]}>
        <Icon color={T.brandText} />
      </View>
      <Text style={[styles.emptyTitle, {color: C.textPrimary}]}>
        {title ?? t('noDataFound')}
      </Text>
      {!!hint && (
        <Text style={[styles.emptyHint, {color: C.textSecondary}]}>{hint}</Text>
      )}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Pagination bar (hidden when there is a single page)                 */
/* ------------------------------------------------------------------ */

type PageBarProps = {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export const ListPageBar: React.FC<PageBarProps> = ({
  page,
  totalPages,
  loading,
  onPageChange,
}) => {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  const items: Array<{label: string; page: number; active?: boolean; disabled?: boolean}> = [];
  items.push({label: '<<', page: 1, disabled: page === 1});
  for (let p = page - 2; p <= page - 1; p++) {
    if (p >= 1) {
      items.push({label: String(p), page: p});
    }
  }
  items.push({label: String(page), page, active: true});
  for (let p = page + 1; p <= page + 2; p++) {
    if (p <= totalPages) {
      items.push({label: String(p), page: p});
    }
  }
  items.push({label: '>>', page: totalPages, disabled: page === totalPages});

  return (
    <View style={styles.pageBar}>
      <Text style={[styles.pageInfo, {color: C.textSecondary}]}>
        {`${t('page')} ${page}/${totalPages}`}
      </Text>
      <View style={L.pageNumbersContainer as any}>
        {items.map(p => (
          <TouchableOpacity
            key={`${p.label}-${p.page}`}
            style={[
              L.pageNumber as any,
              p.active && (L.pageNumberActive as any),
              (p.disabled || loading) && (L.pageNumberDisabled as any),
            ]}
            onPress={() => onPageChange(p.page)}
            disabled={!!p.disabled || !!loading}
            accessibilityRole="button"
            accessibilityState={{selected: !!p.active, disabled: !!p.disabled}}>
            <Text
              style={[
                L.pageNumberText as any,
                p.active && (L.pageNumberTextActive as any),
              ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/** contentContainerStyle for list FlatLists so empty states can centre. */
export const listContentStyle = {
  paddingTop: ms(4),
  paddingBottom: ms(16),
  flexGrow: 1,
} as const;

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  countText: {
    marginTop: ms(6),
    fontSize: fs(13),
    fontWeight: '500',
    flexShrink: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    paddingVertical: ms(12),
    paddingHorizontal: ms(16),
    marginBottom: ms(10),
    borderRadius: rs(12),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  cardBody: {
    flex: 1,
    gap: ms(6),
  },
  cardTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    lineHeight: fs(20),
  },
  meta: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  // Children on the left, #id pinned to the bottom-right.
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: ms(8),
  },
  cardChildren: {
    flex: 1,
    minWidth: 0,
    gap: ms(6),
  },
  trailing: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  // Keeps the title clear of the floating ⋯ button.
  cardTitleWithMore: {
    paddingRight: 32,
  },
  // Floats over the card's top-right corner; content keeps its full width.
  moreBtn: {
    position: 'absolute',
    top: ms(2),
    right: ms(2),
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  empty: {
    alignItems: 'center',
    paddingTop: ms(48),
    paddingHorizontal: ms(24),
  },
  emptyIcon: {
    width: ws(64),
    height: ws(64),
    borderRadius: ws(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(14),
  },
  emptyTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: ms(6),
    fontSize: fs(13),
    textAlign: 'center',
    lineHeight: fs(19),
  },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: ms(10),
  },
  pageInfo: {
    fontSize: fs(12),
  },
});
