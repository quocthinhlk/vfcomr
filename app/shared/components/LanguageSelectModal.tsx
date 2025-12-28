import React from 'react';
import {
  Modal,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {LANGUAGES} from '../../config/languages';
import {useTranslation} from '../hooks/useTranslation';
import {useThemedColors} from '../styles/theme';
import {COLORS} from '../constants/colors';
import {fs, ws, hs, ms, rs} from '../utils/scale';

type Props = {
  visible: boolean;
  selectedLanguageCode: string;
  onRequestClose: () => void;
  onSelectLanguage: (code: string) => void;
};

export default function LanguageSelectModal({
  visible,
  selectedLanguageCode,
  onRequestClose,
  onSelectLanguage,
}: Props) {
  const {t} = useTranslation();
  const C = useThemedColors();
  const selectedIndex = Math.max(
    LANGUAGES.findIndex(l => l.code === selectedLanguageCode),
    0,
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onRequestClose}>
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View
          style={[styles.dropdownOverlay, {backgroundColor: C.overlay}]}>
          <View
            style={[
              styles.dropdownContainer,
              {
                backgroundColor: C.surface,
                borderColor: C.surfaceBorder,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}>
            <View
              style={[
                styles.dropdownHeader,
                {borderBottomColor: C.surfaceBorder},
              ]}>
              <Text style={[styles.dropdownTitle, {color: C.textPrimary}]}>
                {t('language')}
              </Text>
              <TouchableOpacity
                style={styles.dropdownClose}
                onPress={onRequestClose}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text
                  style={[styles.dropdownCloseText, {color: C.textSecondary}]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang, idx) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.dropdownItem,
                    selectedIndex === idx && styles.dropdownItemActive,
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  onPress={() => {
                    onSelectLanguage(lang.code);
                  }}
                >
                  <Image source={lang.flag} style={styles.flagIcon} />
                  <Text
                    style={[
                      styles.languageOptionText,
                      {color: C.textPrimary},
                      selectedIndex === idx &&
                        styles.languageOptionTextActive,
                    ]}>
                    {lang.label}
                  </Text>
                  {selectedIndex === idx ? (
                    <Text style={styles.checkIcon}>✓</Text>
                  ) : (
                    <View style={styles.checkIconPlaceholder} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    borderRadius: rs(12),
    paddingVertical: ms(8),
    paddingHorizontal: ms(8),
    minWidth: ws(220),
    maxWidth: ws(320),
    maxHeight: hs(320),
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: rs(12),
    shadowOffset: {width: 0, height: hs(6)},
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(8),
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownTitle: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  dropdownClose: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
  },
  dropdownCloseText: {
    fontSize: fs(16),
  },
  dropdownList: {
    paddingVertical: ms(4),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(10),
    paddingHorizontal: ms(10),
    width: '100%',
    borderRadius: rs(8),
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(53,99,233,0.08)',
  },
  flagIcon: {
    width: ws(28),
    height: hs(18),
    marginRight: ms(10),
    resizeMode: 'contain',
  },
  languageOptionText: {
    fontSize: fs(15),
  },
  languageOptionTextActive: {
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 'auto',
    fontSize: fs(14),
    color: COLORS.successColor,
    paddingHorizontal: ms(4),
  },
  checkIconPlaceholder: {
    marginLeft: 'auto',
    width: ws(16),
    height: hs(16),
  },
});


