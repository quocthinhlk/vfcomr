import React, {useState, useContext, useEffect, useMemo, useCallback} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, Image} from 'react-native';
import {HamburgerMenuIcon} from './HamburgerMenuIcon';
import {MenuPopup} from './MenuPopup';
import {CommonMenuItem} from '../interfaces/MenuItem';
import {logout} from '../../modules/auth/services/auth.service';
import {AuthContext} from '../../config/navigation';
import {dashboardMenuItems, getTranslatedMenuItems} from '../config/dashboard.constants';
import {useLanguage} from '../context/LanguageContext';
import api from '../../config/api';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
  useRoute,
} from '@react-navigation/native';
import { useThemedColors } from '../styles/theme';
import { fs, ws, hs, ms, rs } from '../utils/scale';

 

type HeaderProps = {
  title?: string;
  showMenu?: boolean;
  onBackPress?: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  title,
  showMenu = true,
  onBackPress,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<any>();
  const [menuVisible, setMenuVisible] = useState(false);
  const {setIsAuthenticated} = useContext(AuthContext);
  const { selectedLanguage, setLanguage } = useLanguage();
  const C = useThemedColors();
  const [userRoleId, setUserRoleId] = useState<number | undefined>(undefined);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setMenuVisible(false);
    }
  };

  const handleChangeLanguage = (lang: string) => {
    setLanguage(lang);
  };

  useEffect(() => {
    let mounted = true;
    api.get('users/me').then((res: any) => {
      if (mounted) {
        const roleId = res?.data?.data?.role?.id;
        setUserRoleId(roleId);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleMenuItemPress = (item: CommonMenuItem) => {
    if (item.routeName) {
      navigation.navigate(item.routeName as string);
    } else if (item.label === 'Logout') {
      handleLogout();
    } else if (item.onPress) {
      item.onPress();
    }
    setMenuVisible(false);
  };

  const menuItems = useMemo(() => {
    return getTranslatedMenuItems(selectedLanguage as any, userRoleId);
  }, [selectedLanguage, userRoleId]);

  const handleGoBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  }, [navigation, onBackPress]);

  return (
    <View style={[styles.headerContainer, { backgroundColor: C.background }]}>
      <TouchableOpacity
        onPress={handleGoBack}
        style={styles.backWrap}
        activeOpacity={0.7}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <Image source={require('../../assets/images/icon/back.png')} style={[styles.backIcon, { tintColor: C.textPrimary }]} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
        {title || route?.name || ''}
      </Text>
      {showMenu ? (
        <>
      <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
      <MenuPopup
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        menuItems={menuItems}
        onMenuItemPress={handleMenuItemPress}
        onLogout={handleLogout}
        onChangeLanguage={handleChangeLanguage}
        selectedLanguage={selectedLanguage}
      />
        </>
      ) : (
        // keep layout spacing when menu is hidden
        <View style={{ width: ws(35) }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: hs(50),
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 0,
  },
  backText: {
    fontSize: fs(44),
    lineHeight: fs(34),
    color: '#111',
  },
  backIcon: {
    width: ws(25),
    height: hs(35),
    resizeMode: 'contain',
    marginLeft: 0,
    textAlign: 'right',
  },
  backWrap: {
    marginLeft: 0,
    paddingLeft: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fs(14),
    fontWeight: '700',
    color: '#111',
  },
});
