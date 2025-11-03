import React, { useState, useContext } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@ui-kitten/components';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { userProfile, dashboardIcons, dashboardMenuItems } from '../../../shared/config/dashboard.constants';
import { logout } from '../../auth/services/auth.service';
import { AuthContext } from '../../../config/navigation';
import { MenuPopup } from '../../../shared/components/MenuPopup';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { CommonMenuItem } from '../../../shared/interfaces/MenuItem';
import { HamburgerMenuIcon } from '../../../shared/components/HamburgerMenuIcon';

interface DashboardHeaderProps {
  onEditPress: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onEditPress }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [menuVisible, setMenuVisible] = useState(false);
  const { setIsAuthenticated } = useContext(AuthContext);
  const { selectedLanguage, setLanguage } = useLanguage();

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

  const handleChangeLanguage = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <View style={styles.headerContainer}>
      {/* Profile section bên trái */}
      <View style={styles.profileSection}>
        <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
        <View style={styles.profileTextContainer}>
          {/* Name + Edit icon trên cùng một hàng */}
          <View style={styles.nameRow}>
            <Text category="h6" style={styles.profileName}>
              {userProfile.name}
            </Text>
            <TouchableOpacity onPress={onEditPress} style={styles.headerEditButton}>
              <Image source={dashboardIcons.editIcon} style={styles.headerEditIcon} />
            </TouchableOpacity>
          </View>
          <Text category="s2" appearance="hint" style={styles.profileRole}>
            {userProfile.role}
          </Text>
          <Text category="s2" appearance="hint" style={styles.profileLocation}>
            {userProfile.location}
          </Text>
        </View>
      </View>

      <View style={styles.headerMenu}>
        <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
        <MenuPopup
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          menuItems={dashboardMenuItems}
          onMenuItemPress={handleMenuItemPress}
          onLogout={handleLogout}
          onChangeLanguage={handleChangeLanguage}
          selectedLanguage={selectedLanguage}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // profile bên trái, actions bên phải
    alignItems: 'center',
    // paddingHorizontal: 16,
    // paddingVertical: 12,
    // backgroundColor: 'red',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileTextContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontWeight: 'bold',
  },
  headerEditButton: {
    marginLeft: 6,
  },
  headerEditIcon: {
    width: 18,
    height: 18,
  },
  profileRole: {
    color: '#888',
  },
  profileLocation: {
    color: '#888',
  },
  headerMenu: {
    marginBottom: 18,
  },
});