import React, { useContext } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from '@ui-kitten/components';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
// import { MenuPopup } from './MenuPopup'; // Removed
// import { HamburgerMenuIcon } from './HamburgerMenuIcon'; // Removed
// import { CommonMenuItem } from '../interfaces/MenuItem'; // Removed as it's not used here anymore
// import { logout } from '../../modules/auth/services/auth.service'; // Removed as it's not used here anymore
// import { AuthContext } from '../../config/navigation'; // Removed as it's not used here anymore
// import { dashboardMenuItems } from '../../modules/dashboard/config/dashboard.constants'; // Removed

interface BackButtonProps {
  style?: any;
  textStyle?: any;
  title?: string;
  // showMenu?: boolean; // Removed
  // menuItems?: CommonMenuItem[]; // Removed
}

export const BackButton: React.FC<BackButtonProps> = ({ style, textStyle, title}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  // const [menuVisible, setMenuVisible] = useState(false); // Removed
  // const { setIsAuthenticated } = useContext(AuthContext); // Removed
  // const [selectedLanguage, setSelectedLanguage] = useState('en'); // Removed

  // const handleLogout = async () => { // Removed
  //   try {
  //     await logout();
  //     setIsAuthenticated(false);
  //   } catch (error) {
  //     console.error('Error during logout:', error);
  //   } finally {
  //     // setMenuVisible(false); // Removed
  //   }
  // };

  // const handleChangeLanguage = (lang: string) => { // Removed
  //   setSelectedLanguage(lang);
  //   // TODO: add logic để đổi ngôn ngữ app
  // };

  // const handleMenuItemPress = (item: CommonMenuItem) => { // Removed
  //   if (item.routeName) {
  //     navigation.navigate(item.routeName as string);
  //   } else if (item.label === 'Logout') {
  //     handleLogout();
  //   } else if (item.onPress) {
  //     item.onPress();
  //   }
  //   // setMenuVisible(false); // Removed
  // };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={[styles.backButtonText, textStyle]} appearance="hint">❮ Back</Text>
      </TouchableOpacity>

      {title && <Text style={styles.titleText}>{title}</Text>}

        {/* <>
          <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
          <MenuPopup
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            menuItems={dashboardMenuItems} // Use dashboardMenuItems
            onMenuItemPress={handleMenuItemPress}
            onLogout={handleLogout}
            onChangeLanguage={handleChangeLanguage}
            selectedLanguage={selectedLanguage}
          />
        </> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 20,
    backgroundColor: '#fff',
    marginBottom: 5,
    marginTop: 5,
  },
  backButton: {
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: '#000',
  },
  titleText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginRight: 60,
  },
});