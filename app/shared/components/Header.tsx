import React, {useState, useContext, useEffect} from 'react';
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

 

type HeaderProps = { title?: string };

export const Header: React.FC<HeaderProps> = ({ title }) => {
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

  return (
    <View style={[styles.headerContainer, { backgroundColor: C.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
        <Image source={require('../../assets/images/icon/back.png')} style={[styles.backIcon, { tintColor: C.textPrimary }]} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{title || route?.name || ''}</Text>
      <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
      <MenuPopup
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        menuItems={getTranslatedMenuItems(selectedLanguage as any, userRoleId)}
        onMenuItemPress={handleMenuItemPress}
        onLogout={handleLogout}
        onChangeLanguage={handleChangeLanguage}
        selectedLanguage={selectedLanguage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 0,
  },
  backText: {
    fontSize: 44,
    lineHeight: 34,
    color: '#111',
  },
  backIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    marginLeft: 0,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
});
