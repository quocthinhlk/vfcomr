import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Platform, Animated, Easing, Modal, Alert, PermissionsAndroid } from 'react-native';
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
// CameraRoll is provided by '@react-native-camera-roll/camera-roll' at runtime.
// We import it via require to avoid TypeScript type issues if types are missing
// and support both CommonJS and ES module builds.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CameraRollModule = require('@react-native-camera-roll/camera-roll');
const CameraRoll = CameraRollModule.default || CameraRollModule;

// Helper function to decode HTML entities (e.g., &#x20ab; -> ₫)
const decodeHtmlEntity = (str: string): string => {
  if (!str) return '';
  
  // Decode hex entities like &#x20ab;
  const hexEntityRegex = /&#x([0-9a-fA-F]+);/g;
  str = str.replace(hexEntityRegex, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Decode decimal entities like &#8363;
  const decimalEntityRegex = /&#(\d+);/g;
  str = str.replace(decimalEntityRegex, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  return str;
};

// Helper function to format number to millions (M) format
// e.g., 5428000 => 5.43M, 43531000 => 43.51M
const formatNumberToM = (num: number): string => {
  if (num === 0) return '0';
  if (num < 1000000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  
  const millions = num / 1000000;
  // Round to 2 decimal places and remove trailing zeros
  return parseFloat(millions.toFixed(2)).toString() + 'M';
};

// Stats data will be populated from API
const getStatsData = (dashboardData: any, t?: (k: string) => string) => {
  if (!dashboardData?.dashboard_indicators) return [];
  
  const indicators = dashboardData.dashboard_indicators;
  const currencySymbol = decodeHtmlEntity(indicators.currency_symbol_code || '');
  const avgMonthlyGivingLocal = indicators.avg_monthly_giving || 0;
  const avgMonthlyGivingUsd = indicators.avg_monthly_giving_in_usd || 0;
  const avgMonthlyMfpGivingLocal = indicators.avg_monthly_mfp_giving || 0;
  const avgMonthlyMfpGivingUsd = indicators.avg_monthly_mfp_giving_in_usd || 0;
  
  return [
    { icon: require('../../../../app/assets/images/people.png'), value: `${(indicators.avg_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: t ? t('people') : 'People' },
    { icon: require('../../../../app/assets/images/growth.png'), value: `${(indicators.growth || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('growth') : 'Growth' },
    { 
      icon: require('../../../../app/assets/images/giving.png'), 
      value: `${currencySymbol} ${formatNumberToM(avgMonthlyGivingLocal)}`,
      secondaryValue: avgMonthlyGivingUsd
        ? `USD $${formatNumberToM(avgMonthlyGivingUsd)}`
        : undefined,
      label: t ? t('givingTithes') : 'Giving Tithes' 
    },
    { icon: require('../../../../app/assets/images/plant.png'), value: `${(indicators.total_church_plants || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: t ? t('churchPlants') : 'Church Plants' },
    { 
      icon: require('../../../../app/assets/images/icon/worldwide-currency.png'),
      value: `${currencySymbol} ${formatNumberToM(avgMonthlyMfpGivingLocal)}`,
      secondaryValue: avgMonthlyMfpGivingUsd
        ? `USD $${formatNumberToM(avgMonthlyMfpGivingUsd)}`
        : undefined,
      label: t ? t('givingMfp') : 'Giving MFP'
    },
    { icon: require('../../../../app/assets/images/cellgroup.png'), value: `${(indicators.avg_cell_group_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('peopleInCgs') : 'People in CG’s' },
    { icon: require('../../../../app/assets/images/icon/education.png'), value: `${(indicators.avg_liw_students || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`, label: t ? t('peopleInGtLiw') : 'People in GT & LIW' },
    { icon: require('../../../../app/assets/images/cellgroup.png'), value: `${(indicators.avg_new_decisions || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: t ? t('newDecisions') : 'New Decisions' },
  ];
};

const menuItems = [
  { icon: require('../../../../app/assets/images/icon/chart.png'), label: 'Monthly Data', routeName: 'WeeklyReport', disabled: true },
  { icon: require('../../../../app/assets/images/icon/edit.png'), label: 'Edit Church', routeName: 'EditChurch', disabled: true },
  { icon: require('../../../../app/assets/images/icon/worship.png'), label: 'Worship Services', routeName: 'EnterVisits', disabled: true },
  { icon: require('../../../../app/assets/images/icon/house-user.png'), label: 'New Pastor & New Church', routeName: 'NewPastorAndChurch' },
  { icon: require('../../../../app/assets/images/icon/user.png'), label: 'New Pastor', routeName: 'AddUser' },
  { icon: require('../../../../app/assets/images/icon/home.png'), label: 'New Church', routeName: 'AddChurch' },
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
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
      setLogoError(false);
      const res = await api.get('dashboard', { params: { church_id: church?.id } });
      const data = res?.data?.data;
      if (data) {
        // use top-level formatLastRecord
        console.log('church_region_logo_url (selected church):', data.dashboard_info?.church_region_logo_url);
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
          
          console.log('church_region_logo_url:', dashboardData.dashboard_info?.church_region_logo_url);
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

  const handleDownloadImage = async () => {
    if (!selectedImage) return;
    try {
      if (Platform.OS === 'android') {
        // Request permission on Android if needed
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          );
        } catch {
          // ignore, CameraRoll will fail gracefully if no permission
        }
      }

      // Save remote URL directly to system gallery / photos
      await CameraRoll.save(selectedImage, { type: 'photo' });

      Alert.alert(t('success'), t('imageDownloadSuccess'));
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert(t('error'), t('imageDownloadError'));
    }
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
              {dashboardData?.dashboard_info?.church_region_logo_url && 
               dashboardData.dashboard_info.church_region_logo_url.trim() !== '' && 
               !logoError ? (
                <Image 
                  source={{ uri: dashboardData.dashboard_info.church_region_logo_url }} 
                  style={styles.logoImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('Logo image error:', error.nativeEvent.error);
                    console.log('Failed URL:', dashboardData.dashboard_info.church_region_logo_url);
                    setLogoError(true);
                  }}
                  onLoad={() => {
                    console.log('Logo loaded successfully:', dashboardData.dashboard_info.church_region_logo_url);
                  }}
                />
              ) : (
                <Image 
                  source={require('../../../../app/assets/images/logo/vfc_white.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
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
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setSelectedImage(userProfile.bannerImage);
                setImageModalVisible(true);
              }}
            >
              <Image
                source={{ uri: userProfile.bannerImage }}
                style={styles.bannerImage}
                onError={() => setBannerError(true)}
              />
            </TouchableOpacity>
          ) : (
            <Image source={require('../../../../app/assets/images/blank-cover.png')} style={styles.bannerImage} />
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!userProfile.profileImage || profileError}
            onPress={() => {
              if (userProfile.profileImage && !profileError) {
                setSelectedImage(userProfile.profileImage);
                setImageModalVisible(true);
              }
            }}
          >
            {userProfile.profileImage && !profileError ? (
              <Image
                source={{ uri: userProfile.profileImage }}
                style={styles.profileImage}
                onError={() => setProfileError(true)}
              />
            ) : (
              <Image
                source={require('../../../../app/assets/images/blank-avatar.png')}
                style={styles.profileImage}
              />
            )}
          </TouchableOpacity>
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
              <Image source={require('../../../../app/assets/images/icon/arrow-down-bold.png')} style={[styles.dropdownIcon, { tintColor: C.textPrimary }]} />
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
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>{t('yourOtherChurches')}</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setOrgModalVisible(false)}>
                  <Text style={[styles.modalCloseText, { color: C.textPrimary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {(dashboardData?.assigned_churches || []).map((ch: any) => (
                  <TouchableOpacity
                    key={String(ch.id)}
                    style={[styles.modalItemRow, { borderBottomColor: C.border }]}
                    onPress={() => handleSelectAssignedChurch(ch)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, { color: C.textPrimary }]}>{ch.name}</Text>
                    <Text style={[styles.modalItemChevron, { color: C.textSecondary }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Fullscreen Image Modal */}
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.fullImageBackdrop}>
            <View style={styles.fullImageHeader}>
              <TouchableOpacity onPress={() => setImageModalVisible(false)}>
                <Text style={styles.fullImageCloseText}>✕</Text>
              </TouchableOpacity>
              {selectedImage ? (
                <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadImage}>
                  <Text style={styles.downloadButtonText}>{t('download')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.fullImageContent}
              activeOpacity={1}
              onPress={() => setImageModalVisible(false)}
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              ) : null}
            </TouchableOpacity>
          </View>
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
    width: 40,
    height: 40,
  },
  bannerContainer: {
    position: 'relative',
    height: 200,
    marginHorizontal: 16,
    marginBottom: 20,
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
    borderColor: '#C4C4C4',
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
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 15,
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
    fontSize: 13,
    color: '#000',
    textAlign: 'left',
    flex: 1,
  },
  lastRecordContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lastRecordLabel: {
    fontSize: 10,
    color: '#000',
    lineHeight: 14,
    includeFontPadding: false,
  },
  lastRecordValue: {
    fontSize: 10,
    color: '#c00000',
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
    fontSize: 13,
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
    width: 17,
    height: 17,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
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
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  fullImageCloseText: {
    color: '#fff',
    fontSize: 22,
  },
  downloadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  fullImageContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
