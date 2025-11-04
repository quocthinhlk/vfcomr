import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Platform, Animated, Easing, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Popover, MenuItem as UIKittenMenuItem, Button } from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../../auth/services/auth.service';
import { AuthContext } from '../../../config/navigation';
import { MenuPopup } from '../../../shared/components/MenuPopup';
import { useLanguage } from '../../../shared/context/LanguageContext';
import { CommonMenuItem } from '../../../shared/interfaces/MenuItem';
import { HamburgerMenuIcon } from '../../../shared/components/HamburgerMenuIcon';
import { COLORS } from '../../../shared/constants/colors';
import { dashboardStyles } from '../styles';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { dashboardActions, dashboardIcons, dashboardMenuItems, dashboardStats, getTranslatedMenuItems } from '../../../shared/config/dashboard.constants';
import api from '../../../config/api';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';

// Stats data will be populated from API
const getStatsData = (dashboardData: any, t?: (k: string) => string) => {
  if (!dashboardData?.dashboard_indicators) return [];
  
  const indicators = dashboardData.dashboard_indicators;
  return [
    { icon: require('../../../../app/assets/images/people.png'), value: `${(indicators.avg_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('people') : 'People' },
    { icon: require('../../../../app/assets/images/growth.png'), value: `${(indicators.growth || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('growth') : 'Growth' },
    { 
      icon: require('../../../../app/assets/images/giving.png'), 
      value: `${indicators.currency_code || ''} ${(indicators.avg_monthly_giving || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, 
      label: t ? t('givingTithes') : 'Giving Tithes' 
    },
    { icon: require('../../../../app/assets/images/plant.png'), value: `${(indicators.total_church_plants || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('churchPlants') : 'Church Plants' },
    { 
      icon: require('../../../../app/assets/images/giving.png'),
      value: `${indicators.currency_code || ''} ${(indicators.avg_monthly_mfp_giving || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      label: t ? t('givingMfp') : 'Giving MFP'
    },
    { icon: require('../../../../app/assets/images/cellgroup.png'), value: `${(indicators.avg_cell_group_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('peopleInCgs') : 'People in CG’s' },
    { icon: require('../../../../app/assets/images/cellgroup.png'), value: `${(indicators.avg_liw_students || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('peopleInGtLiw') : 'People in GT & LIW' },
    { icon: require('../../../../app/assets/images/cellgroup.png'), value: `${(indicators.avg_new_decisions || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('newDecisions') : 'New Decisions' },
  ];
};

const menuItems = [
  { icon: require('../../../../app/assets/images/icon/growth.png'), label: 'Monthly Data', routeName: 'WeeklyReport', disabled: true },
  { icon: require('../../../../app/assets/images/icon/edit.png'), label: 'Edit Church', routeName: 'EditChurch', disabled: true },
  { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'Worship Services', routeName: 'EnterVisits', disabled: true },
  { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'New Pastor & New Church', routeName: 'NewPastorAndChurch' },
  { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'New Pastor', routeName: 'AddUser' },
  { icon: require('../../../../app/assets/images/icon/plus.png'), label: 'New Church', routeName: 'AddChurch' },
];

export default function DashboardPastorLeaderScreen() {
  const navigation = useNavigation<any>();
  const { setIsAuthenticated } = useContext(AuthContext);
  const { selectedLanguage, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const C = useThemedColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const { showAllStats, toggleShowAllStats, icons } = useDashboardStats();
  const rotation = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [orgModalVisible, setOrgModalVisible] = useState(false);

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: showAllStats ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showAllStats]);

  const arrowRotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const localeMap: Record<string, string> = { en: 'en', pt: 'pt', es: 'es', fr: 'fr', zh: 'zh', ms: 'ms', ja: 'ja' };
  const formatLastRecord = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const month = new Intl.DateTimeFormat(localeMap[selectedLanguage as string] || 'en', { month: 'long' }).format(date);
    const year = date.getFullYear();
    return `${month}, ${year}`;
  };

  const handleToggleStats = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 8, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      toggleShowAllStats();
      translateY.setValue(-8);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const handleSelectAssignedChurch = async (church: any) => {
    try {
      setOrgModalVisible(false);
      setLoading(true);
      setBannerError(false);
      setProfileError(false);
      const res = await api.get('dashboard', { params: { church_id: church?.id } });
      const data = res?.data?.data;
      if (data) {
        // use top-level formatLastRecord
        setDashboardData(data);
        setUserProfile((prev: any) => ({
          ...(prev || {}),
          name: prev?.name || '',
          organization: data.dashboard_info?.church_name || church?.name || '',
          location: data.dashboard_info?.country_name || '',
          lastRecord: formatLastRecord(data.dashboard_info?.last_report_date || ''),
          profileImage: (prev && prev.profileImage) || '',
          bannerImage: data.dashboard_info?.photo_url || '',
        }));
      }
    } catch (e) {
      // keep current data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [userRes, dashboardRes] = await Promise.all([
          api.get('users/me'),
          api.get('dashboard')
        ]);
        if (!mounted) return;
        
        const userData = userRes?.data?.data;
        const dashboardData = dashboardRes?.data?.data;
        
        if (userData && dashboardData) {
          // Format last report date to localized "Month, yyyy" format (moved to top-level function)
          
          // Store user ID for navigation
          if (typeof userData.id === 'number') {
            setCurrentUserId(userData.id);
          }

          setUserProfile({
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            organization: dashboardData.dashboard_info?.church_name || '',
            location: dashboardData.dashboard_info?.country_name || '',
            profileImage: userData.photo_url || '',
            bannerImage: dashboardData.dashboard_info?.photo_url || '',
          });
          
          setDashboardData(dashboardData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  const handleMenuItemPress = (item: any) => {
    if (item.routeName) {
      navigation.navigate(item.routeName);
    } else if (item.label === 'Logout') {
      handleLogout();
    }
    setMenuVisible(false);
  };

  const handleChangeLanguage = (lang: string) => {
    setLanguage(lang);
  };

  const allStats = getStatsData(dashboardData, t as any);
  const visibleStats = showAllStats ? allStats : allStats.slice(0, 4);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.textPrimary }}>{t('loading')}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.textPrimary }}>{t('failedToLoadUserData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <ScrollView style={styles.scrollView}>
        {/* Header with Logo and Menu */}
        <View style={[styles.header, { backgroundColor: C.background }]}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              {dashboardData?.dashboard_info?.church_region_logo_url && !logoError ? (
                <Image 
                  source={{ uri: dashboardData.dashboard_info.church_region_logo_url }} 
                  style={styles.logoImage}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Image 
                  source={require('../../../../app/assets/images/logo/vfc_white.png')} 
                  style={styles.logoImage}
                />
              )}
            </View>
          </View>
          <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
          <MenuPopup
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            menuItems={getTranslatedMenuItems(selectedLanguage as any)}
            onMenuItemPress={handleMenuItemPress}
            onLogout={handleLogout}
            onChangeLanguage={handleChangeLanguage}
            selectedLanguage={selectedLanguage}
          />
        </View>

        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          {userProfile.bannerImage && !bannerError ? (
            <Image source={{ uri: userProfile.bannerImage }} style={styles.bannerImage} onError={() => setBannerError(true)} />
          ) : (
            <Image source={require('../../../../app/assets/images/blank-cover.png')} style={styles.bannerImage} />
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {userProfile.profileImage && !profileError ? (
            <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} onError={() => setProfileError(true)} />
          ) : (
            <Image source={require('../../../../app/assets/images/blank-avatar.png')} style={styles.profileImage} />
          )}
          <View style={styles.profileInfo}>
            <TouchableOpacity
              onPress={() => {
                if (currentUserId) {
                  navigation.navigate('User', { userId: currentUserId });
                }
              }}
              activeOpacity={0.7}
              disabled={!currentUserId}
            >
              <Text style={[styles.profileName, { color: C.textPrimary }]}>{userProfile.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.organizationRow} onPress={() => setOrgModalVisible(true)}>
              <Text style={[styles.organizationText, { color: C.textPrimary }]}>{userProfile.organization}</Text>
              <Image source={require('../../../../app/assets/images/icon-down.png')} style={[styles.dropdownIcon, { tintColor: C.textPrimary }]} />
            </TouchableOpacity>
            <View style={styles.locationRow}>
              <Text style={[styles.locationText, { color: C.textSecondary }]}>{userProfile.location}</Text>
              <View style={styles.lastRecordContainer}>
                <Text style={[styles.lastRecordLabel, { color: C.textPrimary }]}>{t('lastMonthlyRecord')}: </Text>
                <Text style={styles.lastRecordValue}>{formatLastRecord(dashboardData?.dashboard_info?.last_report_date || '')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Assigned Churches Modal */}
        <Modal visible={orgModalVisible} transparent animationType="fade" onRequestClose={() => setOrgModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={() => setOrgModalVisible(false)}>
            <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>{t('church')}</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setOrgModalVisible(false)}>
                  <Text style={[styles.modalCloseText, { color: C.textPrimary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {(dashboardData?.assigned_churches || []).map((ch: any) => (
                  <TouchableOpacity key={String(ch.id)} style={[styles.modalItemRow, { borderBottomColor: C.border }]} onPress={() => handleSelectAssignedChurch(ch)} activeOpacity={0.7}>
                    <Text style={[styles.modalItemText, { color: C.textPrimary }]} numberOfLines={1}>{ch.name}</Text>
                    <Text style={[styles.modalItemChevron, { color: C.textSecondary }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Animated.View style={[dashboardStyles.statCardContainer, { paddingHorizontal: 15, opacity: fade, transform: [{ translateY }] }]}>
          {visibleStats.map((stat, index) => (
            <DashboardStatCard key={index} {...stat} />
          ))}
        </Animated.View>

        {allStats.length > 4 && (
          <TouchableOpacity onPress={handleToggleStats} style={styles.viewMoreButton}>
            <Text style={[styles.viewMoreText, { color: C.textSecondary }]}>
              {showAllStats ? `${t('viewLess')} ` : `${t('viewMore')} `}
              <Animated.Image source={icons.iconDown} style={[styles.viewMoreIcon, { transform: [{ rotate: arrowRotate }] }]} />
            </Text>
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { borderBottomColor: C.border }, item.disabled ? { opacity: 0.5 } : null]}
              onPress={() => { if (!item.disabled) handleMenuItemPress(item); }}
              activeOpacity={item.disabled ? 1 : 0.7}
            >
              <Image source={item.icon} style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { color: C.textPrimary }]}>
                {item.label === 'Monthly Data' ? t('monthlyData') :
                 item.label === 'Edit Church' ? t('editChurch') :
                 item.label === 'Worship Services' ? t('worshipServices') :
                 item.label === 'New Pastor & New Church' ? t('addNewChurchAndPastor') :
                 item.label === 'New Pastor' ? t('addNewPastor') :
                 item.label === 'New Church' ? t('addNewChurch') : item.label}
              </Text>
              <Image source={require('../../../../app/assets/images/icon-down.png')} style={styles.menuArrow} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    height: 40,
    resizeMode: 'contain',
  },
  bannerContainer: {
    position: 'relative',
    height: 200,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    marginTop: -80,
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 10,
    marginBottom: 12,
    marginLeft: 10,
  },
  profileInfo: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 0,
    marginLeft: 0,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
    textAlign: 'left',
  },
  organizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  organizationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 4,
    flexShrink: 1,
  },
  dropdownIcon: {
    width: 15,
    height: 15,
    tintColor: '#000',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    flex: 1,
  },
  lastRecordContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lastRecordLabel: {
    fontSize: 14,
    color: '#000',
    lineHeight: 14,
    includeFontPadding: false,
  },
  lastRecordValue: {
    fontSize: 14,
    color: COLORS.danger,
    lineHeight: 14,
    includeFontPadding: false,
    // fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  viewMoreButton: {
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreIcon: {
    width: 12,
    height: 12,
    marginLeft: 4,
  },
  menuContainer: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  menuArrow: {
    width: 12,
    height: 12,
    transform: [{ rotate: '-90deg' }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '70%',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  modalClose: { paddingHorizontal: 8, paddingVertical: 4 },
  modalCloseText: { fontSize: 18, color: '#111' },
  modalList: { paddingVertical: 4 },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemText: { fontSize: 16, flex: 1, color: '#111' },
  modalItemChevron: { fontSize: 18, marginLeft: 8, color: '#6b7280' },
});
