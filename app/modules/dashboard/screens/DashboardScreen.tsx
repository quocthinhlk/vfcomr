// modules/dashboard/screens/DashboardScreen.tsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../../auth/services/auth.service'; // Corrected import path
import { AuthContext } from '../../../config/navigation';
import { dashboardStyles } from '../styles';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { dashboardIcons, getTranslatedMenuItems, getUserProfile, BLANK_AVATAR } from '../../../shared/config/dashboard.constants';
import { useLanguage } from '../../../shared/context/LanguageContext';
import api from '../../../config/api';
import { useThemedColors } from '../../../shared/styles/theme';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { HamburgerMenuIcon } from '../../../shared/components/HamburgerMenuIcon';
import { MenuPopup } from '../../../shared/components/MenuPopup';
import { isPastorLeader } from '../../../shared/utils/permissions';
import DashboardPastorLeaderScreen from './DashboardPastorLeaderScreen';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { setIsAuthenticated } = useContext(AuthContext);
  const { showAllStats, visibleStats, toggleShowAllStats, icons } = useDashboardStats();
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const C = useThemedColors();
  const { t } = useTranslation();

  const [menuVisible, setMenuVisible] = useState(false);
  const { selectedLanguage, setLanguage } = useLanguage();
  const translatedMenu = getTranslatedMenuItems(selectedLanguage as any);
  const [showLocalAllStats, setShowLocalAllStats] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState<{ name: string; role: string; location: string; image: any }>({ name: '', role: '', location: '', image: BLANK_AVATAR });
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: showLocalAllStats ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showLocalAllStats]);
  const arrowRotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const toggleLocalShowAllStats = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 8, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setShowLocalAllStats(prev => !prev);
      translateY.setValue(-8);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };
  const [orgModalVisible, setOrgModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('users/me');
        if (!mounted) return;
        const r = res?.data?.data?.role?.id;
        if (typeof r === 'number') setCurrentUserRoleId(r);
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Load profile display fields
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getUserProfile();
        if (!mounted) return;
        setProfile({ name: u.name, role: u.role, location: u.location, image: u.profileImage });
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // If user is Pastor Leader, show the Pastor Leader Dashboard
  if (!loading && isPastorLeader(currentUserRoleId)) {
    return <DashboardPastorLeaderScreen />;
  }

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setMenuVisible(false); // Close menu after logout
    }
  };

  const handleMenuItemPress = (item: any) => {
    if (item.routeName) {
      navigation.navigate(item.routeName);
    } else if (item.label === 'Logout') {
      handleLogout();
    }
    setMenuVisible(false); // Close menu after any item press
  };

  const handleChangeLanguage = (lang: string) => setLanguage(lang);

  const menuItems = [
    { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'Enter Visits', routeName: 'EnterVisits', disabled: true },
    { icon: require('../../../../app/assets/images/icon/edit.png'), label: 'Edit Profile', routeName: 'EditProfile', disabled: true },
    { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'New Church & New Pastor', routeName: 'NewPastorAndChurch' },
    { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'New Pastor', routeName: 'AddUser' },
    { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'New Church', routeName: 'AddChurch' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: C.background}} edges={['top','bottom','left','right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.textPrimary }}>{t('loading')}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: C.background}} edges={['top','bottom','left','right']}>
      <ScrollView style={[dashboardStyles.container, { backgroundColor: C.background }] }>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Image
              source={typeof profile.image === 'string' ? { uri: profile.image } : profile.image}
              style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
              onError={() => setProfile(prev => ({ ...prev, image: BLANK_AVATAR }))}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text category="h6" style={{ fontWeight: 'bold', color: C.textPrimary }}>{profile.name}</Text>
              </View>
              <Text category="s2" appearance="hint" style={{ color: C.textSecondary }}>{profile.role}</Text>
              <Text category="s2" appearance="hint" style={{ color: C.textSecondary }}>{profile.location}</Text>
            </View>
          </View>
          <View style={{ marginBottom: 18 }}>
            <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
            <MenuPopup
              visible={menuVisible}
              onClose={() => setMenuVisible(false)}
              menuItems={translatedMenu}
              onMenuItemPress={handleMenuItemPress}
              onLogout={handleLogout}
              onChangeLanguage={handleChangeLanguage}
              selectedLanguage={selectedLanguage}
            />
          </View>
        </View>

        {/* Assigned Churches Modal (effect copied) */}
        <Modal visible={orgModalVisible} transparent animationType="fade" onRequestClose={() => setOrgModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={localStyles.modalBackdrop} onPress={() => setOrgModalVisible(false)}>
            <View style={localStyles.modalCard}>
              <ScrollView>
                {(['Organization A', 'Organization B', 'Organization C'] as string[]).map((name, idx) => (
                  <TouchableOpacity key={String(idx)} style={localStyles.modalItem} onPress={() => setOrgModalVisible(false)}>
                    <Text style={localStyles.modalItemText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Static stats (copied pattern from PastorLeader, no API) */}
        <Animated.View style={[dashboardStyles.statCardContainer, { opacity: fade, transform: [{ translateY }] }]}> 
          {(
            [
              { icon: require('../../../../app/assets/images/icon/house.png'), value: '40', label: 'Churches' },
              { icon: require('../../../../app/assets/images/icon/group.png'), value: '500', label: 'People' },
              { icon: require('../../../../app/assets/images/icon/growth.png'), value: '5%', label: 'Churches Growing' },
              { icon: require('../../../../app/assets/images/icon/reporting.png'), value: '20', label: 'Churches Reporting' },
              { icon: require('../../../../app/assets/images/icon/earth.png'), value: '2', label: 'Nations' },
              { icon: require('../../../../app/assets/images/icon/plant.png'), value: '30', label: 'Churches Planting' },
              { icon: require('../../../../app/assets/images/icon/cell-group.png'), value: '500', label: 'Churches with CGs' },
              { icon: require('../../../../app/assets/images/icon/education.png'), value: '300', label: 'Churches with GT/LIW' },
              { icon: require('../../../../app/assets/images/icon/worldwide-currency.png'), value: '20', label: 'Churches with MFP' },
              { icon: require('../../../../app/assets/images/icon/worldwide.png'), value: '530', label: 'Churches Visited' },
            ] as Array<{ icon: any; value: string; label: string }>
          )
            .slice(0, showLocalAllStats ? 10 : 4)
            .map((stat, index) => (
              <DashboardStatCard key={index} {...stat} />
            ))}
        </Animated.View>

        {true && (
          <TouchableOpacity onPress={toggleLocalShowAllStats} style={dashboardStyles.viewMoreButton}>
            <Text style={[dashboardStyles.viewMoreText, { color: C.textSecondary, fontSize: 14 }]}>
              {showLocalAllStats ? `${t('viewLess')} ` : `${t('viewMore')} `}
              <Animated.Image source={icons.iconDown} style={{ width: 12, height: 12, marginLeft: 4, transform: [{ rotate: arrowRotate }] }} />
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ marginTop: 8, paddingHorizontal: 0 }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 0, borderBottomWidth: StyleSheet.hairlineWidth }, { borderBottomColor: C.border, opacity: item?.disabled ? 0.5 : 1 }]}
              onPress={() => { if (!item?.disabled) handleMenuItemPress(item); }}
              disabled={!!item?.disabled}
              activeOpacity={item?.disabled ? 1 : 0.7}
            >
              <Image source={item.icon} style={{ width: 24, height: 24, marginRight: 8, resizeMode: 'contain' }} />
              <Text style={[{ flex: 1 }, { color: C.textPrimary }]}> 
                {item.label === 'Enter Visits' ? item.label :
                 item.label === 'Edit Profile' ? item.label :
                 item.label === 'New Church & New Pastor' ? t('addNewChurchAndPastor') :
                 item.label === 'New Pastor' ? t('addNewPastor') :
                 item.label === 'New Church' ? t('addNewChurch') : item.label}
              </Text>
              <Image source={require('../../../../app/assets/images/icon-down.png')} style={localStyles.menuArrow} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  menuArrow: {
    width: 12,
    height: 12,
    transform: [{ rotate: '-90deg' }],
  },
  modalItemText: {
    fontSize: 16,
    color: '#111',
  },
});