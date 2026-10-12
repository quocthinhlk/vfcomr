// app/config/navigation.tsx
import React, { useState, useEffect } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import NetworkStatusBar from '../shared/components/NetworkStatusBar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkReloadListener } from '../shared/components/NetworkReloadListener';
import { SwitchSessionBar } from '../shared/components/SwitchSessionBar';
import NotificationListener from '../shared/components/NotificationListener';
import { isBiometricLoginEnabled } from '../shared/services/biometrics.service';
import { setUnauthorizedHandler } from './api';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Dashboard: undefined;
  WeeklyReport: undefined;
  AddUser: undefined;
  AddChurch: undefined;
  AddCloneChurch: undefined;
  CloneChurch: undefined;
  ChurchNetworks: undefined;
  DisableChurch: { id: number } | undefined;
  DisableChurches: undefined;
  EnableChurch: { id: number } | undefined;
  EditChurch: { id: number; returnTo?: 'DashboardPastorLeader' } | undefined;
  EditChurchLocation: { id: number; latitude?: number; longitude?: number } | undefined;
  ChurchDetail: { id: number } | undefined;
  Overseer: undefined;
  EditProfile: undefined;
  EnterVisits: undefined;
  NewPastorAndChurch: undefined;
  Notifications: undefined;
  User: { userId?: number } | undefined;
  UserRoles: undefined;
  Churches: { refresh?: boolean; openChurchInPastorDashboard?: boolean } | undefined;
  WatchList: undefined;
  WatchListDetail: { watchListId: number };
  WatchListForm: { watchListId?: number } | undefined;
  OverseerGoals: undefined;
  AddOverseerGoals: undefined;
  OverseerGoalDetail: { goalPeriodId: number } | undefined;
  DeleteOverseerGoalPeriod: { goalPeriodId: number } | undefined;
  EditOverseerGoalDefaults: { goalPeriodId: number } | undefined;
  EditOverseerGoals: { goalPeriodId: number } | undefined;
  GenerateReports: { group?: string } | undefined;
  ChurchesPlantedLast10Years: undefined;
  OverseerChurchAttendanceChart: undefined;
  PastoralVisitsChart: undefined;
  OverseerChurchesPlantedLast10Years: undefined;

  AddChurchNetwork: undefined;
  EditChurchNetwork: { churchNetworkId: number } | undefined;
  DeleteChurchNetwork: { churchNetworkId: number } | undefined;
  ChurchTypes: undefined;
  AddChurchType: undefined;
  EditChurchType: { churchTypeId: number } | undefined;
  DeleteChurchType: { churchTypeId: number } | undefined;
  
  LanguageRegions: undefined;
  AddLanguageRegion: undefined;
  EditLanguageRegion: { languageRegionId: number } | undefined;
  DeleteLanguageRegion: { languageRegionId: number } | undefined;
  Countries: undefined;
  Languages: undefined;
  AddLanguage: undefined;
  EditLanguage: { languageId: number } | undefined;
  DeleteLanguage: { languageId: number } | undefined;
  Resources: { reload?: boolean } | undefined;
  ResourceDetail: { resourceId: number; reload?: boolean } | undefined;
  AddNewResource: { parentId?: number } | undefined;
  EditResource: { resourceId: number };
  RelatingSearch: undefined;
  RelatingDetails: undefined;
  RelatingMultiUserRestrictions: undefined;
  FAQ: undefined;
  FAQs: undefined;
  SearchFAQ: undefined;
  FAQDetail: { faqId: number } | undefined;
  AddFAQ: undefined;
  EditFAQ: { faqId: number } | undefined;
  DeleteFAQ: { faqId: number } | undefined;
  EventType: undefined;
  EventTypes: undefined;
  EventTypeDetail: { eventTypeId: number } | undefined;
  AddEventType: undefined;
  EditEventType: { eventTypeId: number } | undefined;
  DeleteEventType: { eventTypeId: number } | undefined;
  PushMail: undefined;
  Settings: undefined;
  SettingsGeneral: undefined;
  SettingsBibleVerse: undefined;
  SettingsRationalising: undefined;
  PermissionExamples: undefined;
  Profile: undefined;
  SwitchUser: undefined;
  Support: undefined;
  OmrSupport: undefined;
  AboutOmr: undefined;
  UserList: undefined;
  DeleteUser: { userId: number; userName?: string } | undefined;
  EditCountry: { countryId: number } | undefined;
  DeleteCountry: { countryId: number } | undefined;
  AddCountry: undefined;
  ChangePasswordForOtherUser: { id: number } | undefined;
  ChangeEmail: { id?: number; email?: string } | undefined;
  DashboardPastorLeader: {
    church_id: number;
    church_name?: string;
    church_country_name?: string;
  } | undefined;
  ChurchAttendanceChart: {churchId?: number} | undefined;
  ChurchGivingChart: {churchId?: number} | undefined;
  AttendanceAndGivingCharts: {churchId?: number} | undefined;
  ChurchRegions: undefined;
  WorshipServices: undefined;
  WorshipServiceDetail: { worshipServiceId: number } | undefined;
  DeleteWorshipService: { worshipServiceId: number } | undefined;
  AddWorshipService: undefined;
  EditWorshipService: { worshipServiceId: number } | undefined;
  AddChurchRegion: undefined;
  EditChurchRegion: { churchRegionId: number } | undefined;
  DeleteChurchRegion: { churchRegionId: number } | undefined;
  GeographicalRegions: { reload?: boolean } | undefined;
  AddGeographicalRegion: { parentId?: number } | undefined;
  EditGeographicalRegion: { region: { id: number; name: string; parent_id: number | null; left: number; right: number } };
  DeleteGeographicalRegion: { region: { id: number; name: string; parent_id: number | null; left: number; right: number } };
  ChurchPlantingProjections: undefined;
  ChurchPlantingProjectionDetail: { projectionId: number } | undefined;
  AddChurchPlantingProjection: undefined;
  EditChurchPlantingProjection: { projectionId: number } | undefined;
  DeleteChurchPlantingProjection: { projectionId: number } | undefined;
  EditStepsChart: { projectionId: number } | undefined;
  Visits: undefined;
  VisitDetail: { visitId: number } | undefined;
  EditVisit: { visitId: number } | undefined;
  EditVisitDetails:
    | {
        visitId?: number;
        userId: number;
        visitorName: string;
        visitorRole: string;
        selectedMonth: number;
        selectedYear: number;
        churchVisitCount: number;
        eventCount: number;
      }
    | undefined;
  AddVisits: undefined;
  AddVisitsDetails:
    | {
        userId: number;
        visitorName: string;
      visitorRole: string;
        selectedMonth: number;
        selectedYear: number;
        churchVisitCount: number;
        eventCount: number;
      }
    | undefined;
  DeleteVisit: { visitId: number } | undefined;
  MonthlyDataSelect: undefined;
  MonthlyDataEntry: {
    churchId: number;
    churchName: string;
    year: number;
    month: number;
    weekNumbers: number[];
  } | undefined;
  RoleChangeRequests: undefined;
  RoleChangeRequestDetail: { id: number } | undefined;
};

import LoginScreen from '../modules/auth/screens/LoginScreen';
import ForgotPasswordScreen from '../modules/auth/screens/ForgotPasswordScreen';
import DashboardScreen from '../modules/dashboard/screens/DashboardScreen';
import WeeklyReportScreen from '../modules/report/screens/WeeklyReportScreen';
import AddUserScreen from '../modules/user/screens/AddUserScreen';
import AddChurchScreen from '../modules/church/screens/AddChurchScreen';
import { AddCloneChurchScreen } from '../modules/church/screens/AddCloneChurchScreen';
import CloneChurchScreen from '../modules/church/screens/CloneChurchScreen';
import DisableChurchScreen from '../modules/church/screens/DisableChurchScreen';
import ListDisableChurchScreen from '../modules/church/screens/ListDisableChurchScreen';
import EnableChurchScreen from '../modules/church/screens/EnableChurchScreen';
import EditChurchScreen from '../modules/church/screens/EditChurchScreen';
import ChurchDetailScreen from '../modules/church/screens/ChurchDetailScreen';
import EditChurchLocationScreen from '../modules/church/screens/EditChurchLocationScreen';
import OverseerScreen from '../modules/overseer/screens/OverseerScreen';
import EditProfileScreen from '../modules/user/screens/EditProfileScreen';
import EnterVisitsScreen from '../modules/report/screens/EnterVisitsScreen';
import NewPastorAndChurchScreen from '../modules/church/screens/NewPastorAndChurchScreen';
import ListOverseerScreen from '../modules/user/screens/ListOverseerScreen';

// New Screens Imports
import UserScreen from '../modules/user/screens/UserScreen';
import { UserRolesScreen } from '../modules/user/screens/UserRolesScreen';
import { ChurchesListScreen } from '../modules/church/screens/ListChurchScreen';
import ChangePasswordForOtherUserScreen from '../modules/user/screens/ChangePasswordForOtherUserScreen';
import ChangeEmailScreen from '../modules/user/screens/ChangeEmailScreen';
import DashboardPastorLeaderScreen from '../modules/dashboard/screens/DashboardPastorLeaderScreen';
import ChurchAttendanceChartScreen from '../modules/dashboard/screens/ChurchAttendanceChartScreen';
import OverseerChurchAttendanceChartScreen from '../modules/dashboard/screens/OverseerChurchAttendanceChartScreen';
import PastoralVisitsChartScreen from '../modules/dashboard/screens/PastoralVisitsChartScreen';
import OverseerChurchesPlantedLast10YearsScreen from '../modules/dashboard/screens/OverseerChurchesPlantedLast10YearsScreen';
import ChurchGivingChartScreen from '../modules/dashboard/screens/ChurchGivingChartScreen';
import AttendanceAndGivingChartsScreen from '../modules/dashboard/screens/AttendanceAndGivingCharts';
import { WatchListScreen } from '../modules/watchlist/screens/WatchListScreen';
import WatchListDetailScreen from '../modules/watchlist/screens/WatchListDetailScreen';
import WatchListFormScreen from '../modules/watchlist/screens/WatchListFormScreen';
import { OverseerGoalsScreen } from '../modules/overseergoals/screens/OverseerGoalsScreen';
import AddOverseerGoalsScreen from '../modules/overseergoals/screens/AddOverseerGoalsScreen';
import DeleteOverseerGoalPeriodScreen from '../modules/overseergoals/screens/DeleteOverseerGoalPeriodScreen';
import EditOverseerGoalDefaultsScreen from '../modules/overseergoals/screens/EditOverseerGoalDefaultsScreen';
import { GenerateReportsScreen } from '../modules/report/screens/GenerateReportsScreen';
import { ChurchesPlantedLast10YearsScreen } from '../modules/dashboard/screens/ChurchesPlantedLast10YearsScreen';
 
import AddChurchNetworkScreen from '../modules/churchnetwork/screens/AddChurchNetworkScreen';
import EditChurchNetworkScreen from '../modules/churchnetwork/screens/EditChurchNetworkScreen';
import DeleteChurchNetworkScreen from '../modules/churchnetwork/screens/DeleteChurchNetworkScreen';
import ChurchNetworksScreen from '../modules/churchnetwork/screens/ChurchNetworksScreen';
import ChurchRegionsScreen from '../modules/churchregion/screens/ChurchRegionsScreen';
import AddChurchRegionScreen from '../modules/churchregion/screens/AddChurchRegionScreen';
import EditChurchRegionScreen from '../modules/churchregion/screens/EditChurchRegionScreen';
import DeleteChurchRegionScreen from '../modules/churchregion/screens/DeleteChurchRegionScreen';
import GeographicalRegionsScreen from '../modules/geographicalregion/screens/GeographicalRegionsScreen';
import AddGeographicalRegionScreen from '../modules/geographicalregion/screens/AddGeographicalRegionScreen';
import EditGeographicalRegionScreen from '../modules/geographicalregion/screens/EditGeographicalRegionScreen';
import DeleteGeographicalRegionScreen from '../modules/geographicalregion/screens/DeleteGeographicalRegionScreen';
import ChurchTypesScreen from '../modules/churchtype/screens/ChurchTypesScreen';
import AddChurchTypeScreen from '../modules/churchtype/screens/AddChurchTypeScreen';
import EditChurchTypeScreen from '../modules/churchtype/screens/EditChurchTypeScreen';
import DeleteChurchTypeScreen from '../modules/churchtype/screens/DeleteChurchTypeScreen';
 
import LanguageRegionsScreen from '../modules/languageregion/screens/LanguageRegionsScreen';
import AddLanguageRegionScreen from '../modules/languageregion/screens/AddLanguageRegionScreen';
import EditLanguageRegionScreen from '../modules/languageregion/screens/EditLanguageRegionScreen';
import DeleteLanguageRegionScreen from '../modules/languageregion/screens/DeleteLanguageRegionScreen';
import { CountriesScreen } from '../modules/country/screens/CountriesScreen';
import LanguagesScreen from '../modules/language/screens/LanguagesScreen';
import AddLanguageScreen from '../modules/language/screens/AddLanguageScreen';
import EditLanguageScreen from '../modules/language/screens/EditLanguageScreen';
import DeleteLanguageScreen from '../modules/language/screens/DeleteLanguageScreen';
import SearchResourcesScreen from '../modules/resources/screens/SearchResourcesScreen';
import ResourceDetailScreen from '../modules/resources/screens/ResourceDetailScreen';
import AddNewResourceScreen from '../modules/resources/screens/AddNewResourceScreen';
import RelatingSearchScreen from '../modules/relating/screens/RelatingSearchScreen';
import RelatingDetailsScreen from '../modules/relating/screens/RelatingDetailsScreen';
import RelatingMultiUserRestrictionsScreen from '../modules/relating/screens/RelatingMultiUserRestrictionsScreen';
import { FAQScreen } from '../modules/dashboard/screens/FAQScreen';
import FAQsScreen from '../modules/faq/screens/FAQsScreen';
import SearchFAQScreen from '../modules/faq/screens/SearchFAQScreen';
import FAQDetailScreen from '../modules/faq/screens/FAQDetailScreen';
import AddFAQScreen from '../modules/faq/screens/AddFAQScreen';
import EditFAQScreen from '../modules/faq/screens/EditFAQScreen';
import DeleteFAQScreen from '../modules/faq/screens/DeleteFAQScreen';
import { EventTypeScreen } from '../modules/dashboard/screens/EventTypeScreen';
import EventTypesScreen from '../modules/eventTypes/screens/EventTypesScreen';
import EventTypeDetailScreen from '../modules/eventTypes/screens/EventTypeDetailScreen';
import AddEventTypeScreen from '../modules/eventTypes/screens/AddEventTypeScreen';
import EditEventTypeScreen from '../modules/eventTypes/screens/EditEventTypeScreen';
import DeleteEventTypeScreen from '../modules/eventTypes/screens/DeleteEventTypeScreen';
import { PushMailScreen } from '../modules/dashboard/screens/PushMailScreen';
import { SettingsScreen } from '../modules/dashboard/screens/SettingsScreen';
import { PermissionExamplesScreen } from '../shared/screens/PermissionExamplesScreen';
import GeneralScreen from '../modules/setting/screens/GeneralScreen';
import BibleVerseScreen from '../modules/setting/screens/BibleVerseScreen';
import RationalisingScreen from '../modules/setting/screens/RationalisingScreen';
import { ProfileScreen } from '../modules/user/screens/ProfileScreen';
import { SwitchUserScreen } from '../modules/user/screens/SwitchUserScreen';
import NotificationsScreen from '../modules/notifications/screens/NotificationsScreen';
import { SupportScreen } from '../modules/dashboard/screens/SupportScreen';
import { OmrSupportScreen } from '../modules/omrsupport/screens/OmrSupportScreen';
import { AboutOmrScreen } from '../modules/aboutomr/screens/AboutOmrScreen';
import { UserListScreen } from '../modules/user/screens/UserListScreen';
import DeleteUserScreen from '../modules/user/screens/DeleteUserScreen';
import EditCountryScreen from '../modules/country/screens/EditCountryScreen';
import DeleteCountryScreen from '../modules/country/screens/DeleteCountryScreen';
import AddCountryScreen from '../modules/country/screens/AddCountryScreen';
import WorshipServicesScreen from '../modules/worshipservices/screens/WorshipServicesScreen';
import WorshipServiceDetailScreen from '../modules/worshipservices/screens/WorshipServiceDetailScreen';
import DeleteWorshipServiceScreen from '../modules/worshipservices/screens/DeleteWorshipServiceScreen';
import AddWorshipServiceScreen from '../modules/worshipservices/screens/AddWorshipServiceScreen';
import EditWorshipServiceScreen from '../modules/worshipservices/screens/EditWorshipServiceScreen';
import ChurchPlantingProjectionsScreen from '../modules/churchplantingprojections/screens/ChurchPlantingProjectionsScreen';
import ChurchPlantingProjectionDetailScreen from '../modules/churchplantingprojections/screens/ChurchPlantingProjectionDetailScreen';
import AddChurchPlantingProjectionScreen from '../modules/churchplantingprojections/screens/AddChurchPlantingProjectionScreen';
import EditChurchPlantingProjectionScreen from '../modules/churchplantingprojections/screens/EditChurchPlantingProjectionScreen';
import DeleteChurchPlantingProjectionScreen from '../modules/churchplantingprojections/screens/DeleteChurchPlantingProjectionScreen';
import EditStepsChartScreen from '../modules/churchplantingprojections/screens/EditStepsChartScreen';
import VisitsScreen from '../modules/visits/screens/VisitsScreen';
import VisitDetailScreen from '../modules/visits/screens/VisitDetailScreen';
import AddVisitsScreen from '../modules/visits/screens/AddVisitsScreen';
import AddVisitsDetailsScreen from '../modules/visits/screens/AddVisitsDetailsScreen';
import DeleteVisitScreen from '../modules/visits/screens/DeleteVisitScreen';
import EditVisitDetailsScreen from '../modules/visits/screens/EditVisitDetailsScreen';
import MonthlyDataSelectScreen from '../modules/monthlydata/screens/MonthlyDataSelectScreen';
import MonthlyDataEntryScreen from '../modules/monthlydata/screens/MonthlyDataEntryScreen';
import { RoleChangeRequestsScreen } from '../modules/user/screens/RoleChangeRequestsScreen';
import { RoleChangeRequestDetailScreen } from '../modules/user/screens/RoleChangeRequestDetailScreen';

const OverseerGoalDetailScreen =
  require('../modules/overseergoals/screens/OverseerGoalDetailScreen').default;
const EditOverseerGoalsScreen =
  require('../modules/overseergoals/screens/EditOverseerGoalsScreen').default;
const EditVisitScreen =
  require('../modules/visits/screens/EditVisitScreen').default;

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Create a context for authentication
export const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
});

export default function Navigation() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('switchSessionReset', () => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{name: 'Dashboard'}],
        });
      }
    });
    return () => subscription.remove();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const biometricEnabled = await isBiometricLoginEnabled();
      if (biometricEnabled) {
        // Keep the stored session, but require biometric unlock on the Login
        // screen (button + auto-prompt). Do not change behaviour for users
        // who never enabled biometrics.
        setIsAuthenticated(false);
        return;
      }

      // Existing behaviour, unchanged for users who never enabled biometrics.
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      <NavigationContainer ref={navigationRef}>
        <NetworkReloadListener />
        <View style={{ flex: 1 }}>
        <NetworkStatusBar />
        {/* Nested provider sits below the status strip, so screens' SafeAreaViews
            measure their top inset from here: no double gap while the strip shows. */}
        <SafeAreaProvider style={{ flex: 1 }}>
        {isAuthenticated ? <SwitchSessionBar /> : null}
        {isAuthenticated ? <NotificationListener /> : null}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="AddUser" component={AddUserScreen} />
              <Stack.Screen name="SwitchUser" component={SwitchUserScreen} />
              <Stack.Screen name="AddChurch" component={AddChurchScreen} />
              <Stack.Screen name="AddCloneChurch" component={AddCloneChurchScreen} />
              <Stack.Screen name="CloneChurch" component={CloneChurchScreen} />
              <Stack.Screen name="EditChurch" component={EditChurchScreen} />
              <Stack.Screen name="EditChurchLocation" component={EditChurchLocationScreen} />
              <Stack.Screen name="ChurchDetail" component={ChurchDetailScreen} />
              <Stack.Screen name="DisableChurch" component={DisableChurchScreen} />
              <Stack.Screen name="DisableChurches" component={ListDisableChurchScreen} />
              <Stack.Screen name="EnableChurch" component={EnableChurchScreen} />
              <Stack.Screen name="Overseer" component={OverseerScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="EnterVisits" component={AddVisitsScreen} />
              <Stack.Screen name="Visits" component={VisitsScreen} />
              <Stack.Screen name="VisitDetail" component={VisitDetailScreen} />
              <Stack.Screen name="EditVisit" component={EditVisitScreen} />
              <Stack.Screen name="EditVisitDetails" component={EditVisitDetailsScreen} />
              <Stack.Screen name="AddVisits" component={AddVisitsScreen} />
              <Stack.Screen name="AddVisitsDetails" component={AddVisitsDetailsScreen} />
              <Stack.Screen name="DeleteVisit" component={DeleteVisitScreen} />
              <Stack.Screen name="NewPastorAndChurch" component={NewPastorAndChurchScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              {/* New screens */}
              <Stack.Screen name="User" component={UserScreen} />
              <Stack.Screen name="UserRoles" component={UserRolesScreen} />
              <Stack.Screen name="Overseers" component={ListOverseerScreen} />
              <Stack.Screen name="Churches" component={ChurchesListScreen} />
              <Stack.Screen name="WatchList" component={WatchListScreen} />
              <Stack.Screen name="WatchListDetail" component={WatchListDetailScreen} />
              <Stack.Screen name="WatchListForm" component={WatchListFormScreen} />
              <Stack.Screen name="OverseerGoals" component={OverseerGoalsScreen} />
              <Stack.Screen name="AddOverseerGoals" component={AddOverseerGoalsScreen} />
              <Stack.Screen name="OverseerGoalDetail" component={OverseerGoalDetailScreen} />
              <Stack.Screen
                name="DeleteOverseerGoalPeriod"
                component={DeleteOverseerGoalPeriodScreen}
              />
              <Stack.Screen
                name="EditOverseerGoalDefaults"
                component={EditOverseerGoalDefaultsScreen}
              />
              <Stack.Screen
                name="EditOverseerGoals"
                component={EditOverseerGoalsScreen}
              />
              <Stack.Screen name="GenerateReports" component={GenerateReportsScreen} />
              <Stack.Screen
                name="ChurchesPlantedLast10Years"
                component={ChurchesPlantedLast10YearsScreen}
              />

              <Stack.Screen name="ChurchNetworks" component={ChurchNetworksScreen} />
      <Stack.Screen name="ChurchRegions" component={ChurchRegionsScreen} />
      <Stack.Screen name="AddChurchRegion" component={AddChurchRegionScreen} />
      <Stack.Screen name="EditChurchRegion" component={EditChurchRegionScreen} />
      <Stack.Screen name="DeleteChurchRegion" component={DeleteChurchRegionScreen} />
              <Stack.Screen name="GeographicalRegions" component={GeographicalRegionsScreen} />
              <Stack.Screen name="AddGeographicalRegion" component={AddGeographicalRegionScreen} />
              <Stack.Screen name="EditGeographicalRegion" component={EditGeographicalRegionScreen} />
              <Stack.Screen name="DeleteGeographicalRegion" component={DeleteGeographicalRegionScreen} />
              <Stack.Screen name="AddChurchNetwork" component={AddChurchNetworkScreen} />
              <Stack.Screen name="EditChurchNetwork" component={EditChurchNetworkScreen} />
              <Stack.Screen name="DeleteChurchNetwork" component={DeleteChurchNetworkScreen} />
              <Stack.Screen name="ChurchTypes" component={ChurchTypesScreen} />
              <Stack.Screen name="AddChurchType" component={AddChurchTypeScreen} />
              <Stack.Screen name="EditChurchType" component={EditChurchTypeScreen} />
              <Stack.Screen name="DeleteChurchType" component={DeleteChurchTypeScreen} />
              
              <Stack.Screen name="LanguageRegions" component={LanguageRegionsScreen} />
              <Stack.Screen name="AddLanguageRegion" component={AddLanguageRegionScreen} />
              <Stack.Screen name="EditLanguageRegion" component={EditLanguageRegionScreen} />
              <Stack.Screen name="DeleteLanguageRegion" component={DeleteLanguageRegionScreen} />
              <Stack.Screen name="Countries" component={CountriesScreen} />
              <Stack.Screen name="Languages" component={LanguagesScreen} />
              <Stack.Screen name="AddLanguage" component={AddLanguageScreen} />
              <Stack.Screen name="EditLanguage" component={EditLanguageScreen} />
              <Stack.Screen name="DeleteLanguage" component={DeleteLanguageScreen} />
              <Stack.Screen name="Resources" component={SearchResourcesScreen} />
              <Stack.Screen name="ResourceDetail" component={ResourceDetailScreen} />
              <Stack.Screen name="AddNewResource" component={AddNewResourceScreen} />
              <Stack.Screen name="EditResource" component={AddNewResourceScreen} />
              <Stack.Screen name="RelatingSearch" component={RelatingSearchScreen} />
              <Stack.Screen name="RelatingDetails" component={RelatingDetailsScreen} />
              <Stack.Screen
                name="RelatingMultiUserRestrictions"
                component={RelatingMultiUserRestrictionsScreen}
              />
              <Stack.Screen name="FAQ" component={FAQScreen} />
              <Stack.Screen name="FAQs" component={FAQsScreen} />
              <Stack.Screen name="SearchFAQ" component={SearchFAQScreen} />
              <Stack.Screen name="FAQDetail" component={FAQDetailScreen} />
              <Stack.Screen name="AddFAQ" component={AddFAQScreen} />
              <Stack.Screen name="EditFAQ" component={EditFAQScreen} />
              <Stack.Screen name="DeleteFAQ" component={DeleteFAQScreen} />
              <Stack.Screen name="EventType" component={EventTypeScreen} />
              <Stack.Screen name="EventTypes" component={EventTypesScreen} />
              <Stack.Screen name="EventTypeDetail" component={EventTypeDetailScreen} />
              <Stack.Screen name="AddEventType" component={AddEventTypeScreen} />
              <Stack.Screen name="EditEventType" component={EditEventTypeScreen} />
              <Stack.Screen name="DeleteEventType" component={DeleteEventTypeScreen} />
              <Stack.Screen name="PushMail" component={PushMailScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="OmrSupport" component={OmrSupportScreen} />
              <Stack.Screen name="AboutOmr" component={AboutOmrScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="PermissionExamples" component={PermissionExamplesScreen} />
              <Stack.Screen name="SettingsGeneral" component={GeneralScreen} />
              <Stack.Screen name="SettingsBibleVerse" component={BibleVerseScreen} />
              <Stack.Screen name="SettingsRationalising" component={RationalisingScreen} />
              <Stack.Screen name="UserList" component={UserListScreen} />
              <Stack.Screen name="DeleteUser" component={DeleteUserScreen} />
              <Stack.Screen name="ChangePasswordForOtherUser" component={ChangePasswordForOtherUserScreen} />
              <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
              <Stack.Screen name="DashboardPastorLeader" component={DashboardPastorLeaderScreen} />
              <Stack.Screen name="ChurchAttendanceChart" component={ChurchAttendanceChartScreen} />
              <Stack.Screen
                name="OverseerChurchAttendanceChart"
                component={OverseerChurchAttendanceChartScreen}
              />
              <Stack.Screen
                name="PastoralVisitsChart"
                component={PastoralVisitsChartScreen}
              />
              <Stack.Screen
                name="OverseerChurchesPlantedLast10Years"
                component={OverseerChurchesPlantedLast10YearsScreen}
              />
              <Stack.Screen name="ChurchGivingChart" component={ChurchGivingChartScreen} />
              <Stack.Screen
                name="AttendanceAndGivingCharts"
                component={AttendanceAndGivingChartsScreen}
              />
              <Stack.Screen name="EditCountry" component={EditCountryScreen} />
              <Stack.Screen name="DeleteCountry" component={DeleteCountryScreen} />
              <Stack.Screen name="AddCountry" component={AddCountryScreen} />
              <Stack.Screen name="WorshipServices" component={WorshipServicesScreen} />
              <Stack.Screen name="WorshipServiceDetail" component={WorshipServiceDetailScreen} />
              <Stack.Screen name="DeleteWorshipService" component={DeleteWorshipServiceScreen} />
              <Stack.Screen name="AddWorshipService" component={AddWorshipServiceScreen} />
              <Stack.Screen name="EditWorshipService" component={EditWorshipServiceScreen} />
              <Stack.Screen name="ChurchPlantingProjections" component={ChurchPlantingProjectionsScreen} />
              <Stack.Screen name="ChurchPlantingProjectionDetail" component={ChurchPlantingProjectionDetailScreen} />
              <Stack.Screen name="AddChurchPlantingProjection" component={AddChurchPlantingProjectionScreen} />
              <Stack.Screen name="EditChurchPlantingProjection" component={EditChurchPlantingProjectionScreen} />
              <Stack.Screen name="DeleteChurchPlantingProjection" component={DeleteChurchPlantingProjectionScreen} />
              <Stack.Screen name="EditStepsChart" component={EditStepsChartScreen} />
              <Stack.Screen name="MonthlyDataSelect" component={MonthlyDataSelectScreen} />
              <Stack.Screen name="MonthlyDataEntry" component={MonthlyDataEntryScreen} />
              <Stack.Screen name="RoleChangeRequests" component={RoleChangeRequestsScreen} />
              <Stack.Screen name="RoleChangeRequestDetail" component={RoleChangeRequestDetailScreen} />
            </>
          )}
        </Stack.Navigator>
        </SafeAreaProvider>
        </View>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
