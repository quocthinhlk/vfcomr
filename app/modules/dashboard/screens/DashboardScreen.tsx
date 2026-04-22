// modules/dashboard/screens/DashboardScreen.tsx
import React, {useContext, useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, Button} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {logout} from '../../auth/services/auth.service'; // Corrected import path
import {AuthContext} from '../../../config/navigation';
import {dashboardStyles} from '../styles';
import {DashboardHeader} from '../components/DashboardHeader';
import {DashboardStatCard} from '../components/DashboardStatCard';
import {useDashboardStats} from '../hooks/useDashboardStats';
import {
  dashboardIcons,
  getTranslatedMenuItems,
  getUserProfile,
  BLANK_AVATAR,
} from '../../../shared/config/dashboard.constants';
import {useLanguage} from '../../../shared/context/LanguageContext';
import api from '../../../config/api';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {HamburgerMenuIcon} from '../../../shared/components/HamburgerMenuIcon';
import {MenuPopup} from '../../../shared/components/MenuPopup';
import {isOverseer, isPastorLeader} from '../../../shared/utils/permissions';
import DashboardPastorLeaderScreen from './DashboardPastorLeaderScreen';
import OverseerDashboardScreen from './OverseerDashboardScreen';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';

const resolveRoleId = (userData: any): number | null => {
  const rawRoleId =
    userData?.role?.id ??
    userData?.role_id ??
    userData?.roleID ??
    userData?.roleId;
  const parsedRoleId = Number(rawRoleId);
  return Number.isFinite(parsedRoleId) ? parsedRoleId : null;
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const {setIsAuthenticated} = useContext(AuthContext);
  const {showAllStats, visibleStats, toggleShowAllStats, icons} =
    useDashboardStats();
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const C = useThemedColors();
  const {t} = useTranslation();

  const [menuVisible, setMenuVisible] = useState(false);
  const {selectedLanguage, setLanguage} = useLanguage();
  const translatedMenu = useMemo(
    () =>
      getTranslatedMenuItems(
        selectedLanguage as any,
        currentUserRoleId ?? undefined,
      ),
    [selectedLanguage, currentUserRoleId],
  );
  const [showLocalAllStats, setShowLocalAllStats] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState<{
    name: string;
    role: string;
    location: string;
    image: any;
  }>({name: '', role: '', location: '', image: BLANK_AVATAR});
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: showLocalAllStats ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showLocalAllStats]);
  const arrowRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
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
        if (!mounted) {
          return;
        }
        const userData = res?.data?.data;
        const r = resolveRoleId(userData);
        const userId = userData?.id;
        if (r != null) {
          setCurrentUserRoleId(r);
        }
        if (typeof userId === 'number') {
          setCurrentUserId(userId);
        }
      } catch {}
      if (mounted) {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load profile display fields
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getUserProfile();
        if (!mounted) {
          return;
        }
        setProfile({
          name: u.name,
          role: u.role,
          location: u.location,
          image: u.profileImage,
        });
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // If user is Pastor Leader, show the Pastor Leader Dashboard
  if (!loading && isPastorLeader(currentUserRoleId)) {
    return <DashboardPastorLeaderScreen />;
  }

  // If user is Overseer, show the Overseer Dashboard
  if (!loading && isOverseer(currentUserRoleId)) {
    return <OverseerDashboardScreen />;
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
      if (item.routeName === 'EditProfile') {
        if (currentUserId) {
          navigation.navigate('EditProfile', {id: currentUserId});
        }
      } else {
        navigation.navigate(item.routeName);
      }
    } else if (item.label === 'Logout') {
      handleLogout();
    }
    setMenuVisible(false); // Close menu after any item press
  };

  const handleChangeLanguage = (lang: string) => setLanguage(lang);

  const menuItems = [
    {
      icon: require('../../../../app/assets/images/icon/car.png'),
      label: t('enterVisits') || 'Enter Visits',
      routeName: 'EnterVisits',
    },
    {
      icon: require('../../../../app/assets/images/icon/edit.png'),
      label: t('editMyProfile') || 'Edit My Profile',
      routeName: 'EditProfile',
      disabled: !currentUserId,
    },
    {
      icon: require('../../../../app/assets/images/icon/house-user.png'),
      label: t('addNewChurchAndPastor') || 'Add New Pastor & New Church',
      routeName: 'NewPastorAndChurch',
    },
    {
      icon: require('../../../../app/assets/images/icon/user.png'),
      label: t('addNewPastor') || 'New Pastor',
      routeName: 'AddUser',
    },
    {
      icon: require('../../../../app/assets/images/icon/home.png'),
      label: t('addNewChurch') || 'New Church',
      routeName: 'AddChurch',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView
        style={{flex: 1, backgroundColor: C.background}}
        edges={['top', 'bottom', 'left', 'right']}>
        <View
          style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: C.textPrimary}}>{t('loading')}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: C.background}}
      edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        style={[dashboardStyles.container, {backgroundColor: C.background}]}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <View
            style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <Image
              source={
                typeof profile.image === 'string'
                  ? {uri: profile.image}
                  : profile.image
              }
              style={{
                width: ws(50),
                height: ws(50),
                borderRadius: rs(25),
                marginRight: ms(12),
              }}
              onError={() =>
                setProfile(prev => ({...prev, image: BLANK_AVATAR}))
              }
            />
            <TouchableOpacity
              style={{flex: 1}}
              onPress={() => {
                if (currentUserId) {
                  navigation.navigate('User', {userId: currentUserId});
                }
              }}
              activeOpacity={0.7}
              disabled={!currentUserId}>
              <View
                style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text
                  category="h6"
                  style={{
                    fontWeight: 'bold',
                    color: C.textPrimary,
                    fontSize: fs(14),
                  }}>
                  {profile.name}
                </Text>
              </View>
              <Text
                category="s2"
                appearance="hint"
                style={{
                  color: C.textSecondary,
                  fontSize: fs(12),
                  }}>
                {profile.role}
              </Text>
              <Text
                category="s2"
                appearance="hint"
                style={{
                  color: C.textSecondary,
                  fontSize: fs(12),
                  }}>
                {profile.location}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{marginBottom: ms(18)}}>
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
        <Modal
          visible={orgModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setOrgModalVisible(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalBackdrop}
            onPress={() => setOrgModalVisible(false)}>
            <View style={localStyles.modalCard}>
              <ScrollView>
                {(
                  [
                    'Organization A',
                    'Organization B',
                    'Organization C',
                  ] as string[]
                ).map((name, idx) => (
                  <TouchableOpacity
                    key={String(idx)}
                    style={localStyles.modalItem}
                    onPress={() => setOrgModalVisible(false)}>
                    <Text style={localStyles.modalItemText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Static stats (copied pattern from PastorLeader, no API) */}
        <Animated.View
          style={[
            dashboardStyles.statCardContainer,
            {opacity: fade, transform: [{translateY}]},
          ]}>
          {(
            [
              {
                icon: require('../../../../app/assets/images/icon/house.png'),
                value: '40',
                label: t('churches') || 'Churches',
                helpMessage: t('indicatorInfoChurches'),
              },
              {
                icon: require('../../../../app/assets/images/icon/group.png'),
                value: '500',
                label: t('people') || 'People',
                helpMessage: t('indicatorInfoPeople'),
              },
              {
                icon: require('../../../../app/assets/images/icon/growth.png'),
                value: '5%',
                label: t('churchesGrowing') || 'Churches Growing',
                helpTitle: t('indicatorTitleChurchesGrowing'),
                helpMessage: t('indicatorInfoChurchesGrowing'),
              },
              {
                icon: require('../../../../app/assets/images/icon/reporting.png'),
                value: '20%',
                label: t('churchesReporting') || 'Churches Reporting',
                helpTitle: t('indicatorTitleChurchesReporting'),
                helpMessage: t('indicatorInfoChurchesReporting'),
              },
              {
                icon: require('../../../../app/assets/images/icon/earth.png'),
                value: '2',
                label: t('nations') || 'Nations',
                helpMessage: t('indicatorInfoNations'),
              },
              {
                icon: require('../../../../app/assets/images/icon/plant.png'),
                value: '30%',
                label: t('churchesPlanting') || 'Churches Planting',
                helpTitle: t('indicatorTitleChurchesPlanting'),
                helpMessage: t('indicatorInfoChurchesPlanting'),
              },
              {
                icon: require('../../../../app/assets/images/icon/cell-group.png'),
                value: '50%',
                label: t('churchesWithCgs') || 'Churches with CGs',
                helpTitle: t('indicatorTitleChurchesWithCgs'),
                helpMessage: t('indicatorInfoChurchesWithCgs'),
              },
              {
                icon: require('../../../../app/assets/images/icon/education.png'),
                value: '30%',
                label: t('churchesWithGtLiw') || 'Churches with GT/LIW',
                helpTitle: t('indicatorTitleChurchesWithGtLiw'),
                helpMessage: t('indicatorInfoChurchesWithGtLiw'),
              },
              {
                icon: require('../../../../app/assets/images/icon/worldwide-currency.png'),
                value: '20%',
                label: t('churchesWithMfp') || 'Churches with MFP',
                helpTitle: t('indicatorTitleChurchesWithMfp'),
                helpMessage: t('indicatorInfoChurchesWithMfp'),
              },
              {
                icon: require('../../../../app/assets/images/icon/worldwide.png'),
                value: '30%',
                label: t('churchesVisited') || 'Churches Visited',
                helpTitle: t('indicatorTitleChurchesVisited'),
                helpMessage: t('indicatorInfoChurchesVisited'),
              },
              {
                icon: require('../../../../app/assets/images/icon/more.png'),
                value: '10%',
                label: t('moreChurches') || 'More Churches',
                helpTitle: t('indicatorTitleMoreChurches'),
                helpMessage: t('indicatorInfoMoreChurches'),
              },
              {
                icon: require('../../../../app/assets/images/icon/offerings.png'),
                value: '25%',
                label: t('churchesWithTithesOfferings') || 'Churches with Tithes & Offerings',
                helpTitle: t('indicatorTitleChurchesWithTithesOfferings'),
                helpMessage: t('indicatorInfoChurchesWithTithesOfferings'),
              },
            ] as Array<{
              icon: any;
              value: string;
              label: string;
              helpTitle?: string;
              helpMessage?: string;
            }>
          )
            .slice(0, showLocalAllStats ? 12 : 4)
            .map((stat, index) => (
              <DashboardStatCard key={index} {...stat} />
            ))}
        </Animated.View>

        {true && (
          <TouchableOpacity
            onPress={toggleLocalShowAllStats}
            style={dashboardStyles.viewMoreButton}>
            <Text
              style={[
                dashboardStyles.viewMoreText,
                {color: C.textSecondary, fontSize: fs(12)},
              ]}>
              {showLocalAllStats ? `${t('viewLess')} ` : `${t('viewMore')} `}
              <Animated.Image
                source={icons.iconDown}
                style={{
                  width: ws(12),
                  height: ws(12),
                  marginLeft: ms(4),
                  transform: [{rotate: arrowRotate}],
                }}
              />
            </Text>
          </TouchableOpacity>
        )}

        <View style={{marginTop: ms(8)}}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: ms(12),
                  paddingHorizontal: 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
                {
                  borderBottomColor: C.border,
                  opacity: item?.disabled ? 0.5 : 1,
                },
              ]}
              onPress={() => {
                if (!item?.disabled) {
                  handleMenuItemPress(item);
                }
              }}
              disabled={!!item?.disabled}
              activeOpacity={item?.disabled ? 1 : 0.7}>
              <Image
                source={item.icon}
                style={{
                  width: ws(23),
                  height: hs(23),
                  marginRight: ms(12),
                  resizeMode: 'contain',
                }}
              />
              <Text style={[{flex: 1}, {color: C.textPrimary, fontSize: fs(14)}]}>
                {item.label}
              </Text>
              <Image
                source={require('../../../../app/assets/images/icon-down.png')}
                style={localStyles.menuArrow}
              />
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
    padding: ms(16),
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: rs(12),
    paddingVertical: ms(8),
    paddingHorizontal: ms(8),
  },
  modalItem: {
    paddingVertical: ms(12),
    paddingHorizontal: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  menuArrow: {
    width: ws(12),
    height: ws(12),
    transform: [{ rotate: '-90deg' }],
  },
  modalItemText: {
    fontSize: fs(14),
    color: '#111',
  },
});