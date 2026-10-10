import React, {useCallback, useEffect, useRef, useState} from 'react';
import {COLORS} from '../constants/colors';
import {LANGUAGES} from '../../config/languages';
import {
  Alert,
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
import { fs, ws, hs, ms, rs } from '../utils/scale';

// Screens reached under another route name than their menu entry.
const ACTIVE_ROUTE_ALIASES: Record<string, string> = {
  DashboardPastorLeader: 'Dashboard',
};
// Params a screen assumes when opened without them (menu entries are explicit).
const ACTIVE_ROUTE_DEFAULT_PARAMS: Record<string, Record<string, unknown>> = {
  GenerateReports: {group: 'church'},
};

/** True when `item` is the screen currently open (route + its menu params). */
export function isMenuItemActive(
  item: CommonMenuItem,
  activeRouteName?: string,
  activeRouteParams?: Record<string, unknown>,
): boolean {
  if (!item.routeName || !activeRouteName) {
    return false;
  }
  const current = ACTIVE_ROUTE_ALIASES[activeRouteName] ?? activeRouteName;
  if (item.routeName !== current) {
    return false;
  }
  if (!item.params) {
    return true;
  }
  const params = {...ACTIVE_ROUTE_DEFAULT_PARAMS[current], ...activeRouteParams};
  return Object.entries(item.params).every(([key, value]) => params[key] === value);
}

interface MenuPopupProps {
  visible: boolean;
  onClose: () => void;
  menuItems: CommonMenuItem[];
  onMenuItemPress: (item: CommonMenuItem) => void;
  onLogout: () => void;
  onChangeLanguage: (lang: string) => void;
  selectedLanguage: string;
  /** Route of the screen that opened the menu, to highlight its entry. */
  activeRouteName?: string;
  activeRouteParams?: Record<string, unknown>;
}

export const MenuPopup: React.FC<MenuPopupProps> = ({
  visible,
  onClose,
  menuItems,
  onMenuItemPress,
  onLogout,
  onChangeLanguage,
  selectedLanguage,
  activeRouteName,
  activeRouteParams,
}) => {
  const { t } = useTranslation();
  const C = useThemedColors();
  const [isMounted, setIsMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(ws(300))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    [],
  );

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

  const isActive = (item: CommonMenuItem) =>
    isMenuItemActive(item, activeRouteName, activeRouteParams);

  useEffect(() => {
    if (visible) {
      // Open the group that holds the current screen (first match wins).
      const activeGroup = menuItems.findIndex(item =>
        item.children?.some(child => isActive(child)),
      );
      setExpandedIndex(activeGroup === -1 ? null : activeGroup);
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
          toValue: ws(300),
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
        // Unmount once closed even if the animation was cut short (e.g. a menu
        // item navigated away mid-close) — otherwise the transparent Modal stays
        // presented, eats taps and blocks every other Modal. Skip if it was
        // reopened meanwhile, or if this component is gone.
        if (aliveRef.current && !visibleRef.current) {
          setIsMounted(false);
        }
      });
    }
  }, [visible]);

  useEffect(() => {
    const idx = LANGUAGES.findIndex(l => l.code === selectedLanguage);
    if (idx !== -1) {
      setSelectedIndex(idx);
    }
  }, [selectedLanguage]);

  const handleLogoutPress = useCallback(() => {
    Alert.alert(
      t('logoutConfirmTitle'),
      t('logoutConfirmMessage'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('logout'),
          style: 'destructive',
          onPress: () => {
            onClose();
            onLogout();
          },
        },
      ],
    );
  }, [t, onClose, onLogout]);

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
          child.routeName === 'SettingsRationalising' ||
          child.routeName === 'AddFAQ'
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
                <ScrollView style={styles.menuList}>
                  {filteredMenuItems.map((item, idx) => {
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    const isOpen = expandedIndex === idx;
                    const itemActive = !hasChildren && isActive(item);
                    const groupActive =
                      hasChildren && item.children!.some(child => isActive(child));
                    return (
                      <View key={idx}>
                        <TouchableOpacity
                          style={[
                            styles.menuItem,
                            hasChildren && styles.menuItemParent,
                            itemActive && styles.menuItemActive,
                            item.disabled && styles.disabledMenuItem,
                          ]}
                          accessibilityState={{
                            selected: itemActive,
                            expanded: hasChildren ? isOpen : undefined,
                            disabled: item.disabled,
                          }}
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
                          <Text
                            style={[
                              styles.menuBulletText,
                              (itemActive || groupActive) && styles.activeText,
                              item.disabled && styles.disabledText,
                            ]}>
                            {'›'}
                          </Text>
                          <Text
                            style={[
                              styles.menuLabel,
                              (itemActive || groupActive) && styles.activeText,
                              item.disabled && styles.disabledText,
                            ]}>
                            {item.label}
                          </Text>
                          {hasChildren && (
                            <Text
                              style={[
                                styles.expandIndicator,
                                isOpen && styles.expandIndicatorOpen,
                                item.disabled && styles.disabledText,
                              ]}>
                              {'›'}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {hasChildren && isOpen && (
                          <View style={styles.subMenuList}>
                            {item.children!.map((child, cIdx) => {
                              const childActive = isActive(child);
                              return (
                                <TouchableOpacity
                                  key={`${idx}-${cIdx}`}
                                  style={[styles.subMenuItem, childActive && styles.subMenuItemActive]}
                                  activeOpacity={0.75}
                                  accessibilityState={{selected: childActive}}
                                  onPress={() => onMenuItemPress(child)}>
                                  {child.icon && (
                                    <Image source={child.icon} style={styles.subMenuIcon} />
                                  )}
                                  <Text
                                    style={[
                                      styles.subMenuBulletText,
                                      childActive && styles.activeText,
                                    ]}>
                                    {'›'}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.subMenuLabel,
                                      childActive && styles.subMenuLabelActive,
                                    ]}>
                                    {child.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
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
                    onPress={handleLogoutPress}>
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
    width: ws(330),
    height: '100%',
    backgroundColor: '#3C3F44',
    paddingTop: ms(10),
    paddingHorizontal: ms(20),
    shadowColor: '#000',
    shadowOffset: {width: ms(-2), height: 0},
    shadowOpacity: 0.2,
    shadowRadius: rs(8),
    elevation: 5,
  },
  menuList: {
    flex: 1,
    // backgroundColor: 'red'

  },
  closeButton: {
    width: ws(30),
    height: ws(30),
    borderRadius: rs(20),
    backgroundColor: COLORS.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    // marginTop: ms(50),
    marginRight: ms(10),
    marginBottom: ms(5),
    // display: 'none'
  },
  closeIcon: {
    position: 'relative',
    width: ws(15),
    height: hs(15),
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
    paddingVertical: ms(10),
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  menuItemParent: {
    marginTop: 0,
  },
  // Current screen: tinted row with a brand-coloured accent on the left.
  menuItemActive: {
    backgroundColor: 'rgba(36,120,206,0.22)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.mainColor,
    paddingLeft: ms(8),
    borderRadius: rs(6),
  },
  activeText: {
    color: '#fff',
    fontWeight: '700',
  },
  menuIcon: {
    width: ws(24),
    height: hs(24),
    marginRight: ms(5),
    resizeMode: 'contain',
  },
  menuBulletText: {
    color: '#fff',
    fontSize: fs(13),
    lineHeight: fs(12),
    marginRight: ms(6),
  },
  menuLabel: {
    fontSize: fs(16),
    color: '#fff',
    flex: 1,
    fontWeight: '600',
  },
  expandIndicator: {
    color: '#fff',
    marginLeft: ms(6),
    fontSize: fs(24),
  },
  expandIndicatorOpen: {
    transform: [{rotate: '90deg'}],
  },
  subMenuList: {
    marginLeft: ms(14),
    marginTop: ms(1),
    marginBottom: ms(2),
    paddingLeft: 0,
    borderLeftWidth: 0,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(8),
    paddingRight: ms(6),
    borderBottomWidth: 0,
  },
  subMenuItemActive: {
    backgroundColor: 'rgba(36,120,206,0.22)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.mainColor,
    paddingLeft: ms(8),
    borderRadius: rs(6),
  },
  subMenuIcon: {
    width: ws(18),
    height: hs(18),
    marginRight: ms(6),
    resizeMode: 'contain',
  },
  subMenuBulletText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fs(10),
    lineHeight: fs(10),
    marginRight: ms(8),
  },
  subMenuLabel: {
    fontSize: fs(16),
    fontWeight: '400',
    color: 'rgba(255,255,255,0.88)',
  },
  subMenuLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIcon: {
    width: ws(18),
    height: hs(18),
    tintColor: '#fff',
  },
  logoutLabel: {
    fontSize: fs(16),
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
    marginRight: ms(10),
  },
  languageButton: {
    // paddingHorizontal: 5,
    // paddingVertical: 3,
    // borderRadius: 5,
  },
  languageIcon: {
    width: ws(18),
    marginRight: ms(4),
    resizeMode: 'contain',
  },
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    width: ws(10),
    height: hs(10),
    marginLeft: ms(2),
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
    borderRadius: rs(12),
    paddingVertical: ms(8),
    paddingHorizontal: ms(8),
    minWidth: ws(220),
    maxWidth: ws(320),
    maxHeight: hs(450),
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: rs(12),
    shadowOffset: { width: 0, height: hs(6) },
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(12),
    paddingHorizontal: ms(12),
    width: '100%',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(53,99,233,0.08)',
    borderRadius: rs(8),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(8),
    paddingVertical: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#111',
  },
  dropdownClose: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
  },
  dropdownCloseText: {
    fontSize: fs(16),
    color: '#333',
  },
  dropdownList: {
    paddingVertical: ms(4),
  },
  flagIcon: {
    width: ws(28),
    height: hs(18),
    marginRight: ms(10),
    resizeMode: 'contain',
  },
  languageText: {
    fontSize: fs(16),
    color: '#fff',
  },
  languageOptionText: {
    fontSize: fs(16),
    color: '#000',
    paddingVertical: ms(4),
  },
  languageOptionTextActive: {
    fontWeight: '700',
    color: '#0b1d51',
  },
  checkIcon: {
    marginLeft: 'auto',
    fontSize: fs(16),
    color: COLORS.successColor,
    paddingHorizontal: ms(4),
  },
  checkIconPlaceholder: {
    marginLeft: 'auto',
    width: ws(16),
    height: hs(16),
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
