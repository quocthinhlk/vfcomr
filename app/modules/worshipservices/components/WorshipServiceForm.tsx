import React, {useRef} from 'react';
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
import {useKeepFocusedInputVisible} from '../../../shared/hooks/useKeepFocusedInputVisible';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import TimePicker from '../../../shared/components/TimePicker';
import {FormActions, FormField} from '../../../shared/components/crud';
import {
  WORSHIP_SERVICE_NAME_MAX,
  WorshipServiceErrors,
} from '../utils/worshipService.utils';

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
  errors: WorshipServiceErrors;
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
  errors,
  submitting,
  onSave,
  onCancel,
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  const scrollRef = useRef<ScrollView>(null);
  useKeepFocusedInputVisible(scrollRef);
  return (
    <KeyboardAvoidingView
      behavior="padding"
      // Android: the extra header height left a blank band above the keyboard.
      keyboardVerticalOffset={
        Platform.OS === 'ios' ? hs(64) : StatusBar.currentHeight || 0
      }
      style={styles.flex}>
      <ScrollView
        ref={scrollRef}
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
            error={errors.name}>
            <AppInput
              value={name}
              onChangeText={onNameChange}
              error={!!errors.name}
              maxLength={WORSHIP_SERVICE_NAME_MAX}
              returnKeyType="done"
              accessibilityLabel={`${t('name')}, ${t('required')}`}
            />
          </FormField>

          <FormField
            label={t('day') || 'Day'}
            required
            error={errors.dayName}>
            <ElementDropdown
              data={dayNameOptions}
              value={dayName as any}
              onChange={v => onDayNameChange(v as string)}
              placeholder={t('selectDay') || 'Select Day'}
              error={!!errors.dayName}
              containerStyle={
                {
                  backgroundColor: C.inputBg,
                  borderColor: errors.dayName ? '#db2d2d' : C.inputBorder,
                } as any
              }
            />
          </FormField>

          <FormField
            label={t('time') || 'Time'}
            required
            error={errors.time}>
            <TimePicker value={time} onChange={onTimeChange} error={!!errors.time} />
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
