import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LANGUAGES} from '../../config/languages';
import {useTranslation} from '../hooks/useTranslation';
import {useThemedColors} from '../styles/theme';
import {useUiTokens} from '../styles/uiTokens';
import {CheckIcon} from './icons/UiIcons';
import {fs, ms, rs, ws} from '../utils/scale';

type Props = {
  visible: boolean;
  selectedLanguageCode: string;
  onRequestClose: () => void;
  onSelectLanguage: (code: string) => void;
};

/**
 * Language picker as a bottom sheet, like the app's other pickers: the
 * backdrop fades in, the sheet slides up; tap outside or Android back closes.
 */
export default function LanguageSelectModal({
  visible,
  selectedLanguageCode,
  onRequestClose,
  onSelectLanguage,
}: Props) {
  const {t} = useTranslation();
  const C = useThemedColors();
  const T = useUiTokens();
  const insets = useSafeAreaInsets();
  const {height: screenH} = useWindowDimensions();

  const slide = useRef(new Animated.Value(screenH)).current;
  useEffect(() => {
    if (visible) {
      slide.setValue(screenH);
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenH, slide]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      <View style={styles.modal}>
        <Pressable
          style={[StyleSheet.absoluteFill, {backgroundColor: `rgba(0,0,0,${T.backdropOpacity})`}]}
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: T.sheetBg,
              paddingBottom: Math.max(insets.bottom, ms(12)),
              transform: [{translateY: slide}],
            },
          ]}>
          <View style={[styles.handle, {backgroundColor: C.border}]} />
          <Text style={[styles.title, {color: C.textPrimary}]} accessibilityRole="header">
            {t('language')}
          </Text>
          <ScrollView style={styles.list} bounces={false}>
            {LANGUAGES.map(lang => {
              const active = lang.code === selectedLanguageCode;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => onSelectLanguage(lang.code)}
                  accessibilityRole="button"
                  accessibilityLabel={lang.label}
                  accessibilityState={{selected: active}}
                  style={({pressed}) => [
                    styles.row,
                    (active || pressed) && {backgroundColor: T.brandTint},
                  ]}>
                  <Image source={lang.flag} style={styles.flag} accessibilityIgnoresInvertColors />
                  <Text
                    style={[
                      styles.label,
                      {color: active ? T.brandText : C.textPrimary},
                      active && styles.labelActive,
                    ]}>
                    {lang.label}
                  </Text>
                  <View style={styles.check}>
                    {active ? <CheckIcon color={T.brandText} size={ws(18)} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    paddingTop: ms(8),
    paddingHorizontal: ms(16),
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: ms(12),
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
    marginBottom: ms(8),
  },
  // flexShrink: shrink to the sheet's maxHeight and scroll (RN defaults it to 0,
  // which left the list at full height and unscrollable on some Android phones).
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    minHeight: 52,
    paddingVertical: ms(10),
    paddingHorizontal: ms(10),
    borderRadius: rs(12),
    marginBottom: ms(2),
  },
  flag: {
    width: ws(28),
    height: ws(20),
    borderRadius: 3,
    resizeMode: 'contain',
  },
  label: {
    flex: 1,
    fontSize: fs(15),
  },
  labelActive: {
    fontWeight: '700',
  },
  check: {
    width: ws(24),
    alignItems: 'center',
  },
});
