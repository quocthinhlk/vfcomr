import React from 'react';
import {Platform, StyleSheet, Switch, View} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../styles/theme';
import {useUiTokens} from '../../styles/uiTokens';
import {useTranslation} from '../../hooks/useTranslation';
import {COLORS} from '../../constants/colors';
import {fs, ms} from '../../utils/scale';
import {CancelButton, SaveButton} from '../ActionButtons';

/* ------------------------------------------------------------------ */
/* FormField: label (+ required *) / input / helper or error           */
/* ------------------------------------------------------------------ */

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
};

export const FormField: React.FC<FieldProps> = ({
  label,
  required,
  error,
  helper,
  children,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, {color: C.textPrimary}]}>
        {label}
        {required && <Text style={{color: T.dangerText}}> *</Text>}
      </Text>
      {children}
      {error ? (
        <Text
          style={[styles.subText, {color: T.dangerText}]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          {error}
        </Text>
      ) : helper ? (
        <Text style={[styles.subText, {color: C.textSecondary}]}>{helper}</Text>
      ) : null}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* FormSwitchRow                                                       */
/* ------------------------------------------------------------------ */

type SwitchProps = {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  /** Content under the label, e.g. a StatusBadge reflecting the value. */
  description?: React.ReactNode;
};

export const FormSwitchRow: React.FC<SwitchProps> = ({
  label,
  value,
  onValueChange,
  disabled,
  description,
}) => {
  const C = useThemedColors();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text
          style={[
            styles.label,
            {color: C.textPrimary},
            description ? styles.labelWithDesc : styles.labelNoDesc,
          ]}>
          {label}
        </Text>
        {typeof description === 'string' ? (
          <Text style={[styles.subText, styles.subTextFlush, {color: C.textSecondary}]}>
            {description}
          </Text>
        ) : (
          description
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor={COLORS.white}
        trackColor={{false: C.border, true: COLORS.mainColor}}
        accessibilityLabel={label}
        style={styles.switch}
      />
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* FormDivider / FormActions                                           */
/* ------------------------------------------------------------------ */

export const FormDivider: React.FC = () => {
  const C = useThemedColors();
  return <View style={[styles.divider, {backgroundColor: C.surfaceBorder}]} />;
};

type ActionsProps = {
  onCancel: () => void;
  onSave: () => void;
  submitting?: boolean;
  /** Disable Save without the "Saving..." label (e.g. invalid form). */
  saveDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
};

/** Cancel (left) / Save (right), equal width. */
export const FormActions: React.FC<ActionsProps> = ({
  onCancel,
  onSave,
  submitting = false,
  saveDisabled = false,
  saveLabel,
  cancelLabel,
}) => {
  const {t} = useTranslation();
  return (
    <View style={styles.actions}>
      <CancelButton
        label={cancelLabel ?? t('cancel')}
        onPress={onCancel}
        disabled={submitting}
      />
      <SaveButton
        label={submitting ? t('saving') : saveLabel ?? t('save')}
        onPress={onSave}
        disabled={submitting || saveDisabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: ms(16),
  },
  label: {
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: ms(8),
  },
  subText: {
    fontSize: fs(12),
    marginTop: ms(6),
  },
  subTextFlush: {
    marginTop: 0,
  },
  labelWithDesc: {
    marginBottom: ms(6),
  },
  labelNoDesc: {
    marginBottom: 0,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    marginBottom: ms(16),
  },
  switchText: {
    flex: 1,
  },
  // Newer iOS switches render wider than the frame RN measures, so the
  // track overflows to the right; reserve that space to keep it on-screen.
  switch: {
    marginRight: Platform.OS === 'ios' ? 12 : 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: ms(16),
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(8),
  },
});
