import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../../../config/navigation';
import {logout} from '../../auth/services/auth.service';
import {useLanguage} from '../../../shared/context/LanguageContext';
import {getTranslatedMenuItems, BLANK_AVATAR} from '../../../shared/config/dashboard.constants';
import {HamburgerMenuIcon} from '../../../shared/components/HamburgerMenuIcon';
import {MenuPopup} from '../../../shared/components/MenuPopup';
import {dashboardStyles} from '../styles';
import {DashboardStatCard} from '../components/DashboardStatCard';
import api from '../../../config/api';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import ZoomableImageModal from '../../../shared/components/ZoomableImageModal';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {FlatListWithVerticalScrollbar} from '../../../shared/components/FlatListWithVerticalScrollbar';
import IosActionSheet from '../../../shared/components/IosActionSheet';
import {downloadImageToCameraRoll} from '../../../shared/utils/downloadImage';
import ImagePicker from 'react-native-image-crop-picker';
import {updateUser} from '../../user/services/user.service';
import {BellSvgIcon} from '../../../shared/components/icons';

const DASHBOARD_SCROLL_DATA: {id: string}[] = [];

type OverseerDashboardData = {
  overseer_profile?: {
    id?: number;
    name?: string;
    role_name?: string;
    title?: string;
    photo_url?: string | null;
  };
  overseer_permissions?: {
    allowedIds?: {
      churchNetworkIds?: unknown[];
      languageRegionIds?: unknown[];
      geographicalRegionIds?: unknown[];
      churchRegionIds?: unknown[];
      overseerIds?: unknown[];
    };
  };
};

type OverseerIndicatorData = {
  total_churches?: number;
  avg_people_3_months?: number;
  percent_churches_reporting?: number;
  percent_growth_churches_number?: number;
  percent_churches_growing?: number;
  countries_count?: number;
  percent_churches_planted?: number;
  percent_churches_with_cg?: number;
  percent_churches_with_gt_liw?: number;
  percent_churches_with_giving?: number;
  percent_churches_with_mfp?: number;
  percent_churches_visited_2_years?: number;
  church_ids?: number[];
};

type OverseerActionItem = {
  icon: any;
  label: string;
  routeName: string;
  disabled?: boolean;
};

const resolveRoleId = (userData: any): number | null => {
  const rawRoleId =
    userData?.role?.id ??
    userData?.role_id ??
    userData?.roleID ??
    userData?.roleId;
  const parsedRoleId = Number(rawRoleId);
  return Number.isFinite(parsedRoleId) ? parsedRoleId : null;
};

const formatInteger = (value?: number) => {
  if (typeof value !== 'number') return '0';
  return Math.round(value).toLocaleString('en-US');
};

const formatNumber = (value?: number, maximumFractionDigits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

const formatPercent = (value?: number, maximumFractionDigits = 2) =>
  `${formatNumber(value, maximumFractionDigits)}%`;

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

export default function OverseerDashboardScreen() {
  const navigation = useNavigation<any>();
  const {setIsAuthenticated} = useContext(AuthContext);
  const {selectedLanguage, setLanguage} = useLanguage();
  const {t} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const C = useThemedColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    name: string;
    role: string;
    title: string;
    image: any;
  }>({
    name: '',
    role: '',
    title: '',
    image: BLANK_AVATAR,
  });
  const [indicatorData, setIndicatorData] = useState<OverseerIndicatorData>({});
  const [showAllStats, setShowAllStats] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [localAvatarPath, setLocalAvatarPath] = useState<string | null>(null);
  const [avatarHeaderMenuVisible, setAvatarHeaderMenuVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const translatedMenu = useMemo(
    () =>
      getTranslatedMenuItems(
        selectedLanguage as any,
        currentUserRoleId ?? undefined,
      ),
    [selectedLanguage, currentUserRoleId],
  );

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: showAllStats ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showAllStats, rotation]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [meRes, dashboardRes, indicatorRes] = await withTimeout(
        Promise.all([
          api.get('users/me'),
          api.get('dashboard'),
          api.get('dashboard/overseer-indicators'),
        ]),
      );

      const me = meRes?.data?.data;
      const r = resolveRoleId(me);
      const userId = me?.id;
      if (r != null) setCurrentUserRoleId(r);
      if (typeof userId === 'number') setCurrentUserId(userId);

      const dashboardData: OverseerDashboardData = dashboardRes?.data?.data ?? {};
      const indicator: OverseerIndicatorData = indicatorRes?.data?.data ?? {};
      const p = dashboardData?.overseer_profile;

      setProfile({
        name: p?.name || '',
        role: p?.role_name || '',
        title: p?.title || '',
        image: p?.photo_url || BLANK_AVATAR,
      });
      setIndicatorData(indicator);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load overseer dashboard:', error);
      setIndicatorData({});
      setLoadError(getApiErrorMessage(error, tRef.current));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const normalizeFileUri = useCallback((p: string) => (p.startsWith('file://') ? p : `file://${p}`), []);

  const zoomableAvatarUri = useMemo(() => {
    if (localAvatarPath) {
      return normalizeFileUri(localAvatarPath);
    }
    if (typeof profile.image === 'string' && profile.image.trim()) {
      return profile.image.trim();
    }
    return Image.resolveAssetSource(BLANK_AVATAR)?.uri ?? null;
  }, [localAvatarPath, normalizeFileUri, profile.image]);

  const closeAvatarModal = useCallback(() => {
    setAvatarHeaderMenuVisible(false);
    setAvatarModalVisible(false);
  }, []);

  const refreshProfilePhoto = useCallback(async () => {
    try {
      const dashboardRes = await api.get('dashboard');
      const dashboardData: OverseerDashboardData = dashboardRes?.data?.data ?? {};
      const p = dashboardData?.overseer_profile;
      setProfile(prev => ({
        ...prev,
        image: p?.photo_url || BLANK_AVATAR,
      }));
    } catch {
      // ignore
    }
  }, []);

  const uploadAndApplyAvatar = useCallback(
    async (imagePath: string) => {
      if (!currentUserId || avatarUploading) {
        return;
      }
      setAvatarUploading(true);
      let uploadedUserPhotoPath: string | null = null;
      let uploadError: string | null = null;
      try {
        const form = new FormData();
        const fileName = imagePath.split('/').pop() || 'photo.jpg';
        form.append('file', {
          uri: imagePath,
          name: fileName,
          type: 'image/jpeg',
        } as any);
        form.append('entity_type', 'users');
        form.append('alt_text', String(profile.name || '').trim());

        const uploadRes = await api.post('images/upload', form, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
        uploadedUserPhotoPath =
          uploadRes?.data?.data?.path ||
          uploadRes?.data?.data?.url ||
          uploadRes?.data?.path ||
          uploadRes?.data?.url ||
          null;
      } catch (e: any) {
        console.error('[overseer avatar upload]', e?.response?.data, e?.message);
        uploadError = getApiErrorMessage(e, t);
        uploadedUserPhotoPath = null;
      }

      if (!uploadedUserPhotoPath) {
        setAvatarUploading(false);
        Alert.alert(t('error'), uploadError || t('failedToLoadData') || 'Upload failed');
        return;
      }

      try {
        await updateUser(currentUserId, {user_photo: uploadedUserPhotoPath} as any);
        setLocalAvatarPath(null);
        await refreshProfilePhoto();
        closeAvatarModal();
        Alert.alert(t('success'), t('profileUpdatedSuccess') || 'Profile updated');
      } catch (e: any) {
        Alert.alert(
          t('error'),
          getApiErrorMessage(e, t) || t('couldNotUpdateUser') || 'Could not update user',
        );
      } finally {
        setAvatarUploading(false);
      }
    },
    [
      avatarUploading,
      closeAvatarModal,
      currentUserId,
      profile.name,
      refreshProfilePhoto,
      t,
    ],
  );

  const openAvatarPhotoSourcePicker = useCallback(() => {
    const pickFromLibrary = async () => {
      try {
        const image: any = await ImagePicker.openPicker({
          width: 300,
          height: 300,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageMaxWidth: 1024,
          compressImageMaxHeight: 1024,
          compressImageQuality: 0.8,
          includeBase64: false,
        });
        if (image?.size && image.size > 1572864) {
          Alert.alert('File too large', 'Please select an image under 1.5MB');
          return;
        }
        if (image?.path) {
          closeAvatarModal();
          setLocalAvatarPath(image.path);
          void uploadAndApplyAvatar(image.path);
        }
      } catch {
        // cancelled
      }
    };

    const takePhoto = async () => {
      try {
        const image: any = await ImagePicker.openCamera({
          width: 300,
          height: 300,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageMaxWidth: 1024,
          compressImageMaxHeight: 1024,
          compressImageQuality: 0.8,
          includeBase64: false,
        });
        if (image?.size && image.size > 1572864) {
          Alert.alert('File too large', 'Please select an image under 1.5MB');
          return;
        }
        if (image?.path) {
          closeAvatarModal();
          setLocalAvatarPath(image.path);
          void uploadAndApplyAvatar(image.path);
        }
      } catch {
        // cancelled
      }
    };

    if (Platform.OS === 'ios') {
      const takeLabel = t('takePhoto') || 'Take Photo';
      const chooseLabel = t('uploadImage') || 'Choose Photo';
      const cancelLabel = t('cancel') || 'Cancel';
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [takeLabel, chooseLabel, cancelLabel],
          cancelButtonIndex: 2,
          userInterfaceStyle: 'light',
        },
        (idx: number) => {
          if (idx === 0) {
            void takePhoto();
          }
          if (idx === 1) {
            void pickFromLibrary();
          }
        },
      );
      return;
    }

    setAvatarModalVisible(false);
    setAvatarHeaderMenuVisible(false);
    requestAnimationFrame(() => {
      Alert.alert(t('changePhoto') || 'Change Photo', '', [
        {text: t('takePhoto') || 'Take Photo', onPress: () => void takePhoto()},
        {text: t('uploadImage') || 'Choose Photo', onPress: () => void pickFromLibrary()},
        {text: t('cancel') || 'Cancel', style: 'cancel'},
      ]);
    });
  }, [closeAvatarModal, t, uploadAndApplyAvatar]);

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
      if (item.routeName === 'EditProfile') {
        if (currentUserId) {
          navigation.navigate('EditProfile', {id: currentUserId});
        }
      } else if (item.routeName === 'Churches') {
        navigation.navigate('Churches', {openChurchInPastorDashboard: true});
      } else {
        navigation.navigate(item.routeName, item.params);
      }
    } else if (item.label === 'Logout') {
      handleLogout();
    }
    setMenuVisible(false);
  };

  const handleToggleStats = () => {
    Animated.parallel([
      Animated.timing(fade, {toValue: 0, duration: 130, useNativeDriver: true}),
      Animated.timing(translateY, {toValue: 8, duration: 130, useNativeDriver: true}),
    ]).start(() => {
      setShowAllStats(prev => !prev);
      translateY.setValue(-8);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const statItems = useMemo(
    () => [
      {
        icon: require('../../../../app/assets/images/icon/house.png'),
        value: formatInteger(indicatorData.total_churches),
        label: t('churches') || 'Churches',
        helpTitle: t('churches') || 'Churches',
        helpMessage: t('indicatorInfoChurches'),
      },
      {
        icon: require('../../../../app/assets/images/icon/group.png'),
        value: formatInteger(indicatorData.avg_people_3_months),
        label: t('people') || 'People',
        helpTitle: t('people') || 'People',
        helpMessage: t('indicatorInfoPeople'),
      },
      {
        icon: require('../../../../app/assets/images/icon/growth.png'),
        value: formatPercent(indicatorData.percent_churches_growing),
        label: t('churchesGrowing') || 'Churches Growing',
        helpTitle: t('indicatorTitleChurchesGrowing'),
        helpMessage: t('indicatorInfoChurchesGrowing'),
      },
      {
        icon: require('../../../../app/assets/images/icon/reporting.png'),
        value: formatPercent(indicatorData.percent_churches_reporting),
        label: t('churchesReporting') || 'Churches Reporting',
        helpTitle: t('indicatorTitleChurchesReporting'),
        helpMessage: t('indicatorInfoChurchesReporting'),
      },
      {
        icon: require('../../../../app/assets/images/icon/earth.png'),
        value: formatInteger(indicatorData.countries_count),
        label: t('nations') || 'Nations',
        helpTitle: t('nations') || 'Nations',
        helpMessage: t('indicatorInfoNations'),
      },
      {
        icon: require('../../../../app/assets/images/icon/plant.png'),
        value: formatPercent(indicatorData.percent_churches_planted),
        label: t('churchesPlanting') || 'Churches Planting',
        helpTitle: t('indicatorTitleChurchesPlanting'),
        helpMessage: t('indicatorInfoChurchesPlanting'),
      },
      {
        icon: require('../../../../app/assets/images/icon/cell-group.png'),
        value: formatPercent(indicatorData.percent_churches_with_cg),
        label: t('churchesWithCgs') || 'Churches with CGs',
        helpTitle: t('indicatorTitleChurchesWithCgs'),
        helpMessage: t('indicatorInfoChurchesWithCgs'),
      },
      {
        icon: require('../../../../app/assets/images/icon/education.png'),
        value: formatPercent(indicatorData.percent_churches_with_gt_liw),
        label: t('churchesWithGtLiw') || 'Churches with GT/LIW',
        helpTitle: t('indicatorTitleChurchesWithGtLiw'),
        helpMessage: t('indicatorInfoChurchesWithGtLiw'),
      },
      {
        icon: require('../../../../app/assets/images/icon/worldwide-currency.png'),
        value: formatPercent(indicatorData.percent_churches_with_giving),
        label: t('churchesWithTithesOfferings') || 'Churches with Tithes & Offerings',
        helpTitle: t('indicatorTitleChurchesWithTithesOfferings'),
        helpMessage: t('indicatorInfoChurchesWithTithesOfferings'),
      },
      {
        icon: require('../../../../app/assets/images/icon/worldwide-currency.png'),
        value: formatPercent(indicatorData.percent_churches_with_mfp),
        label: t('churchesWithMfp') || 'Churches with MFP',
        helpTitle: t('indicatorTitleChurchesWithMfp'),
        helpMessage: t('indicatorInfoChurchesWithMfp'),
      },
      {
        icon: require('../../../../app/assets/images/icon/more.png'),
        value: formatPercent(indicatorData.percent_growth_churches_number),
        label: t('moreChurches') || 'More Churches',
        helpTitle: t('indicatorTitleMoreChurches'),
        helpMessage: t('indicatorInfoMoreChurches'),
      },
      {
        icon: require('../../../../app/assets/images/icon/worldwide.png'),
        value: formatPercent(indicatorData.percent_churches_visited_2_years),
        label: t('churchesVisited') || 'Churches Visited',
        helpTitle: t('indicatorTitleChurchesVisited'),
        helpMessage: t('indicatorInfoChurchesVisited'),
      },
    ],
    [indicatorData, t],
  );

  const actionItems: OverseerActionItem[] = [
    {
      icon: require('../../../../app/assets/images/icon/chart.png'),
      label: t('monthlyData') || 'Monthly Data',
      routeName: 'MonthlyDataSelect',
    },
    {
      icon: require('../../../../app/assets/images/icon/car.png'),
      label: t('enterVisits') || 'Visits & Events',
      routeName: 'EnterVisits',
    },
    {
      icon: require('../../../../app/assets/images/icon/house-user.png'),
      label: t('newPastorAndNewChurch') || 'New Pastor & New Church',
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
    {
      icon: require('../../../../app/assets/images/icon/list.png'),
      label: t('churchList') || 'Church List',
      routeName: 'Churches',
    },
    {
      icon: require('../../../../app/assets/images/icon/line-chart.png'),
      label: t('attendanceChart') || 'Attendance Chart',
      routeName: 'OverseerChurchAttendanceChart',
    },
    {
      icon: require('../../../../app/assets/images/icon/visit.png'),
      label: t('pastoralVisits') || 'Church Visits Chart',
      routeName: 'PastoralVisitsChart',
    },
    {
      icon: require('../../../../app/assets/images/icon/replay-10.png'),
      label: t('churchesPlantedLast10Years') || 'Churches Planted last 10 years ',
      routeName: 'OverseerChurchesPlantedLast10Years',
    },
    // {
    //   icon: require('../../../../app/assets/images/icon/edit.png'),
    //   label: t('editMyProfile') || 'Edit My Profile',
    //   routeName: 'EditProfile',
    //   disabled: !currentUserId,
    // },
  ];

  const arrowRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (loading) {
    return (
      <SafeAreaView
        style={{flex: 1, backgroundColor: C.background}}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', gap: ms(12)}}>
          <ActivityIndicator size="large" color={COLORS.mainColor} />
          <Text style={{color: C.textPrimary}}>{t('loading')}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView
        style={{flex: 1, backgroundColor: C.background}}
        edges={['top', 'bottom', 'left', 'right']}>
        <ApiErrorState message={loadError} onRetry={() => void loadDashboard()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: C.background}}
      edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: ms(10),
          paddingTop: ms(28),
          paddingHorizontal: ms(16),
          backgroundColor: C.background,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
          <TouchableOpacity
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.85}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Image
              source={
                localAvatarPath
                  ? {uri: normalizeFileUri(localAvatarPath)}
                  : typeof profile.image === 'string'
                    ? {uri: profile.image}
                    : profile.image
              }
              style={{width: ws(50), height: ws(50), borderRadius: rs(25), marginRight: ms(12)}}
              onError={() => setProfile(prev => ({...prev, image: BLANK_AVATAR}))}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{flex: 1}}
            onPress={() => {
              if (currentUserId) navigation.navigate('User', {userId: currentUserId});
            }}
            activeOpacity={0.7}
            disabled={!currentUserId}>
            <Text category="h6" style={{fontWeight: 'bold', color: COLORS.mainColor, fontSize: fs(16)}}>
              {profile.name}
            </Text>
            <Text category="s2" appearance="hint" style={{color: C.textSecondary, fontSize: fs(12)}}>
              {profile.title}
            </Text>
            <Text category="s2" appearance="hint" style={{color: C.textSecondary, fontSize: fs(12)}}>
              {profile.role}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: ms(18)}}>
          <TouchableOpacity
            style={styles.notificationIconWrap}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications' as any)}>
            <View style={styles.notificationIcon}>
              <BellSvgIcon width={24} height={24} color={COLORS.mainColor} />
            </View>
          </TouchableOpacity>
          <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
          <MenuPopup
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            menuItems={translatedMenu}
            onMenuItemPress={handleMenuItemPress}
            onLogout={handleLogout}
            onChangeLanguage={setLanguage}
            selectedLanguage={selectedLanguage}
          />
        </View>
      </View>
      <FlatListWithVerticalScrollbar
        style={[dashboardStyles.container, {backgroundColor: C.background}]}
        data={DASHBOARD_SCROLL_DATA}
        keyExtractor={item => item.id}
        renderItem={() => null}
        ListHeaderComponent={
          <>
        <Animated.View
          style={[
            dashboardStyles.statCardContainer,
            {opacity: fade, transform: [{translateY}]},
          ]}>
          {statItems.slice(0, showAllStats ? statItems.length : 4).map((stat, index) => (
            <DashboardStatCard key={index} {...stat} />
          ))}
        </Animated.View>

        <TouchableOpacity onPress={handleToggleStats} style={dashboardStyles.viewMoreButton}>
          <Text style={[dashboardStyles.viewMoreText, {color: C.textSecondary, fontSize: fs(12)}]}>
            {showAllStats ? `${t('viewLess')} ` : `${t('viewMore')} `}
            <Animated.Image
              source={require('../../../../app/assets/images/icon-down.png')}
              style={{
                width: ws(12),
                height: ws(12),
                marginLeft: ms(4),
                transform: [{rotate: arrowRotate}],
              }}
            />
          </Text>
        </TouchableOpacity>

        <View style={{marginTop: ms(8)}}>
          {actionItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: ms(12),
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
                {borderBottomColor: C.border, opacity: item?.disabled ? 0.5 : 1},
              ]}
              onPress={() => !item?.disabled && handleMenuItemPress(item)}
              disabled={!!item?.disabled}
              activeOpacity={item?.disabled ? 1 : 0.7}>
              <Image
                source={item.icon}
                style={styles.menuItemIcon}
              />
              <Text
                style={{
                  flex: 1,
                  color:
                    item.routeName === 'MonthlyDataSelect'
                      ? COLORS.mainColor
                      : C.textPrimary,
                  fontSize: fs(14),
                }}>
                {item.label}
              </Text>
              <Image
                source={require('../../../../app/assets/images/icon-down.png')}
                style={styles.menuArrow}
              />
            </TouchableOpacity>
          ))}
        </View>
          </>
        }
      />

      <ZoomableImageModal
        visible={avatarModalVisible}
        uri={zoomableAvatarUri}
        onClose={closeAvatarModal}
        headerRight={
          zoomableAvatarUri ? (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'ios') {
                  const downloadLabel = t('download') || 'Download';
                  const changePhotoLabel = t('changePhoto') || 'Change Photo';
                  const cancelLabel = t('cancel') || 'Cancel';
                  ActionSheetIOS.showActionSheetWithOptions(
                    {
                      options: [downloadLabel, changePhotoLabel, cancelLabel],
                      cancelButtonIndex: 2,
                      userInterfaceStyle: 'light',
                    },
                    async (buttonIndex: number) => {
                      if (buttonIndex === 0) {
                        if (!zoomableAvatarUri || avatarUploading) {
                          return;
                        }
                        try {
                          await downloadImageToCameraRoll(zoomableAvatarUri, {
                            filePrefix: 'user-avatar',
                          });
                          Alert.alert(t('success'), t('imageDownloadSuccess'));
                        } catch {
                          Alert.alert(t('error'), t('imageDownloadError'));
                        }
                        return;
                      }
                      if (buttonIndex === 1) {
                        if (!currentUserId) {
                          return;
                        }
                        requestAnimationFrame(() => openAvatarPhotoSourcePicker());
                      }
                    },
                  );
                  return;
                }
                setAvatarHeaderMenuVisible(true);
              }}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              style={{paddingHorizontal: ms(6), paddingVertical: ms(4)}}>
              <RNText
                style={{
                  color: '#fff',
                  fontSize: fs(22),
                  fontWeight: '700',
                  opacity: avatarUploading ? 0.6 : 1,
                }}>
                ⋯
              </RNText>
            </TouchableOpacity>
          ) : null
        }
      />

      {Platform.OS === 'android' ? (
        <IosActionSheet
          visible={avatarHeaderMenuVisible}
          onClose={() => setAvatarHeaderMenuVisible(false)}
          cancelLabel={t('cancel') || 'Cancel'}
          items={[
            {
              label: t('download') || 'Download',
              disabled: !zoomableAvatarUri || avatarUploading,
              onPress: async () => {
                if (!zoomableAvatarUri || avatarUploading) {
                  return;
                }
                try {
                  await downloadImageToCameraRoll(zoomableAvatarUri, {filePrefix: 'user-avatar'});
                  Alert.alert(t('success'), t('imageDownloadSuccess'));
                } catch {
                  Alert.alert(t('error'), t('imageDownloadError'));
                }
              },
            },
            {
              label: t('changePhoto') || 'Change Photo',
              disabled: !currentUserId || avatarUploading,
              onPress: () => {
                requestAnimationFrame(() => openAvatarPhotoSourcePicker());
              },
            },
          ]}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menuItemIcon: {
    width: ws(23),
    height: hs(23),
    marginRight: ms(12),
    resizeMode: 'contain',
  },
  menuArrow: {
    width: ws(15),
    height: ws(15),
    transform: [{rotate: '-90deg'}],
  },
  notificationIconWrap: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(4),
    marginRight: ms(4),
  },
  notificationIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
