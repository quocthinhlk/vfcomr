import React, {useMemo, useRef, useState} from 'react';
import {Keyboard} from 'react-native';
import {RichEditor, RichToolbar} from 'react-native-pell-rich-editor';
import {useKeepFocusedInputVisible} from '../../../shared/hooks/useKeepFocusedInputVisible';
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
import {TrashIcon} from '../../../shared/components/icons/UiIcons';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {FormActions, FormField} from '../../../shared/components/crud';
import {
  DockedToolbarContext,
  FAQRichTextEditor,
  TOOLBAR_ACTIONS,
} from './FAQRichTextEditor';
import {isAnswerEmpty} from '../utils/faqHtml';

/**
 * Keyboard-avoiding scroll body for FAQ forms (the answer is a tall multiline
 * input, so the previous KeyboardAvoidingView behaviour is kept).
 */
export const FAQFormScroll: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const C = useThemedColors();
  const [docked, setDocked] = useState<React.RefObject<RichEditor | null> | null>(null);
  const dock = useMemo(() => ({setDockedEditor: setDocked, dockedEditor: docked}), [docked]);
  // Hide the docked toolbar with the keyboard too (Android Back closes the
  // keyboard without blurring the editor).
  React.useEffect(() => {
    const hide = Keyboard.addListener('keyboardDidHide', () => setDocked(null));
    return () => hide.remove();
  }, []);
  return (
    <DockedToolbarContext.Provider value={dock}>
      <KeyboardAvoidingView
        behavior="padding"
        // Android: the keyboard's screenY counts from the top of the screen
        // but the layout from below the status bar, so the padding fell short
        // by the status bar and the docked toolbar sat under the keyboard.
        // (The old status bar + 50 left a blank band.)
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? hs(64) : StatusBar.currentHeight ?? 0
        }
        style={styles.flex}>
        <FAQFormScrollView>{children}</FAQFormScrollView>
        {docked ? (
          <RichToolbar
            editor={docked}
            actions={TOOLBAR_ACTIONS}
            iconTint={C.textSecondary}
            selectedIconTint={C.textPrimary}
            style={[styles.dockedToolbar, {backgroundColor: C.surface, borderTopColor: C.inputBorder}]}
          />
        ) : null}
      </KeyboardAvoidingView>
    </DockedToolbarContext.Provider>
  );
};

/** Lets the form scroll to a field (the first invalid one on Save). */
const FormScrollContext = React.createContext<((y: number) => void) | null>(null);

const FAQFormScrollView: React.FC<{children: React.ReactNode}> = ({children}) => {
  const scrollRef = useRef<ScrollView>(null);
  // Android 15+ (edge-to-edge): keep the focused tag / question above the keyboard.
  useKeepFocusedInputVisible(scrollRef);
  const scrollTo = useMemo(
    () => (y: number) => scrollRef.current?.scrollTo({y: Math.max(0, y - ms(12)), animated: true}),
    [],
  );
  return (
    <FormScrollContext.Provider value={scrollTo}>
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      {children}
    </ScrollView>
    </FormScrollContext.Provider>
  );
};

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
  /** Bumped by the screen on each Save that found errors: scroll to the first. */
  saveAttempt?: number;
  /** The API's own message for a field (shown instead of "Required"). */
  serverErrors?: Partial<Record<keyof FAQFormInvalid, string>>;
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
  serverErrors = {},
  saveAttempt = 0,
  onClearInvalid,
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  const T = useUiTokens();
  // Save with a required field empty: scroll to the first one (the question
  // is at the top, off screen when Save is pressed).
  const scrollTo = React.useContext(FormScrollContext);
  const fieldY = useRef<Partial<Record<keyof FAQFormInvalid, number>>>({});
  const trackY = (field: keyof FAQFormInvalid) => (e: any) => {
    fieldY.current[field] = e.nativeEvent.layout.y;
  };
  const firstInvalid = (['questionHeader', 'answer', 'languageId'] as const).find(
    f => invalid[f] || serverErrors[f],
  );
  // Only after a Save (not while the user fixes a field).
  React.useEffect(() => {
    if (saveAttempt && firstInvalid && scrollTo) {
      scrollTo(fieldY.current[firstInvalid] ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveAttempt]);

  const requiredError = (field: keyof FAQFormInvalid) =>
    serverErrors[field] || (invalid[field] ? t('required') : undefined);
  return (
    <View>
      <View onLayout={trackY('questionHeader')} />
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
          multiline
          // One-line text on the API side: Enter is not a new line.
          blurOnSubmit
          returnKeyType="done"
          maxLength={500}
          style={styles.questionInput}
          accessibilityLabel={`${t('question')}, ${t('required')}`}
        />
      </FormField>

      <View onLayout={trackY('answer')} />
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

      <View onLayout={trackY('languageId')} />
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
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
                // Same outline trash as the app's other Delete actions (was a
                // filled white icon on a grey tile).
                style={[styles.removeTagButton, {backgroundColor: T.dangerTint}]}>
                <TrashIcon color={T.dangerText} size={ms(18)} />
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
  dockedToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  questionInput: {
    // AppInput is one line high: a long question showed only its end on
    // Android ("…w do I enter visits…").
    height: undefined,
    minHeight: hs(44),
    maxHeight: hs(120),
    paddingTop: ms(10),
    paddingBottom: ms(10),
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
