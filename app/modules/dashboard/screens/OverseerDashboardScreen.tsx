import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
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
  const C = useThemedColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    role: string;
    location: string;
    image: any;
  }>({
    name: '',
    role: '',
    location: '',
    image: BLANK_AVATAR,
  });
  const [indicatorData, setIndicatorData] = useState<OverseerIndicatorData>({});
  const [showAllStats, setShowAllStats] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [meRes, dashboardRes, indicatorRes] = await withTimeout(Promise.all([
          api.get('users/me'),
          api.get('dashboard'),
          api.get('dashboard/overseer-indicators'),
        ]));
        if (!mounted) return;

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
          location: p?.title || '',
          image: p?.photo_url || BLANK_AVATAR,
        });
        setIndicatorData(indicator);
      } catch (error) {
        console.error('Failed to load overseer dashboard:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
        icon: require('../../../../app/assets/images/icon/reporting.png'),
        value: formatPercent(indicatorData.percent_churches_reporting),
        label: t('churchesReporting') || 'Churches Reporting',
        helpTitle: t('indicatorTitleChurchesReporting'),
        helpMessage: t('indicatorInfoChurchesReporting'),
      },
      {
        icon: require('../../../../app/assets/images/icon/more.png'),
        value: formatPercent(indicatorData.percent_growth_churches_number),
        label: t('moreChurches') || 'More Churches',
        helpTitle: t('indicatorTitleMoreChurches'),
        helpMessage: t('indicatorInfoMoreChurches'),
      },
      {
        icon: require('../../../../app/assets/images/icon/growth.png'),
        value: formatPercent(indicatorData.percent_churches_growing),
        label: t('churchesGrowing') || 'Churches Growing',
        helpTitle: t('indicatorTitleChurchesGrowing'),
        helpMessage: t('indicatorInfoChurchesGrowing'),
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
        icon: require('../../../../app/assets/images/icon/worldwide.png'),
        value: formatPercent(indicatorData.percent_churches_visited_2_years),
        label: t('churchesVisited') || 'Churches Visited',
        helpTitle: t('indicatorTitleChurchesVisited'),
        helpMessage: t('indicatorInfoChurchesVisited'),
      },
    ],
    [indicatorData, t],
  );

  const actionItems = [
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
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: C.textPrimary}}>{t('loading')}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: C.background}}
      edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={[dashboardStyles.container, {backgroundColor: C.background}]}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <Image
              source={typeof profile.image === 'string' ? {uri: profile.image} : profile.image}
              style={{width: ws(50), height: ws(50), borderRadius: rs(25), marginRight: ms(12)}}
              onError={() => setProfile(prev => ({...prev, image: BLANK_AVATAR}))}
            />
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
                {profile.role}
              </Text>
              <Text category="s2" appearance="hint" style={{color: C.textSecondary, fontSize: fs(12)}}>
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
              onChangeLanguage={setLanguage}
              selectedLanguage={selectedLanguage}
            />
          </View>
        </View>

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
              <Text style={{flex: 1, color: C.textPrimary, fontSize: fs(14)}}>{item.label}</Text>
              <Image
                source={require('../../../../app/assets/images/icon-down.png')}
                style={styles.menuArrow}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    width: ws(12),
    height: ws(12),
    transform: [{rotate: '-90deg'}],
  },
});
