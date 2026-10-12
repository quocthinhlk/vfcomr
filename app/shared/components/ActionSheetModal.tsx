import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Modal from 'react-native-modal';
import {Text} from '@ui-kitten/components';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemedColors} from '../styles/theme';
import {useUiTokens} from '../styles/uiTokens';
import {useTranslation} from '../hooks/useTranslation';
import {fs, ms, rs, ws} from '../utils/scale';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  TrashIcon,
  UiIconProps,
} from './icons/UiIcons';

export type ActionIcon =
  | 'view'
  | 'edit'
  | 'delete'
  | 'moveUp'
  | 'moveDown'
  | 'password'
  | 'email'
  | 'copy';

export type ActionItem = {
  label: string;
  onPress: () => void;
  type?: 'default' | 'danger';
  disabled?: boolean;
  /** Optional leading icon. Buttons are brand blue; delete/danger is red. */
  icon?: ActionIcon;
};

type Props = {
  visible: boolean;
  title?: string;
  actions: ActionItem[];
  onRequestClose: () => void;
};

const ICONS: Record<ActionIcon, React.FC<UiIconProps>> = {
  view: EyeIcon,
  edit: PencilIcon,
  delete: TrashIcon,
  moveUp: ArrowUpIcon,
  moveDown: ArrowDownIcon,
  password: LockIcon,
  email: MailIcon,
  copy: CopyIcon,
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ActionSheetModal({
  visible,
  title,
  actions,
  onRequestClose,
}: Props) {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();

  // App palette: brand blue for every action, red only for destructive ones.
  // Soft tinted fill, no coloured outline; tokens cover light and dark mode.
  const colorsFor = (a: ActionItem) =>
    a.type === 'danger' || a.icon === 'delete'
      ? {text: T.dangerText, tint: T.dangerTint}
      : {text: T.brandText, tint: T.brandTint};

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onRequestClose}
      onBackButtonPress={onRequestClose}
      onSwipeComplete={onRequestClose}
      swipeDirection="down"
      backdropOpacity={T.backdropOpacity}
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      statusBarTranslucent
      style={styles.modal}>
      <View
        style={[
          styles.container,
          {paddingBottom: Math.max(insets.bottom, ms(12))},
        ]}>
        <View style={[styles.sheet, {backgroundColor: T.sheetBg}]}>
          <View style={[styles.handle, {backgroundColor: C.border}]} />

          {!!title && (
            <Text
              style={[styles.title, {color: C.textPrimary}]}
              numberOfLines={2}
              accessibilityRole="header">
              {title}
            </Text>
          )}

          <View style={[styles.buttons, !title && styles.buttonsNoTitle]}>
            {actions.map((a, idx) => {
              const {text, tint} = colorsFor(a);
              const Icon = a.icon ? ICONS[a.icon] : null;
              return (
                <Pressable
                  key={`${a.label}-${idx}`}
                  onPress={() => {
                    if (!a.disabled) {
                      a.onPress();
                    }
                  }}
                  disabled={!!a.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  accessibilityState={{disabled: !!a.disabled}}
                  style={({pressed}) => [
                    styles.button,
                    {borderColor: 'transparent', backgroundColor: tint},
                    pressed && styles.buttonPressed,
                    a.disabled && styles.buttonDisabled,
                  ]}>
                  {Icon && <Icon color={text} />}
                  <Text style={[styles.buttonLabel, {color: text}]}>
                    {a.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={onRequestClose}
          accessibilityRole="button"
          style={({pressed}) => [
            styles.cancel,
            {backgroundColor: pressed ? T.pressedBg : T.sheetBg},
          ]}>
          <Text style={[styles.cancelText, {color: C.textPrimary}]}>
            {t('cancel')}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    paddingHorizontal: ms(10),
    gap: ms(8),
  },
  sheet: {
    borderRadius: rs(20),
    paddingBottom: ms(6),
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: ws(36),
    height: 4,
    borderRadius: 2,
    marginTop: ms(8),
  },
  title: {
    fontSize: fs(16),
    fontWeight: '700',
    lineHeight: fs(22),
    textAlign: 'center',
    paddingHorizontal: ms(20),
    paddingTop: ms(12),
    paddingBottom: ms(16),
  },
  buttons: {
    paddingHorizontal: ms(16),
    paddingBottom: ms(10),
    gap: ms(10),
  },
  buttonsNoTitle: {
    paddingTop: ms(16),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    minHeight: 48,
    borderWidth: 1,
    borderRadius: rs(12),
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  cancel: {
    minHeight: 52,
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: fs(15),
    fontWeight: '700',
  },
});
