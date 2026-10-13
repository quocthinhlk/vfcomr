// modules/dashboard/screens/DashboardScreen.tsx
import React, {useContext, useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, Button} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {logout} from '../../auth/services/auth.service'; // Corrected import path
import {AuthContext} from '../../../config/navigation';
import {dashboardStyles} from '../styles';
import {DashboardHeader} from '../components/DashboardHeader';
import {AdminOverseerSection, AdminOverseerSkeleton} from '../components/AdminOverseerSection';
import {OverseerSwitcher} from '../components/OverseerSwitcher';
import {
  AdminOverseerSummary,
  buildOverseerChartData,
  getMyOverseers,
} from '../services/adminDashboard.service';
import {provideOverseerChartData} from '../services/overseerIndicators.service';
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
import {COLORS} from '../../../shared/constants/colors';
import {FlatListWithVerticalScrollbar} from '../../../shared/components/FlatListWithVerticalScrollbar';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {BellSvgIcon} from '../../../shared/components/icons';
import AppLoadingView from '../../../shared/components/AppLoadingView';
import {useOnReconnect} from '../../../shared/hooks/useOnReconnect';

const DASHBOARD_SCROLL_DATA: {id: string}[] = [];

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
  const route = useRoute();
  const {setIsAuthenticated} = useContext(AuthContext);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [profile, setProfile] = useState<{
    name: string;
    role: string;
    location: string;
    image: any;
  }>({name: '', role: '', location: '', image: BLANK_AVATAR});

  const loadCurrentUser = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('users/me');
      const userData = res?.data?.data;
      const r = resolveRoleId(userData);
      const userId = userData?.id;
      if (r != null) {
        setCurrentUserRoleId(r);
      }
      if (typeof userId === 'number') {
        setCurrentUserId(userId);
      }
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load current user for dashboard:', error);
      setLoadError(getApiErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Header name / role / location / photo. A failure (e.g. offline at launch)
  // keeps what's shown; it's retried on reconnect and with "Try again".
  const profileMountedRef = useRef(true);
  const loadProfile = async () => {
    try {
      const u = await getUserProfile();
      // getUserProfile() swallows errors and returns blanks: treat that as a
      // failed load so a flaky reconnect doesn't wipe the name already shown.
      if (!profileMountedRef.current || (!u.name && !u.role && !u.location)) {
        return;
      }
      setProfile({
        name: u.name,
        role: u.role,
        location: u.location,
        image: u.profileImage,
      });
    } catch {}
  };

  useEffect(() => {
    profileMountedRef.current = true;
    void loadProfile();
    return () => {
      profileMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin indicators: one block per assigned overseer (percentages can't be
  // summed into one figure). Loaded from the streamed my-overseers endpoint.
  const [overseers, setOverseers] = useState<AdminOverseerSummary[]>([]);
  const [overseersLoading, setOverseersLoading] = useState(true);
  const [overseersError, setOverseersError] = useState<unknown>(null);
  // One overseer at a time: the Admin picks whose profile / indicators to view.
  const [selectedOverseerId, setSelectedOverseerId] = useState<number | null>(null);
  const selectedOverseer =
    overseers.find(o => o.profile.id === selectedOverseerId) ?? overseers[0] ?? null;
  const loadOverseers = async () => {
    setOverseersLoading(true);
    setOverseersError(null);
    try {
      const list = await getMyOverseers();
      if (profileMountedRef.current) {
        setOverseers(list);
      }
    } catch (e) {
      if (profileMountedRef.current) {
        setOverseersError(e);
      }
    } finally {
      if (profileMountedRef.current) {
        setOverseersLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadOverseers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadDashboard = () => {
    void loadCurrentUser();
    void loadProfile();
    void loadOverseers();
  };

  // Back online: refresh what's on screen (including the header name).
  useOnReconnect(reloadDashboard);

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
        // Admin dashboard: edits the overseer picked above (falls back to the
        // Admin only when no overseer is loaded).
        const targetId = selectedOverseer?.profile.id ?? currentUserId;
        if (targetId) {
          navigation.navigate('EditProfile', {id: targetId});
        }
      } else if (item.chartFor) {
        // Charts of the overseer picked above: hand over their indicators
        // (already loaded from my-overseers) and open the shared chart screen.
        if (selectedOverseer) {
          const {indicators, header} = buildOverseerChartData(selectedOverseer);
          provideOverseerChartData(selectedOverseer.profile.id, indicators as any, header);
          navigation.navigate(item.routeName, {overseerId: selectedOverseer.profile.id});
        }
      } else {
        navigation.navigate(item.routeName, item.params);
      }
    } else if (item.label === 'Logout') {
      handleLogout();
    }
    setMenuVisible(false); // Close menu after any item press
  };

  // If user is Pastor Leader, show the Pastor Leader Dashboard
  if (!loading && !loadError && isPastorLeader(currentUserRoleId)) {
    return <DashboardPastorLeaderScreen />;
  }

  // If user is Overseer, show the Overseer Dashboard
  if (!loading && !loadError && isOverseer(currentUserRoleId)) {
    return <OverseerDashboardScreen />;
  }

  const handleChangeLanguage = (lang: string) => setLanguage(lang);

  const menuItems = [
    {
      icon: require('../../../../app/assets/images/icon/car.png'),
      label: t('enterVisits') || 'Enter Visits',
      routeName: 'EnterVisits',
    },
    {
      icon: require('../../../../app/assets/images/icon/edit.png'),
      label: t('editProfile') || 'Edit Profile',
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
    // Charts of the selected overseer (same screens as the Overseer dashboard).
    {
      icon: require('../../../../app/assets/images/icon/line-chart.png'),
      label: t('attendanceChart') || 'Attendance Chart',
      routeName: 'OverseerChurchAttendanceChart',
      chartFor: true,
      disabled: !selectedOverseer,
    },
    {
      icon: require('../../../../app/assets/images/icon/visit.png'),
      label: t('pastoralVisits') || 'Church Visits Chart',
      routeName: 'PastoralVisitsChart',
      chartFor: true,
      disabled: !selectedOverseer,
    },
    {
      icon: require('../../../../app/assets/images/icon/replay-10.png'),
      label: t('churchesPlantedLast10Years') || 'Churches Planted last 10 years',
      routeName: 'OverseerChurchesPlantedLast10Years',
      chartFor: true,
      disabled: !selectedOverseer,
    },
    // TEMPORARY – testing only, remove later: opens the push-notification test
    // screen (the dashboard bell was removed). English-only on purpose.
    {
      icon: null,
      bellIcon: true,
      label: 'Test notifications (testing only)',
      routeName: 'Notifications',
    },
  ];

  if (loading) {
    return <AppLoadingView />;
  }

  if (loadError) {
    return (
      <SafeAreaView
        style={{flex: 1, backgroundColor: C.background}}
        edges={['top', 'bottom', 'left', 'right']}>
        <ApiErrorState message={loadError} onRetry={reloadDashboard} />
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
          marginBottom: 0,
          paddingTop: ms(16),
          paddingHorizontal: ms(16),
          backgroundColor: C.background,
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
              width: ws(48),
              height: ws(48),
              borderRadius: ws(24),
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
            disabled={!currentUserId}
            accessibilityRole="button"
            accessibilityLabel={[profile.name, profile.role, profile.location].filter(Boolean).join(', ')}>
            <Text
              numberOfLines={1}
              // Brand blue: the name opens the Admin's profile.
              style={{fontWeight: '700', color: COLORS.mainColor, fontSize: fs(18), lineHeight: fs(24)}}>
              {profile.name}
            </Text>
            {/* Role · location on one line under the name. */}
            <Text
              numberOfLines={1}
              style={{color: C.textSecondary, fontSize: fs(13), marginTop: ms(2)}}>
              {[profile.role, profile.location].filter(Boolean).join(' · ')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: ms(4)}}>
          <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
          <MenuPopup
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            menuItems={translatedMenu}
            onMenuItemPress={handleMenuItemPress}
            onLogout={handleLogout}
            onChangeLanguage={handleChangeLanguage}
            selectedLanguage={selectedLanguage}
            activeRouteName={route.name}
            activeRouteParams={route.params as Record<string, unknown> | undefined}
          />
        </View>
      </View>
      <FlatListWithVerticalScrollbar
        // Admin only: the overseer picker sits close under the header.
        style={[dashboardStyles.container, {backgroundColor: C.background, paddingTop: ms(4)}]}
        data={DASHBOARD_SCROLL_DATA}
        keyExtractor={item => item.id}
        renderItem={() => null}
        ListHeaderComponent={
          <>
        {/* Indicators of the overseer picked below (Admin has no system-wide figures). */}
        {overseersLoading && overseers.length === 0 ? (
          <AdminOverseerSkeleton />
        ) : overseersError && overseers.length === 0 ? (
          <ApiErrorState compact error={overseersError} onRetry={loadOverseers} />
        ) : overseers.length === 0 ? (
          <Text style={{color: C.textSecondary, fontSize: fs(13), marginVertical: ms(12)}}>
            {t('noDataFound')}
          </Text>
        ) : (
          <>
            {selectedOverseer ? (
              <>
                <OverseerSwitcher
                  overseers={overseers}
                  selected={selectedOverseer}
                  onSelect={setSelectedOverseerId}
                />
                {/* Keyed so "View more" resets when switching overseer. */}
                <AdminOverseerSection
                  key={selectedOverseer.profile.id}
                  overseer={selectedOverseer}
                />
              </>
            ) : null}
          </>
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
              {item.bellIcon ? (
                <View style={{width: ws(23), height: hs(23), marginRight: ms(12), alignItems: 'center', justifyContent: 'center'}}>
                  <BellSvgIcon width={ws(20)} height={ws(20)} color={COLORS.mainColor} />
                </View>
              ) : (
                <Image
                  source={item.icon}
                  style={{
                    width: ws(23),
                    height: hs(23),
                    marginRight: ms(12),
                    resizeMode: 'contain',
                  }}
                />
              )}
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

          </>
        }
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  menuArrow: {
    width: ws(15),
    height: ws(15),
    transform: [{ rotate: '-90deg' }],
  },
  // 44pt target around the 24pt bell.
});