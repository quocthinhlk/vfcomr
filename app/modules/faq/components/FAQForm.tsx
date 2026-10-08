import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import AppInput from '../../../shared/components/AppInput';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {DeleteSvgIcon} from '../../../shared/components/icons';
import {FormActions, FormField} from '../../../shared/components/crud';
import {FAQRichTextEditor} from './FAQRichTextEditor';
import {isAnswerEmpty} from '../utils/faqHtml';

/**
 * Keyboard-avoiding scroll body for FAQ forms (the answer is a tall multiline
 * input, so the previous KeyboardAvoidingView behaviour is kept).
 */
export const FAQFormScroll: React.FC<{children: React.ReactNode}> = ({
  children,
}) => (
  <KeyboardAvoidingView
    behavior="padding"
    keyboardVerticalOffset={
      Platform.OS === 'ios' ? hs(64) : (StatusBar.currentHeight || 0) + hs(50)
    }
    style={styles.flex}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
);

/** Required fields left empty on Save (shown in red under each field). */
export type FAQFormInvalid = {
  questionHeader?: boolean;
  answer?: boolean;
  languageId?: boolean;
};

/** Same rules for Add and Edit: question, answer and language are required. */
export const validateFAQForm = (values: {
  questionHeader: string;
  answer: string;
  languageId: number | null;
}): FAQFormInvalid => ({
  questionHeader: !values.questionHeader.trim(),
  answer: isAnswerEmpty(values.answer),
  languageId: !values.languageId,
});

export const hasFAQFormErrors = (invalid: FAQFormInvalid) =>
  Object.values(invalid).some(Boolean);

type Props = {
  questionHeader: string;
  onQuestionHeaderChange: (v: string) => void;
  /** Answer HTML. The rich editor reads it once on mount (load before rendering). */
  answer: string;
  onAnswerChange: (v: string) => void;
  languageId: number | null;
  onLanguageChange: (v: number) => void;
  languageOptions: {label: string; value: number}[];
  tags: string[];
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
  onTagChange: (index: number, value: string) => void;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  invalid?: FAQFormInvalid;
  /** Called when the user edits a field, so its error can be cleared. */
  onClearInvalid?: (field: keyof FAQFormInvalid) => void;
};

export const FAQForm: React.FC<Props> = ({
  questionHeader,
  onQuestionHeaderChange,
  answer,
  onAnswerChange,
  languageId,
  onLanguageChange,
  languageOptions,
  tags,
  onAddTag,
  onRemoveTag,
  onTagChange,
  submitting,
  onSave,
  onCancel,
  invalid = {},
  onClearInvalid,
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  const requiredError = (field: keyof FAQFormInvalid) =>
    invalid[field] ? t('required') : undefined;
  return (
    <View>
      <FormField
        label={t('question') || 'Question'}
        required
        error={requiredError('questionHeader')}>
        <AppInput
          value={questionHeader}
          onChangeText={value => {
            onQuestionHeaderChange(value);
            onClearInvalid?.('questionHeader');
          }}
          placeholder={t('question') || 'Question'}
          error={!!invalid.questionHeader}
          accessibilityLabel={`${t('question')}, ${t('required')}`}
        />
      </FormField>

      <FormField
        label={t('answer') || 'Answer'}
        required
        error={requiredError('answer')}>
        <FAQRichTextEditor
          initialHtml={answer}
          onChange={html => {
            onAnswerChange(html);
            if (!isAnswerEmpty(html)) {
              onClearInvalid?.('answer');
            }
          }}
          placeholder={t('answer') || 'Answer'}
          error={!!invalid.answer}
          accessibilityLabel={`${t('answer')}, ${t('required')}`}
        />
      </FormField>

      <FormField
        label={t('language') || 'Language'}
        required
        error={requiredError('languageId')}>
        <ElementDropdown
          data={languageOptions}
          value={languageId as any}
          onChange={v => {
            onLanguageChange(v as number);
            if (v != null) {
              onClearInvalid?.('languageId');
            }
          }}
          placeholder={t('selectOption') || 'Select Language'}
          error={!!invalid.languageId}
          containerStyle={
            {
              backgroundColor: C.inputBg,
              // Leave the border to ElementDropdown when showing the error.
              ...(invalid.languageId ? null : {borderColor: C.inputBorder}),
            } as any
          }
        />
      </FormField>

      <FormField label={t('tags') || 'Tags'}>
        {tags.map((tag, index) => (
          <View key={index} style={styles.tagRow}>
            <View style={styles.flex}>
              <AppInput
                value={tag}
                onChangeText={value => onTagChange(index, value)}
                placeholder={`${t('tag') || 'Tag'} ${index + 1}`}
              />
            </View>
            {tags.length > 1 && (
              <TouchableOpacity
                onPress={() => onRemoveTag(index)}
                accessibilityRole="button"
                accessibilityLabel={`${t('delete')} ${t('tag')} ${index + 1}`}
                style={[styles.removeTagButton, {backgroundColor: C.border}]}>
                <DeleteSvgIcon width={fs(16)} height={fs(16)} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity
          onPress={onAddTag}
          accessibilityRole="button"
          style={styles.addTagButton}>
          <Text style={[styles.addTagText, {color: COLORS.mainColor}]}>
            + {t('add') || 'Add'} {t('tag') || 'Tag'}
          </Text>
        </TouchableOpacity>
      </FormField>

      <FormActions onCancel={onCancel} onSave={onSave} submitting={submitting} />
    </View>
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
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(8),
    gap: ms(8),
  },
  removeTagButton: {
    width: ws(36),
    height: ws(36),
    borderRadius: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButton: {
    alignSelf: 'flex-start',
    paddingVertical: ms(6),
  },
  addTagText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
});
