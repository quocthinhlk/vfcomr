import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../styles/theme';
import {useUiTokens} from '../../styles/uiTokens';
import {useTranslation} from '../../hooks/useTranslation';
import {COLORS} from '../../constants/colors';
import {FORM_INPUT_HEIGHT} from '../../styles/form';
import {fs, ms, rs, ws} from '../../utils/scale';
import {PencilIcon, TrashIcon} from '../icons/UiIcons';

/* ------------------------------------------------------------------ */
/* DetailCard: one card with an optional title, rows separated by      */
/* hairlines. Pass DetailRow children.                                 */
/* ------------------------------------------------------------------ */

type CardProps = {
  title?: string;
  children?: React.ReactNode;
};

export const DetailCard: React.FC<CardProps> = ({title, children}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: C.surface,
          borderColor: C.surfaceBorder,
          shadowOpacity: T.shadowOpacity,
        },
      ]}>
      {!!title && (
        <Text
          style={[styles.title, {color: C.textPrimary}]}
          accessibilityRole="header">
          {title}
        </Text>
      )}
      {rows.map((row, idx) => (
        <React.Fragment key={idx}>
          {(idx > 0 || !!title) && (
            <View style={[styles.divider, {backgroundColor: C.surfaceBorder}]} />
          )}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
};

type RowProps = {
  label: string;
  /** Plain text value; use children for custom content (badge, colour swatch). */
  value?: string | number | null;
  children?: React.ReactNode;
  /** Stack label above value (long text such as descriptions). */
  stacked?: boolean;
};

export const DetailRow: React.FC<RowProps> = ({label, value, children, stacked}) => {
  const C = useThemedColors();
  const content =
    children ??
    (
      <Text
        style={[
          styles.value,
          {color: C.textPrimary},
          stacked && styles.valueStacked,
        ]}>
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </Text>
    );
  return (
    <View style={stacked ? styles.rowStacked : styles.row}>
      <Text style={[styles.label, {color: C.textSecondary}]}>{label}</Text>
      {content}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* DetailActions: Edit (left) / Delete (right), 50% each              */
/* ------------------------------------------------------------------ */

type ActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  /** Used for the Delete button's accessibility label. */
  itemName?: string;
};

export const DetailActions: React.FC<ActionsProps> = ({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  itemName,
}) => {
  const {t} = useTranslation();
  if (!onEdit && !onDelete) {
    return null;
  }
  return (
    <View style={styles.actions}>
      {!!onEdit && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionBtn, {backgroundColor: COLORS.mainColor}]}
          onPress={onEdit}
          accessibilityRole="button">
          <PencilIcon color={COLORS.white} size={ws(16)} />
          <Text style={styles.actionText}>{editLabel ?? t('edit')}</Text>
        </TouchableOpacity>
      )}
      {!!onDelete && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionBtn, {backgroundColor: COLORS.dangerColor}]}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`${deleteLabel ?? t('delete')}${itemName ? ` ${itemName}` : ''}`}>
          <TrashIcon color={COLORS.white} size={ws(16)} />
          <Text style={styles.actionText}>{deleteLabel ?? t('delete')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: ms(12),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    minHeight: ws(28),
  },
  rowStacked: {
    gap: ms(6),
  },
  label: {
    fontSize: fs(13),
    flexShrink: 1,
  },
  value: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '600',
    textAlign: 'right',
  },
  valueStacked: {
    flex: 0,
    textAlign: 'left',
    fontWeight: '500',
    lineHeight: fs(20),
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(20),
  },
  actionBtn: {
    flex: 1,
    height: Math.max(FORM_INPUT_HEIGHT, 44),
    borderRadius: rs(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
  },
  actionText: {
    color: COLORS.white,
    fontSize: fs(14),
    fontWeight: '600',
  },
});
