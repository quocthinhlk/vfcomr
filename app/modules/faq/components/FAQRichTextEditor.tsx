import React, {useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {RichEditor, RichToolbar, actions} from 'react-native-pell-rich-editor';
import {useThemedColors} from '../../../shared/styles/theme';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {fs, hs, rs} from '../../../shared/utils/scale';
import {fromEditorHtml, toEditorHtml} from '../utils/faqHtml';

type Props = {
  /** Stored answer HTML; read once when the editor mounts. */
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: boolean;
  accessibilityLabel?: string;
};

// Formatting the web FAQ editor also produces; no image upload or raw HTML.
const TOOLBAR_ACTIONS = [
  actions.setBold,
  actions.setItalic,
  actions.setUnderline,
  actions.insertBulletsList,
  actions.insertOrderedList,
  actions.removeFormat,
  actions.undo,
  actions.redo,
];

/**
 * Rich text field for the FAQ answer: edits the HTML in place, so lists,
 * emphasis and existing `/uploads/...` screenshots survive a save.
 */
export const FAQRichTextEditor: React.FC<Props> = ({
  initialHtml,
  onChange,
  placeholder,
  error = false,
  accessibilityLabel,
}) => {
  const C = useThemedColors();
  const T = useUiTokens();
  const editorRef = useRef<RichEditor>(null);
  // Only the first value matters: RichEditor owns the content after mount.
  const initialContent = useRef(toEditorHtml(initialHtml)).current;

  const editorStyle = useMemo(
    () => ({
      backgroundColor: C.inputBg,
      color: C.inputText,
      caretColor: C.inputText,
      placeholderColor: C.textSecondary,
      contentCSSText: `font-size: ${fs(15)}px; line-height: 1.45; min-height: ${hs(160)}px;`,
      cssText: 'img { max-width: 100%; height: auto; }',
    }),
    [C.inputBg, C.inputText, C.textSecondary],
  );

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {borderColor: error ? T.dangerText : C.inputBorder, backgroundColor: C.inputBg},
      ]}>
      <RichToolbar
        editor={editorRef}
        actions={TOOLBAR_ACTIONS}
        iconTint={C.textSecondary}
        selectedIconTint={C.textPrimary}
        style={[styles.toolbar, {backgroundColor: C.inputBg, borderBottomColor: C.inputBorder}]}
      />
      <RichEditor
        ref={editorRef}
        initialContentHTML={initialContent}
        onChange={html => onChange(fromEditorHtml(html))}
        placeholder={placeholder}
        editorStyle={editorStyle}
        initialHeight={hs(180)}
        useContainer
        pasteAsPlainText
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: rs(3),
    overflow: 'hidden',
  },
  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default FAQRichTextEditor;
