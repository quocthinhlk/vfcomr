import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../styles/theme';
import {useUiTokens} from '../../styles/uiTokens';
import {useTranslation} from '../../hooks/useTranslation';
import {fs, ms, ws} from '../../utils/scale';
import {CancelButton, DeleteButton} from '../ActionButtons';
import {AlertIcon} from '../icons/UiIcons';

type Props = {
  /** Name of the record being deleted (shown in bold). */
  name?: string;
  /** Heading; defaults to t('deleteConfirmTitle'). */
  title?: string;
  /** Message containing `{name}`; defaults to t('deleteConfirmMessage'). */
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  disabled?: boolean;
  confirmLabel?: string;
  /** Inline error shown above the buttons (e.g. API rejected the delete). */
  errorMessage?: string;
};

/** Destructive confirmation body: warning icon, name, "cannot be undone", Cancel / Delete. */
export const DeleteConfirmView: React.FC<Props> = ({
  name,
  title,
  message,
  onCancel,
  onConfirm,
  submitting = false,
  disabled = false,
  confirmLabel,
  errorMessage,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const template = message ?? t('deleteConfirmMessage');
  const [before, after = ''] = template.includes('{name}')
    ? template.split('{name}')
    : [template, ''];

  return (
    <View style={styles.content}>
      <View style={[styles.iconWrap, {backgroundColor: T.dangerTint}]}>
        <AlertIcon color={T.dangerText} />
      </View>
      <Text style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
        {title ?? t('deleteConfirmTitle')}
      </Text>
      <Text style={[styles.message, {color: C.textSecondary}]}>
        {before}
        {template.includes('{name}') && (
          <Text style={[styles.name, {color: C.textPrimary}]}>{name || '…'}</Text>
        )}
        {after}
      </Text>

      {!!errorMessage && (
        <View
          style={[styles.errorBox, {backgroundColor: T.dangerTint}]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <Text style={[styles.errorText, {color: T.dangerText}]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Cancel first (safe default), Delete on the trailing side. */}
      <View style={styles.buttons}>
        <CancelButton label={t('cancel')} onPress={onCancel} disabled={submitting} />
        <DeleteButton
          label={submitting ? t('deleting') : confirmLabel ?? t('delete')}
          onPress={onConfirm}
          disabled={submitting || disabled}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    marginTop: ms(24),
    alignItems: 'center',
  },
  iconWrap: {
    width: ws(56),
    height: ws(56),
    borderRadius: ws(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(14),
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: ms(8),
    fontSize: fs(14),
    lineHeight: fs(21),
    textAlign: 'center',
  },
  name: {
    fontWeight: '700',
  },
  errorBox: {
    marginTop: ms(16),
    alignSelf: 'stretch',
    borderRadius: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
  },
  errorText: {
    fontSize: fs(13),
    lineHeight: fs(18),
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(24),
    alignSelf: 'stretch',
  },
});
