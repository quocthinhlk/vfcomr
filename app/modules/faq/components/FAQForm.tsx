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

type Props = {
  questionHeader: string;
  onQuestionHeaderChange: (v: string) => void;
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
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  return (
    <View>
      <FormField label={t('question') || 'Question'} required>
        <AppInput
          value={questionHeader}
          onChangeText={onQuestionHeaderChange}
          placeholder={t('question') || 'Question'}
        />
      </FormField>

      <FormField label={t('answer') || 'Answer'} required>
        <AppInput
          value={answer}
          onChangeText={onAnswerChange}
          placeholder={t('answer') || 'Answer (HTML supported)'}
          multiline
          style={styles.answerInput}
        />
      </FormField>

      <FormField label={t('language') || 'Language'} required>
        <ElementDropdown
          data={languageOptions}
          value={languageId as any}
          onChange={v => {
            onLanguageChange(v as number);
          }}
          placeholder={t('selectOption') || 'Select Language'}
          containerStyle={
            {
              backgroundColor: C.inputBg,
              borderColor: C.inputBorder,
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
  answerInput: {
    height: undefined,
    minHeight: hs(140),
    textAlignVertical: 'top',
    paddingTop: ms(8),
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
