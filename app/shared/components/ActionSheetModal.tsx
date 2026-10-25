import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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
  UserCheckIcon,
} from './icons/UiIcons';

export type ActionIcon =
  | 'view'
  | 'edit'
  | 'delete'
  | 'moveUp'
  | 'moveDown'
  | 'password'
  | 'email'
  | 'copy'
  | 'assign';

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
  assign: UserCheckIcon,
};

/**
 * Full-screen layer inside the Modal. Reads the insets of the Modal's own
 * window (via the SafeAreaProvider around it), not the app screen's, so the
 * sheet clears the navigation bar on every device and never floats too high.
 */
function SheetBody({children}: {children: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.modal, {paddingBottom: Math.max(insets.bottom, ms(12))}]}>
      {children}
    </View>
  );
}

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

  // React Native's own Modal + Animated, not react-native-modal: with
  // hideModalContentWhileAnimating (and a JS-driven content animation) the
  // sheet stayed hidden on some Android phones (new architecture), showing
  // only the backdrop or nothing at all.
  //
  // Android robustness rules (each one fixed a "sheet invisible / screen
  // frozen" report on some phones but not others):
  // 1. JS-driven animations (useNativeDriver: false). With the native driver
  //    the animation was started before the Modal's Dialog had mounted its
  //    content; on Fabric the native animated node could then never attach,
  //    leaving the sheet parked off-screen at translateY = screen height while
  //    the invisible Modal still swallowed every touch. Whether it happened
  //    depended on device speed, hence "only some phones".
  // 2. The open animation starts from the Modal's onShow (the Dialog really
  //    exists), with a timer fallback in case onShow never fires.
  // 3. The close callback only unmounts when the animation actually finished;
  //    an interrupted close (quick re-open) used to unmount a visible sheet.
  const offscreen = Dimensions.get('screen').height;
  const slide = useRef(new Animated.Value(offscreen)).current;
  const fade = useRef(new Animated.Value(0)).current;
  // Stay mounted while the close animation runs.
  const [mounted, setMounted] = useState(visible);
  const onCloseRef = useRef(onRequestClose);
  onCloseRef.current = onRequestClose;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const openedRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallback = () => {
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
  };

  const runOpen = () => {
    clearFallback();
    if (!visibleRef.current || openedRef.current) {
      return;
    }
    openedRef.current = true;
    slide.stopAnimation();
    fade.stopAnimation();
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fade, {toValue: 1, duration: 200, useNativeDriver: false}),
    ]).start(({finished}) => {
      // Never leave the sheet half-way if the animation got cut short.
      if (!finished && visibleRef.current) {
        slide.setValue(0);
        fade.setValue(1);
      }
    });
  };

  useEffect(() => {
    if (visible) {
      openedRef.current = false;
      slide.stopAnimation();
      fade.stopAnimation();
      if (!mounted) {
        slide.setValue(offscreen);
        fade.setValue(0);
        setMounted(true);
        // onShow normally starts the animation; this covers devices where it
        // does not fire.
        clearFallback();
        fallbackRef.current = setTimeout(runOpen, 350);
      } else {
        // Re-opened while the close animation was still running: the Modal
        // is already shown, so onShow will not fire again.
        runOpen();
      }
    } else if (mounted) {
      clearFallback();
      openedRef.current = false;
      slide.stopAnimation();
      fade.stopAnimation();
      Animated.parallel([
        Animated.timing(slide, {
          toValue: offscreen,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(fade, {toValue: 0, duration: 200, useNativeDriver: false}),
      ]).start(({finished}) => {
        if (finished && !visibleRef.current) {
          setMounted(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => clearFallback, []);

  // Swipe the sheet down to close (as before).
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          slide.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          onCloseRef.current();
        } else {
          Animated.spring(slide, {toValue: 0, useNativeDriver: false}).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slide, {toValue: 0, useNativeDriver: false}).start();
      },
    }),
  ).current;

  // App palette: brand blue for every action, red only for destructive ones.
  // Soft tinted fill, no coloured outline; tokens cover light and dark mode.
  const colorsFor = (a: ActionItem) =>
    a.type === 'danger' || a.icon === 'delete'
      ? {text: T.dangerText, tint: T.dangerTint}
      : {text: T.brandText, tint: T.brandTint};

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      // Draw under both system bars on every Android version so the layout
      // is the same whether or not the OS forces edge-to-edge (Android 15+
      // with targetSdk 35 does, older versions do not). The SafeAreaProvider
      // below then measures the Modal's own window for the bottom inset.
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onShow={runOpen}
      onRequestClose={onRequestClose}>
      <SafeAreaProvider>
      <SheetBody>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: `rgba(0,0,0,${T.backdropOpacity})`, opacity: fade},
        ]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
        />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.container,
          {transform: [{translateY: slide}]},
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
      </Animated.View>
      </SheetBody>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
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
