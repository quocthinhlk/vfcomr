import React, {useEffect, useRef, useState} from 'react';
import {COLORS} from '../constants/colors';
import {LANGUAGES} from '../../config/languages';
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {CommonMenuItem} from '../interfaces/MenuItem';
import api from '../../config/api';
import { isSuperAdmin } from '../utils/permissions';
import { useTranslation } from '../hooks/useTranslation';
import { useThemedColors } from '../styles/theme';
import LanguageSelectModal from './LanguageSelectModal';

interface MenuPopupProps {
  visible: boolean;
  onClose: () => void;
  menuItems: CommonMenuItem[];
  onMenuItemPress: (item: CommonMenuItem) => void;
  onLogout: () => void;
  onChangeLanguage: (lang: string) => void;
  selectedLanguage: string;
}

export const MenuPopup: React.FC<MenuPopupProps> = ({
  visible,
  onClose,
  menuItems,
  onMenuItemPress,
  onLogout,
  onChangeLanguage,
  selectedLanguage,
}) => {
  const { t } = useTranslation();
  const C = useThemedColors();
  const [isMounted, setIsMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const initialIndex = Math.max(
    LANGUAGES.findIndex(l => l.code === selectedLanguage),
    0,
  );
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [langDropdownVisible, setLangDropdownVisible] = useState(false);

  // Track single expanded item for accordion behavior
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(prev => (prev === idx ? null : idx));
  };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    const idx = LANGUAGES.findIndex(l => l.code === selectedLanguage);
    if (idx !== -1) {
      setSelectedIndex(idx);
    }
  }, [selectedLanguage]);

  // role-based filtering state MUST be declared before any early returns
  const [roleId, setRoleId] = useState<number | null>(null);
  useEffect(() => {
    // fetch current user role once when mounted
    (async () => {
      try {
        const res = await api.get('users/me');
        const r = res?.data?.data?.role?.id;
        if (typeof r === 'number') setRoleId(r);
      } catch {}
    })();
  }, []);

  if (!isMounted) {
    return null;
  }

  // filter by routeName (language-agnostic): enforce SUPER_ADMIN for specific items regardless of translated labels
  const filteredMenuItems = menuItems.map(section => {
    if (Array.isArray(section.children)) {
      const children = section.children.filter(child => {
        if (
          child.routeName === 'Overseers' ||
          child.routeName === 'CloneChurch' ||
          child.routeName === 'DisableChurches' ||
          child.routeName === 'SettingsBibleVerse' ||
          child.routeName === 'SettingsRationalising'
        ) {
          return isSuperAdmin(roleId || undefined);
        }
        return true;
      });
      return { ...section, children } as CommonMenuItem;
    }
    return section;
  });

  return (
    <Modal
      transparent
      animationType="none"
      visible={isMounted}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, {opacity: fadeAnim}]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.menuContainer,
                {transform: [{translateX: slideAnim}]},
              ]}>
              <SafeAreaView style={styles.safeArea}>
                {/* Close popup button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <View style={styles.closeIcon}>
                    <View style={styles.closeLine} />
                    <View style={[styles.closeLine, styles.closeLineReverse]} />
                  </View>
                </TouchableOpacity>

                {/* Menu items (scrollable) */}
                <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                  {filteredMenuItems.map((item, idx) => {
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    const isOpen = expandedIndex === idx;
                    return (
                      <View key={idx}>
                        <TouchableOpacity
                          style={[styles.menuItem, item.disabled && styles.disabledMenuItem]}
                          disabled={item.disabled}
                          onPress={() => {
                            if (item.disabled) return;
                            if (hasChildren) {
                              toggleExpand(idx);
                            } else {
                              onMenuItemPress(item);
                            }
                          }}>
                          {/* Icons are optional; dashboard menu items omit icons */}
                          {item.icon && (
                            <Image source={item.icon} style={[styles.menuIcon, item.disabled && styles.disabledIcon]} />
                          )}
                          <Text style={[styles.menuBulletText, item.disabled && styles.disabledText]}>{'›'}</Text>
                          <Text style={[styles.menuLabel, item.disabled && styles.disabledText]}>{item.label}</Text>
                          {hasChildren && (
                            <Text style={[styles.expandIndicator, item.disabled && styles.disabledText]}>{isOpen ? '▾' : '▸'}</Text>
                          )}
                        </TouchableOpacity>

                        {hasChildren && isOpen && (
                          <View style={styles.subMenuList}>
                            {item.children!.map((child, cIdx) => (
                              <TouchableOpacity
                                key={`${idx}-${cIdx}`}
                                style={styles.subMenuItem}
                                onPress={() => onMenuItemPress(child)}>
                                {child.icon && (
                                  <Image source={child.icon} style={styles.subMenuIcon} />
                                )}
                                <Text style={styles.subMenuBulletText}>{'›'}</Text>
                                <Text style={styles.subMenuLabel}>{child.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Bottom section (fixed) */}
                <View style={styles.bottomSection}>
                  {/* Language select custom */}
                  <View style={styles.languageSelect}>
                    <TouchableOpacity
                      style={styles.languageButton}
                      onPress={() => setLangDropdownVisible(true)}
                      activeOpacity={0.7}>
                      <View style={styles.languageButtonContent}>
                        <Image
                          source={LANGUAGES[selectedIndex].flag}
                          style={styles.languageIcon}
                        />
                        <Text style={styles.languageText}>
                          {LANGUAGES[selectedIndex].label}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Dropdown menu */}
                    <LanguageSelectModal
                      visible={langDropdownVisible}
                      selectedLanguageCode={selectedLanguage}
                      onRequestClose={() => setLangDropdownVisible(false)}
                      onSelectLanguage={(code) => { onChangeLanguage(code); setLangDropdownVisible(false); }}
                    />
                  </View>

                  {/* Logout button */}
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={onLogout}>
                    <Image
                      source={require('../../assets/images/logout.png')}
                      style={styles.logoutIcon}
                    />
                    <Text style={styles.logoutLabel}>{t('logout')}</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    width: 330,
    height: '100%',
    backgroundColor: '#3C3F44',
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {width: -2, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuList: {
    flex: 1,
    // backgroundColor: 'red'

  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: COLORS.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginRight: 10,
    marginBottom: 10,
    display: 'none'
  },
  closeIcon: {
    position: 'relative',
    width: 15,
    height: 15,
  },
  closeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: '#fff',
    transform: [{rotate: '45deg'}],
  },
  closeLineReverse: {
    transform: [{rotate: '-45deg'}],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 5,
    resizeMode: 'contain',
  },
  menuBulletText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 12,
    marginRight: 6,
  },
  menuLabel: {
    fontSize: 17,
    color: '#fff',
    flex: 1,
  },
  expandIndicator: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 15,
  },
  subMenuList: {
    paddingLeft: 20,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  subMenuIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    resizeMode: 'contain',
  },
  subMenuBulletText: {
    color: '#fff',
    fontSize: 9,
    lineHeight: 11,
    marginRight: 6,
  },
  subMenuLabel: {
    fontSize: 17,
    color: '#fff',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  },
  logoutLabel: {
    fontSize: 17,
    color: '#fff',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#555',
    // backgroundColor: 'green'

  },
  languageSelect: {
    marginRight: 10,
  },
  languageButton: {
    // paddingHorizontal: 5,
    // paddingVertical: 3,
    // borderRadius: 5,
  },
  languageIcon: {
    width: 20,
    marginRight: 4,
    resizeMode: 'contain',
  },
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    width: 10,
    height: 10,
    marginLeft: 2,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 220,
    maxWidth: 320,
    maxHeight: 450,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: '100%',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(53,99,233,0.08)',
    borderRadius: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  dropdownClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dropdownCloseText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    paddingVertical: 4,
  },
  flagIcon: {
    width: 28,
    height: 18,
    marginRight: 10,
    resizeMode: 'contain',
  },
  languageText: {
    fontSize: 17,
    color: '#fff',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
  },
  languageOptionTextActive: {
    fontWeight: '700',
    color: '#0b1d51',
  },
  checkIcon: {
    marginLeft: 'auto',
    fontSize: 16,
    color: COLORS.successColor,
    paddingHorizontal: 4,
  },
  checkIconPlaceholder: {
    marginLeft: 'auto',
    width: 16,
    height: 16,
  },
  safeArea: {
    flex: 1,
  },
  disabledMenuItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#888',
  },
  disabledIcon: {
    opacity: 0.5,
  },
});
