import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Platform, Animated, Easing, Modal, Alert, PermissionsAndroid, Text as RNText, ActivityIndicator } from 'react-native';
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
import { useThemeMode } from '../../../shared/context/ThemeContext';
import { Col, Row, Grid } from 'react-native-easy-grid';
import RNFS from 'react-native-fs';
import { fs, ws, hs, ms, rs } from '../../../shared/utils/scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
// CameraRoll is provided by '@react-native-camera-roll/camera-roll' at runtime.
// The library exports `CameraRoll` as a named export in recent versions,
// so we resolve it from `.CameraRoll` first, then fall back to default/CommonJS.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CameraRollModule = require('@react-native-camera-roll/camera-roll');
const CameraRoll: any =
  CameraRollModule.CameraRoll || CameraRollModule.default || CameraRollModule;

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

const REQUEST_TIMEOUT_MS = 15000;

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS) => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('REQUEST_TIMEOUT'));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
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

  const tr = (key: string, fallback: string) => (t ? t(key) : fallback);
  
  return [
    {
      icon: require('../../../../app/assets/images/people.png'),
      value: `${(indicators.avg_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      label: tr('people', 'People'),
      helpMessage: tr('statInfoPeople', 'The average service attendance over the last 3 months'),
    },
    {
      icon: require('../../../../app/assets/images/growth.png'),
      value: `${(indicators.growth || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`,
      label: tr('growth', 'Growth'),
      helpMessage: tr('statInfoGrowth', 'The % growth, compared to the same 3 months last year'),
    },
    { 
      icon: require('../../../../app/assets/images/icon/dollar-bill.png'), 
      value: `${currencySymbol} ${formatNumberToM(avgMonthlyGivingLocal)}`,
      secondaryValue: avgMonthlyGivingUsd
        ? `USD $${formatNumberToM(avgMonthlyGivingUsd)}`
        : undefined,
      label: tr('giving', 'Giving'),
      helpMessage: tr('statInfoGiving', 'The average tithes and offerings giving over the last 3 months'),
    },
    {
      icon: require('../../../../app/assets/images/icon/access.png'),
      value: `${(indicators.total_church_plants || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      label: tr('churchPlants', 'Church Plants'),
      helpTitle: tr('statInfoChurchPlantsTitle', 'Church Planting'),
      helpMessage: tr(
        'statInfoChurchPlants',
        'The number of new churches pioneered by this mother church, in the last 3 years'
      ),
    },
    { 
      icon: require('../../../../app/assets/images/icon/worldwide-currency.png'),
      value: `${currencySymbol} ${formatNumberToM(avgMonthlyMfpGivingLocal)}`,
      secondaryValue: avgMonthlyMfpGivingUsd
        ? `USD $${formatNumberToM(avgMonthlyMfpGivingUsd)}`
        : undefined,
      label: tr('givingMfp', 'Giving MFP'),
      helpTitle: tr('statInfoGivingMfpTitle', 'Missions Giving'),
      helpMessage: tr(
        'statInfoGivingMfp',
        'The average Missions Faith Pledge giving and missions giving over the last 3 months. This should include any giving from the churches general fund. Many churches give a % of their income to missions'
      ),
    },
    {
      icon: require('../../../../app/assets/images/cellgroup.png'),
      value: `${(indicators.avg_cell_group_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`,
      label: tr('peopleInCgs', 'People in CG’s'),
      helpMessage: tr(
        'statInfoPeopleInCgs',
        'The average Connect Group (Cell Group) attendance over the last 3 months, as a % of the average, adult and youth, weekly service attendance'
      ),
    },
    {
      icon: require('../../../../app/assets/images/icon/angel.png'),
      value: `${(indicators.avg_new_decisions || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      label: tr('newDecisions', 'New Decisions'),
      helpMessage: tr(
        'statInfoNewDecisions',
        'The number of New Decisions for Christ made over the last 3 Months'
      ),
    },
    {
      icon: require('../../../../app/assets/images/icon/education.png'),
      value: `${(indicators.avg_liw_students || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`,
      label: tr('peopleInGtLiw', 'People in GT/LIW'),
      helpMessage: tr(
        'statInfoPeopleInGtLiw',
        'The average Growth Track and Life In the Word class attendance over the last 3 months, as a % of the average, adult and youth, weekly service attendance'
      ),
    },
  ];
};

const menuItems = [
  { icon: require('../../../../app/assets/images/icon/chart.png'), label: 'Add Monthly Data', routeName: 'MonthlyDataSelect' },
  { icon: require('../../../../app/assets/images/icon/edit.png'), label: 'Edit Church', routeName: 'EditChurch' },
  { icon: require('../../../../app/assets/images/icon/worship1.png'), label: 'Worship Services', routeName: 'WorshipServices' },
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
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';
  const gradientBase = isDark ? '0,0,0' : '255,255,255';
  const [menuVisible, setMenuVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
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
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [churchPictureExpanded, setChurchPictureExpanded] = useState(false);
  const [churchPicturesLoading, setChurchPicturesLoading] = useState(false);
  const [churchPicturesLoaded, setChurchPicturesLoaded] = useState(false);
  const [churchPictures, setChurchPictures] = useState<string[]>([]);
  const [churchPicturesError, setChurchPicturesError] = useState<string | null>(null);
  const [organizationRowWidth, setOrganizationRowWidth] = useState(0);
  const [organizationFirstLineWidth, setOrganizationFirstLineWidth] = useState(0);
  const [organizationChevronLeft, setOrganizationChevronLeft] = useState(0);

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
    const locale = localeMap[selectedLanguage as string] || 'en';
    const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
    const year = date.getFullYear();
    return `${month} ${year}`;
  };
  const formatVerifiedDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const month = new Intl.DateTimeFormat(localeMap[selectedLanguage as string] || 'en', { month: 'long' }).format(date);
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const formatVisitedMonthYear = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const locale = localeMap[selectedLanguage as string] || 'en';
    const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
    const year = date.getFullYear();
    return `${month} ${year}`;
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
      setChurchPictureExpanded(false);
      setChurchPictures([]);
      setChurchPicturesLoaded(false);
      setChurchPicturesError(null);
      
      // Save selected church_id to AsyncStorage
      if (church?.id) {
        await AsyncStorage.setItem('selectedChurchId', String(church.id));
      }
      if (church?.name) {
        await AsyncStorage.setItem('selectedChurchName', String(church.name));
      }
      
      const res = await withTimeout(
        api.get('dashboard', { params: { church_id: church?.id } }),
      );
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
        // Load selected church_id from AsyncStorage
        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        const savedChurchName = await AsyncStorage.getItem('selectedChurchName');
        
        // Prepare dashboard API call with church_id if available
        const dashboardParams = savedChurchId ? { church_id: parseInt(savedChurchId, 10) } : undefined;
        
        const [userRes, dashboardRes] = await withTimeout(
          Promise.all([
            api.get('users/me'),
            api.get(
              'dashboard',
              dashboardParams ? { params: dashboardParams } : undefined,
            ),
          ]),
        );
        if (!mounted) return;
        
        const userData = userRes?.data?.data;
        const dashboardData = dashboardRes?.data?.data;
        
        if (userData && dashboardData) {
          // Format last report date to localized "Month, yyyy" format (moved to top-level function)
          
          // Store user ID for navigation
          if (typeof userData.id === 'number') {
            setCurrentUserId(userData.id);
          }
          
          // Store user role ID for menu filtering
          const roleId = userData?.role?.id;
          if (typeof roleId === 'number') {
            setCurrentUserRoleId(roleId);
          }

          // Auto-save church_id to AsyncStorage if not already saved
          if (!savedChurchId) {
            // Prefer dashboard_info for initial default selection
            const dashboardChurchId = dashboardData?.dashboard_info?.church_id;
            if (dashboardChurchId && typeof dashboardChurchId === 'number') {
              await AsyncStorage.setItem('selectedChurchId', String(dashboardChurchId));
              console.log('Auto-saved church_id from dashboard:', dashboardChurchId);
              if (!savedChurchName && dashboardData?.dashboard_info?.church_name) {
                await AsyncStorage.setItem('selectedChurchName', String(dashboardData.dashboard_info.church_name));
              }
            } else {
              // Fallback to userData if dashboard_info is missing
              const userChurchId = userData?.church_id;
              if (userChurchId && typeof userChurchId === 'number') {
                await AsyncStorage.setItem('selectedChurchId', String(userChurchId));
                console.log('Auto-saved church_id from userData:', userChurchId);
                if (!savedChurchName && userData?.church_name) {
                  await AsyncStorage.setItem('selectedChurchName', String(userData.church_name));
                }
              }
            }
          } else if (!savedChurchName) {
            const dashboardChurchName = dashboardData?.dashboard_info?.church_name;
            if (dashboardChurchName) {
              await AsyncStorage.setItem('selectedChurchName', String(dashboardChurchName));
            }
          }

          setUserProfile({
            prefix: userData.prefix || '',
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            title: userData.title || '',
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
      // Remove selected church_id from AsyncStorage on logout
      await AsyncStorage.removeItem('selectedChurchId');
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setMenuVisible(false);
    }
  };


  const handleMenuItemPress = async (item: any) => {
    if (item.routeName) {
      // Handle Edit Church navigation with church_id
      if (item.routeName === 'EditChurch') {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          if (savedChurchId) {
            const churchId = parseInt(savedChurchId, 10);
            if (!isNaN(churchId)) {
              navigation.navigate('EditChurch', { id: churchId });
            } else {
              Alert.alert(t('error') || 'Error', t('invalidChurchId') || 'Invalid Church ID');
            }
          } else {
            Alert.alert(t('error') || 'Error', t('churchIdNotFound') || 'Church ID not found');
          }
        } catch (error) {
          console.error('Error getting church ID:', error);
          Alert.alert(t('error') || 'Error', t('failedToLoadData') || 'Failed to get Church ID');
        }
      } else if (item.routeName === 'MonthlyDataSelect') {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          if (!savedChurchId) {
            const dashboardChurchId = dashboardData?.dashboard_info?.church_id;
            if (dashboardChurchId && typeof dashboardChurchId === 'number') {
              await AsyncStorage.setItem('selectedChurchId', String(dashboardChurchId));
              if (dashboardData?.dashboard_info?.church_name) {
                await AsyncStorage.setItem('selectedChurchName', String(dashboardData.dashboard_info.church_name));
              }
            }
          }
        } catch (error) {
          console.error('Error setting default church ID:', error);
        } finally {
          navigation.navigate(item.routeName);
        }
      } else if (item.routeName === 'ChurchAttendanceChart') {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          const parsedChurchId = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
          if (!isNaN(parsedChurchId) && parsedChurchId > 0) {
            navigation.navigate('ChurchAttendanceChart', {churchId: parsedChurchId});
          } else {
            navigation.navigate('ChurchAttendanceChart');
          }
        } catch (error) {
          console.error('Error getting selected church ID for attendance chart:', error);
          navigation.navigate('ChurchAttendanceChart');
        }
      } else if (item.routeName === 'ChurchGivingChart') {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          const parsedChurchId = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
          if (!isNaN(parsedChurchId) && parsedChurchId > 0) {
            navigation.navigate('ChurchGivingChart', {churchId: parsedChurchId});
          } else {
            navigation.navigate('ChurchGivingChart');
          }
        } catch (error) {
          console.error('Error getting selected church ID for chart:', error);
          navigation.navigate('ChurchGivingChart');
        }
      } else {
        navigation.navigate(item.routeName);
      }
    } else if (item.label === 'Logout') {
      handleLogout();
    }
    setMenuVisible(false);
  };

  const handleChangeLanguage = (lang: string) => {
    setLanguage(lang);
  };

  const extractChurchPictures = (payload: any): string[] => {
    const data = payload?.data?.data ?? payload?.data ?? payload;
    const sources = [
      data?.photos,
      data?.images,
      data?.church_pictures,
      data?.church_images,
      data?.gallery,
      data?.photo_urls,
      data?.pictures,
    ];
    const fromArrays = sources.flatMap((source: any) => {
      if (!Array.isArray(source)) return [];
      return source
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (!item || typeof item !== 'object') return '';
          return item.url || item.photo_url || item.image_url || item.image || item.path || '';
        })
        .filter((url: string) => typeof url === 'string' && url.trim() !== '');
    });
    const single = typeof data?.photo_url === 'string' ? [data.photo_url] : [];
    return Array.from(new Set([...fromArrays, ...single]));
  };

  const getCurrentChurchId = async (): Promise<number | null> => {
    try {
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      if (savedChurchId) {
        const parsed = parseInt(savedChurchId, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (error) {
      console.log('Failed to read selectedChurchId:', error);
    }
    const dashboardChurchId = dashboardData?.dashboard_info?.church_id;
    return typeof dashboardChurchId === 'number' ? dashboardChurchId : null;
  };

  const handleToggleChurchPictures = async () => {
    const nextExpanded = !churchPictureExpanded;
    setChurchPictureExpanded(nextExpanded);
    if (!nextExpanded || churchPicturesLoaded || churchPicturesLoading) {
      return;
    }
    try {
      setChurchPicturesLoading(true);
      setChurchPicturesError(null);
      const churchId = await getCurrentChurchId();
      if (!churchId) {
        setChurchPictures([]);
        setChurchPicturesLoaded(true);
        return;
      }
      const response = await api.get(`churches/${churchId}`);
      const pictureUrls = extractChurchPictures(response);
      setChurchPictures(pictureUrls);
      setChurchPicturesLoaded(true);
    } catch (error) {
      console.error('Failed to load church pictures:', error);
      setChurchPicturesError(t('failedToLoadData'));
    } finally {
      setChurchPicturesLoading(false);
    }
  };

  useEffect(() => {
    const churchId = dashboardData?.dashboard_info?.church_id;
    if (!churchId || churchPicturesLoaded || churchPicturesLoading) return;
    let mounted = true;
    (async () => {
      try {
        setChurchPicturesLoading(true);
        setChurchPicturesError(null);
        const response = await api.get(`churches/${churchId}`);
        if (!mounted) return;
        const pictureUrls = extractChurchPictures(response);
        setChurchPictures(pictureUrls);
        setChurchPicturesLoaded(true);
      } catch {
        // silent fail – user can still manually expand to retry
      } finally {
        if (mounted) setChurchPicturesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [dashboardData]);

  const handleOrganizationTextLayout = (event: any) => {
    const lines = event?.nativeEvent?.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      return;
    }
    const firstLineWidth = Number(lines[0]?.width || 0);
    if (Math.abs(firstLineWidth - organizationFirstLineWidth) > 1) {
      setOrganizationFirstLineWidth(firstLineWidth);
    }
  };

  useEffect(() => {
    const iconWidth = ws(10);
    const desiredLeft = organizationFirstLineWidth + ms(4);
    const maxLeft = Math.max(0, organizationRowWidth - iconWidth);
    const nextLeft = Math.min(desiredLeft, maxLeft);
    if (!Number.isNaN(nextLeft) && Math.abs(nextLeft - organizationChevronLeft) > 1) {
      setOrganizationChevronLeft(nextLeft);
    }
  }, [organizationFirstLineWidth, organizationRowWidth]);

  useEffect(() => {
    // reset and let layout recalculate for new organization text
    setOrganizationFirstLineWidth(0);
    setOrganizationChevronLeft(0);
  }, [userProfile?.organization]);

  const handleDownloadImage = async () => {
    if (!selectedImage) return;
    try {
      
      // On both iOS and Android, CameraRoll works more reliably with local file paths.
      // We download the remote image to a temporary file, then save that file.
        const fileName = `dash-image-${Date.now()}.jpg`;
        const localPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

        const downloadRes = await RNFS.downloadFile({
          fromUrl: selectedImage,
          toFile: localPath,
        }).promise;

        if (downloadRes.statusCode && downloadRes.statusCode >= 200 && downloadRes.statusCode < 300) {
        // Use the local file path for CameraRoll.save
        await CameraRoll.save(`file://${localPath}`, { type: 'photo' });
        
        // Clean up the temporary file after saving
        try {
          await RNFS.unlink(localPath);
        } catch (cleanupError) {
          console.log('Failed to cleanup temp file:', cleanupError);
        }
        
        // Close image modal
        setImageModalVisible(false);
        
        // Show toast message instead of alert
        setToastVisible(true);
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // Auto hide after 3 seconds
        setTimeout(() => {
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setToastVisible(false);
          });
        }, 3000);
        } else {
          console.log('Download failed with status', downloadRes.statusCode);
          throw new Error('Failed to download image');
        }
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
            menuItems={getTranslatedMenuItems(selectedLanguage as any, currentUserRoleId ?? undefined)}
            onMenuItemPress={handleMenuItemPress}
            onLogout={handleLogout}
            onChangeLanguage={handleChangeLanguage}
            selectedLanguage={selectedLanguage}
          />
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Row 1: Organization + dropdown */}
          <TouchableOpacity
            style={styles.organizationRow}
            onPress={() => setOrgModalVisible(true)}
            onLayout={(event) => setOrganizationRowWidth(event.nativeEvent.layout.width)}
          >
            <RNText style={[styles.organizationText, { color: C.textPrimary }]} onTextLayout={handleOrganizationTextLayout}>
              {userProfile.organization}
            </RNText>
            <Image
              source={require('../../../../app/assets/images/icon/arrow-down-bold.png')}
              style={[
                styles.dropdownIcon,
                {
                  tintColor: C.textPrimary,
                  left: organizationChevronLeft,
                },
              ]}
            />
          </TouchableOpacity>

          {/* Row 2-3: Location left | Last Report + Verification right */}
          <View style={styles.locationRow}>
            <Text style={[styles.locationText, { color: C.textSecondary }]}>{userProfile.location}</Text>
            <View style={styles.reportVerifyColumn}>
              {dashboardData?.dashboard_info && (
                dashboardData.dashboard_info.is_verified ? (
                  <Text style={[styles.verificationText, { color: '#1e7e34' }]}>
                    {'\u2714\uFE0E'} {t('visited')} {formatVisitedMonthYear(dashboardData.dashboard_info.verified_date || '')} by {dashboardData.dashboard_info.verified_by_user_name || ''}
                  </Text>
                ) : (
                  <Text style={[styles.verificationText, { color: '#c0392b' }]}>
                    {t('needsVerificationVisit')}
                  </Text>
                )
              )}
              <Text style={styles.lastRecordDate} numberOfLines={1}>
                {`${t('lastMonthlyRecord')}: `}
                <Text style={styles.lastRecordDateValue}>
                  {formatLastRecord(dashboardData?.dashboard_info?.last_report_date || '')}
                </Text>
              </Text>
            </View>
          </View>

          {/* Row 4: Avatar (left) + Name (right) */}
          <View style={styles.namePhotoRow}>
            {/* Avatar — tappable to view full image */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.avatarWrapper}
              disabled={!userProfile.profileImage || profileError}
              onPress={() => {
                if (userProfile.profileImage && !profileError) {
                  setSelectedImage(userProfile.profileImage);
                  setImageModalVisible(true);
                }
              }}
            >
              <View style={[styles.avatarRing, { borderColor: COLORS.mainColor + '55' }]}>
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
              </View>
            </TouchableOpacity>

            {/* Name & title — tappable to view profile */}
            <TouchableOpacity
              onPress={() => { if (currentUserId) navigation.navigate('User', { userId: currentUserId }); }}
              activeOpacity={0.7}
              disabled={!currentUserId}
              style={styles.nameBlock}
            >
              <Text style={styles.profileNameLink} numberOfLines={2}>
                {userProfile.prefix ? `${userProfile.prefix} ${userProfile.name}` : userProfile.name}
              </Text>
              {userProfile.title ? (
                <Text style={[styles.titleText, { color: C.textSecondary }]} numberOfLines={1}>
                  {userProfile.title}
                </Text>
              ) : null}
            </TouchableOpacity>
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

        {/* Toast Message Modal - Separate modal with highest zIndex */}
        <Modal
          visible={toastVisible}
          transparent
          animationType="none"
          onRequestClose={() => {}}
          statusBarTranslucent
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toastContainer,
              {
                opacity: toastOpacity,
              },
            ]}>
            <View style={styles.toastBackground}>
              <Text style={styles.toastText}>
                {t('imageDownloadSuccess')}
              </Text>
            </View>
          </Animated.View>
        </Modal>

        <Animated.View style={[dashboardStyles.statCardContainer, { paddingHorizontal: ms(15), opacity: fade, transform: [{ translateY }] }]}>
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
          {menuItems.map((item, index) => {
            const isDisabled = (item as any).disabled === true;
            const isNewChurchItem = item.label === 'New Church';
            return (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: C.border }, isDisabled ? { opacity: 0.5 } : null]}
                  onPress={() => { if (!isDisabled) handleMenuItemPress(item); }}
                  activeOpacity={isDisabled ? 1 : 0.7}
                >
                  <Image source={item.icon} style={styles.menuIcon} />
                  <Text
                    style={[
                      styles.menuLabel,
                      { color: item.label === 'Add Monthly Data' ? COLORS.mainColor : C.textPrimary },
                    ]}
                  >
                    {item.label === 'Add Monthly Data' ? t('addMonthlyData') :
                     item.label === 'Monthly Data' ? t('monthlyData') :
                     item.label === 'Edit Church' ? t('editChurch') :
                     item.label === 'Worship Services' ? t('worshipServices') :
                     item.label === 'New Pastor & New Church' ? t('newPastorAndNewChurch') :
                     item.label === 'New Pastor' ? t('addNewPastor') :
                     item.label === 'New Church' ? t('addNewChurch') : item.label}
                  </Text>
                  <Image source={require('../../../../app/assets/images/icon-down.png')} style={styles.menuArrow} />
                </TouchableOpacity>

                {isNewChurchItem ? (
                  <>
                    <TouchableOpacity
                      style={[styles.menuItem, styles.subMenuItem, { borderBottomColor: C.border, borderBottomWidth: (!churchPictureExpanded && churchPictures.length > 0) ? 0 : 1 }]}
                      onPress={handleToggleChurchPictures}
                      activeOpacity={0.7}
                    >
                      <Image source={require('../../../../app/assets/images/icon/image.png')} style={styles.menuIcon} />
                      <Text style={[styles.menuLabel, { color: C.textPrimary }]}>{t('churchPicture')}</Text>
                      <Image
                        source={require('../../../../app/assets/images/icon-down.png')}
                        style={[styles.menuArrow, churchPictureExpanded ? styles.menuArrowExpanded : null]}
                      />
                    </TouchableOpacity>
                    {churchPictureExpanded ? (
                      <View style={[styles.churchPicturesContainer, { borderBottomColor: C.border }]}>
                        {churchPicturesLoading ? (
                          <ActivityIndicator size="small" color={C.textSecondary} style={{ marginVertical: ms(12) }} />
                        ) : churchPicturesError ? (
                          <Text style={[styles.churchPictureStatusText, { color: C.error || '#ff4444' }]}>{churchPicturesError}</Text>
                        ) : (
                          <View style={styles.churchPicturesList}>
                            {(churchPictures.length === 0
                              ? [null]
                              : churchPictures
                            ).map((url, pictureIndex) => (
                              <TouchableOpacity
                                key={url ? `${url}-${pictureIndex}` : 'default'}
                                style={styles.churchPictureItem}
                                activeOpacity={url ? 0.85 : 1}
                                onPress={() => {
                                  if (url) {
                                    setSelectedImage(url);
                                    setImageModalVisible(true);
                                  }
                                }}
                              >
                                <Image
                                  source={url ? { uri: url } : require('../../../../app/assets/images/group-user.jpg')}
                                  style={[styles.churchPictureThumb, { borderColor: C.border }]}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : churchPicturesLoading ? (
                      <ActivityIndicator size="small" color={C.textSecondary} style={{ marginVertical: ms(10) }} />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.churchPicturePeek}
                        onPress={handleToggleChurchPictures}
                      >
                        <View style={[styles.churchPicturePeekFrame, { backgroundColor: C.border }]}>
                          <Image
                            source={churchPictures.length > 0 ? { uri: churchPictures[0] } : require('../../../../app/assets/images/group-user.jpg')}
                            style={styles.churchPicturePeekImg}
                            resizeMode="cover"
                          />
                          {/* 25 lát mỏng không chồng, opacity theo easing cubic – mượt tối đa */}
                          {Array.from({ length: 25 }, (_, i) => {
                            const t = i / 24;
                            const opacity = Math.pow(1 - t, 2);
                            return (
                              <View
                                key={i}
                                pointerEvents="none"
                                style={{
                                  position: 'absolute',
                                  bottom: ms(18 + i * 3),
                                  left: 0,
                                  right: 0,
                                  height: ms(3),
                                  backgroundColor: `rgba(${gradientBase},${opacity.toFixed(3)})`,
                                }}
                              />
                            );
                          })}
                          {/* solid đáy */}
                          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ms(20), backgroundColor: `rgba(${gradientBase},1)` }} />
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
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
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    width: hs(40),
    height: hs(40),
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: ws(40),
    height: ws(40),
  },
  verificationText: {
    fontSize: fs(12),
    textAlign: 'right',
    fontWeight: '600',
    marginTop: ms(3),
    flexShrink: 1,
  },
  profileSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: ms(15),
    paddingTop: ms(12),
    marginBottom: ms(4),
  },
  profileImage: {
    width: ws(72),
    height: ws(72),
    borderRadius: ws(36),
  },
  namePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: ms(0),
  },
  nameBlock: {
    flex: 1,
    paddingLeft: ms(14),
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarRing: {
    borderWidth: 2.5,
    borderRadius: ws(46),
    padding: ms(2),
  },
  avatarBadge: {
    position: 'absolute',
    bottom: ms(1),
    right: ms(1),
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    color: '#fff',
    fontSize: fs(10),
    fontWeight: '700',
  },
  profileNameLink: {
    fontSize: fs(15),
    fontWeight: '700',
    color: COLORS.mainColor,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: fs(18),
    fontWeight: '700',
    color: '#000',
  },
  titleText: {
    fontSize: fs(15),
    marginTop: ms(2),
    fontWeight: '500',
  },
  organizationRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: ms(6),
    width: '100%',
  },
  organizationText: {
    fontSize: fs(15),
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    lineHeight: fs(22),
  },
  dropdownIcon: {
    width: ws(10),
    height: hs(10),
    position: 'absolute',
    top: ms(7),
    tintColor: '#000',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ms(4),
    width: '100%',
  },
  locationText: {
    fontSize: fs(15),
    color: '#000',
    textAlign: 'left',
    width: '35%',
  },
  reportVerifyColumn: {
    width: '65%',
    alignItems: 'flex-end',
    marginLeft: ms(8),
  },
  lastRecordDate: {
    fontSize: fs(12),
    color: COLORS.mainColor,
    textAlign: 'right',
    fontWeight: '600',
    flexShrink: 1,
  },
  lastRecordDateValue: {
    fontSize: fs(12),
    color: COLORS.mainColor,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    marginBottom: ms(16),
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: ms(16),
    marginBottom: ms(12),
    alignItems: 'center',
  },
  statIcon: {
    width: ws(24),
    height: hs(24),
    marginBottom: ms(8),
  },
  statValue: {
    fontSize: fs(20),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: ms(4),
  },
  statLabel: {
    fontSize: fs(12),
    color: '#666',
  },
  viewMoreButton: {
    alignItems: 'flex-end',
    fontSize: fs(12),
    paddingHorizontal: ms(16),
  },
  viewMoreText: {
    fontSize: fs(13),
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreIcon: {
    width: ws(12),
    height: hs(12),
    marginLeft: ms(4),
  },
  menuContainer: {
    paddingHorizontal: ms(16),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    width: ws(23),
    height: ws(23),
    marginRight: ms(12),
  },
  menuLabel: {
    flex: 1,
    fontSize: fs(14),
    color: '#000',
  },
  menuArrow: {
    width: ws(12),
    height: hs(12),
    transform: [{ rotate: '-90deg' }],
  },
  menuArrowExpanded: {
    transform: [{ rotate: '0deg' }],
  },
  subMenuItem: {
    paddingLeft: 0,
  },
  churchPicturesContainer: {
    borderBottomWidth: 1,
    paddingBottom: ms(12),
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: ms(8),
  },
  churchPicturesList: {
    width: '100%',
  },
  churchPictureItem: {
    marginBottom: ms(10),
  },
  churchPictureStatusText: {
    fontSize: fs(12),
    marginTop: ms(4),
  },
  churchPictureThumb: {
    width: '100%',
    height: ws(180),
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#f5f5f5',
  },
  churchPicturePeek: {
    paddingTop: ms(4),
    paddingBottom: ms(8),
  },
  churchPicturePeekFrame: {
    width: '100%',
    height: ms(60),
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  churchPicturePeekImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: ws(180),
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
    maxWidth: ws(420),
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '70%',
    paddingVertical: ms(8),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: rs(12),
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: fs(16), fontWeight: '700', color: '#111' },
  modalClose: { paddingHorizontal: ms(8), paddingVertical: ms(4) },
  modalCloseText: { fontSize: fs(18), color: '#111' },
  modalList: { paddingVertical: ms(4) },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    paddingVertical: ms(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemText: { fontSize: fs(16), flex: 1, color: '#111' },
  modalItemChevron: { fontSize: fs(18), marginLeft: ms(8), color: '#6b7280' },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hs(50) : hs(30),
    left: ms(20),
    right: ms(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  fullImageCloseText: {
    color: '#fff',
    fontSize: fs(22),
  },
  downloadButton: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: 16,
    // backgroundColor: 'rgba(0,0,0,0.6)',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: fs(14),
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
  toastContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: hs(80),
    pointerEvents: 'none',
  },
  toastBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: ms(12),
    paddingHorizontal: ms(24),
    borderRadius: rs(8),
    minWidth: ws(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: fs(14),
    fontWeight: '500',
    textAlign: 'center',
    color: '#fff',
  },
});
