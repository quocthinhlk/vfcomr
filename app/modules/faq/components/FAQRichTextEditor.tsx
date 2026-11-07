import React, {createContext, useContext, useMemo, useRef} from 'react';
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
export const TOOLBAR_ACTIONS = [
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
 * While the answer is being typed, the form shows a second toolbar right above
 * the keyboard: on a long answer the editor's own toolbar had scrolled off
 * screen, so formatting meant closing the keyboard and scrolling back up.
 */
export const DockedToolbarContext = createContext<{
  setDockedEditor: (editor: React.RefObject<RichEditor | null> | null) => void;
  dockedEditor: React.RefObject<RichEditor | null> | null;
} | null>(null);

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
  const dock = useContext(DockedToolbarContext);
  const docked = dock?.dockedEditor === editorRef;
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
        // While the copy above the keyboard shows, this one is hidden (its
        // space kept, so the text does not jump): two toolbars looked doubled.
        pointerEvents={docked ? 'none' : 'auto'}
        actions={TOOLBAR_ACTIONS}
        iconTint={C.textSecondary}
        selectedIconTint={C.textPrimary}
        style={[
          styles.toolbar,
          {backgroundColor: C.inputBg, borderBottomColor: C.inputBorder},
          docked && styles.hidden,
        ]}
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
        onFocus={() => dock?.setDockedEditor(editorRef)}
        onBlur={() => dock?.setDockedEditor(null)}
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
  hidden: {
    opacity: 0,
  },
});

export default FAQRichTextEditor;
