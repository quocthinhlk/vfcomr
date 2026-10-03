import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Modal from 'react-native-modal';
import {Text} from '@ui-kitten/components';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Path} from 'react-native-svg';
import {useThemedColors, ThemeMode} from '../styles/theme';
import {useThemeMode} from '../context/ThemeContext';
import {useTranslation} from '../hooks/useTranslation';
import {COLORS} from '../constants/colors';
import {fs, ms, rs, ws} from '../utils/scale';

export type ActionIcon = 'view' | 'edit' | 'delete';

export type ActionItem = {
  label: string;
  onPress: () => void;
  type?: 'default' | 'danger';
  disabled?: boolean;
  /** Optional leading icon; also sets the button colour (view = blue, edit = green, delete = red). */
  icon?: ActionIcon;
};

type Props = {
  visible: boolean;
  title?: string;
  actions: ActionItem[];
  onRequestClose: () => void;
};

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const getTokens = (theme: ThemeMode) =>
  theme === 'light'
    ? {
        sheetBg: '#FFFFFF',
        pressedBg: '#F2F4F7',
        blueText: COLORS.mainColor,
        blueTint: 'rgba(36,120,206,0.10)',
        greenText: '#15803D',
        greenTint: '#DCFCE7',
        redText: COLORS.dangerColor,
        redTint: '#FDECEE',
        backdrop: 0.35,
      }
    : {
        sheetBg: '#151517',
        pressedBg: '#1C1C1E',
        blueText: '#6AA9EA',
        blueTint: 'rgba(106,169,234,0.16)',
        greenText: '#4ADE80',
        greenTint: 'rgba(74,222,128,0.14)',
        redText: '#FF6B78',
        redTint: 'rgba(255,107,120,0.14)',
        backdrop: 0.6,
      };

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const ICON_SIZE = ws(18);

const EyeIcon: React.FC<{color: string}> = ({color}) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
  </Svg>
);

const PencilIcon: React.FC<{color: string}> = ({color}) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon: React.FC<{color: string}> = ({color}) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ICONS: Record<ActionIcon, React.FC<{color: string}>> = {
  view: EyeIcon,
  edit: PencilIcon,
  delete: TrashIcon,
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
  const {theme} = useThemeMode();
  const T = getTokens(theme);
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();

  const colorsFor = (a: ActionItem) => {
    if (a.type === 'danger' || a.icon === 'delete') {
      return {text: T.redText, tint: T.redTint};
    }
    if (a.icon === 'edit') {
      return {text: T.greenText, tint: T.greenTint};
    }
    return {text: T.blueText, tint: T.blueTint};
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onRequestClose}
      onBackButtonPress={onRequestClose}
      onSwipeComplete={onRequestClose}
      swipeDirection="down"
      backdropOpacity={T.backdrop}
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
                    {borderColor: text, backgroundColor: tint},
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
