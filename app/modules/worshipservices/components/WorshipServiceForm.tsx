import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, hs, ms} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import TimePicker from '../../../shared/components/TimePicker';
import {FormActions, FormField} from '../../../shared/components/crud';

type Props = {
  /** e.g. "Create Worship Service for {church}"; hidden when empty. */
  subtitle?: string;
  name: string;
  onNameChange: (v: string) => void;
  dayName: string | null;
  onDayNameChange: (v: string) => void;
  dayNameOptions: {label: string; value: string}[];
  time: string | null;
  onTimeChange: (v: string | null) => void;
  invalid: Record<string, boolean>;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

/** Shared body for Add / Edit Worship Service (keeps the keyboard-avoiding scroll). */
export const WorshipServiceForm: React.FC<Props> = ({
  subtitle,
  name,
  onNameChange,
  dayName,
  onDayNameChange,
  dayNameOptions,
  time,
  onTimeChange,
  invalid,
  submitting,
  onSave,
  onCancel,
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  const requiredMsg = t('required');
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={
        Platform.OS === 'ios' ? hs(64) : (StatusBar.currentHeight || 0) + hs(50)
      }
      style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {!!subtitle && (
          <Text style={[styles.subtitle, {color: C.textSecondary}]}>
            {subtitle}
          </Text>
        )}
        <View>
          <FormField
            label={t('name') || 'Name'}
            required
            error={invalid.name ? requiredMsg : undefined}>
            <AppInput
              value={name}
              onChangeText={onNameChange}
              error={!!invalid.name}
              accessibilityLabel={`${t('name')}, ${t('required')}`}
            />
          </FormField>

          <FormField
            label={t('day') || 'Day'}
            required
            error={invalid.dayName ? requiredMsg : undefined}>
            <ElementDropdown
              data={dayNameOptions}
              value={dayName as any}
              onChange={v => onDayNameChange(v as string)}
              error={!!invalid.dayName}
              containerStyle={
                {
                  backgroundColor: C.inputBg,
                  borderColor: invalid.dayName ? '#db2d2d' : C.inputBorder,
                } as any
              }
            />
          </FormField>

          <FormField
            label={t('time') || 'Time'}
            required
            error={invalid.time ? requiredMsg : undefined}>
            <TimePicker value={time} onChange={onTimeChange} error={!!invalid.time} />
          </FormField>

          <FormActions onCancel={onCancel} onSave={onSave} submitting={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(32),
  },
  subtitle: {
    fontSize: fs(13),
    fontWeight: '500',
    marginBottom: ms(16),
  },
});
