// app/config/navigation.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  EditChurch: { id: number } | undefined;
  ChurchDetail: { id: number } | undefined;
  Overseer: undefined;
  EditProfile: undefined;
  EnterVisits: undefined;
  NewPastorAndChurch: undefined;
  User: { userId?: number } | undefined;
  UserRoles: undefined;
  Churches: undefined;
  WatchList: undefined;
  OverseerGoals: undefined;
  GenerateReports: undefined;
  
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
  Resources: undefined;
  Relating: undefined;
  FAQ: undefined;
  EventType: undefined;
  PushMail: undefined;
  Settings: undefined;
  SettingsGeneral: undefined;
  SettingsBibleVerse: undefined;
  SettingsRationalising: undefined;
  Profile: undefined;
  SwitchUser: undefined;
  Support: undefined;
  UserList: undefined;
  DeleteUser: { userId: number } | undefined;
  EditCountry: { countryId: number } | undefined;
  DeleteCountry: { countryId: number } | undefined;
  AddCountry: undefined;
  ChangePasswordForOtherUser: { id: number } | undefined;
  DashboardPastorLeader: undefined;
  ChurchRegions: undefined;
  AddChurchRegion: undefined;
  EditChurchRegion: { churchRegionId: number } | undefined;
  DeleteChurchRegion: { churchRegionId: number } | undefined;
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
import OverseerScreen from '../modules/overseer/screens/OverseerScreen';
import EditProfileScreen from '../modules/user/screens/EditProfileScreen';
import EnterVisitsScreen from '../modules/report/screens/EnterVisitsScreen';
import NewPastorAndChurchScreen from '../modules/church/screens/NewPastorAndChurchScreen';
import ListOverseerScreen from '../modules/user/screens/ListOverseerScreen';

// New Screens Imports
import { UserScreen } from '../modules/user/screens/UserScreen';
import { UserRolesScreen } from '../modules/user/screens/UserRolesScreen';
import { ChurchesListScreen } from '../modules/church/screens/ListChurchScreen';
import ChangePasswordForOtherUserScreen from '../modules/user/screens/ChangePasswordForOtherUserScreen';
import DashboardPastorLeaderScreen from '../modules/dashboard/screens/DashboardPastorLeaderScreen';
import { WatchListScreen } from '../modules/dashboard/screens/WatchListScreen';
import { OverseerGoalsScreen } from '../modules/overseer/screens/OverseerGoalsScreen';
import { GenerateReportsScreen } from '../modules/report/screens/GenerateReportsScreen';
 
import AddChurchNetworkScreen from '../modules/churchnetwork/screens/AddChurchNetworkScreen';
import EditChurchNetworkScreen from '../modules/churchnetwork/screens/EditChurchNetworkScreen';
import DeleteChurchNetworkScreen from '../modules/churchnetwork/screens/DeleteChurchNetworkScreen';
import ChurchNetworksScreen from '../modules/churchnetwork/screens/ChurchNetworksScreen';
import ChurchRegionsScreen from '../modules/churchregion/screens/ChurchRegionsScreen';
import AddChurchRegionScreen from '../modules/churchregion/screens/AddChurchRegionScreen';
import EditChurchRegionScreen from '../modules/churchregion/screens/EditChurchRegionScreen';
import DeleteChurchRegionScreen from '../modules/churchregion/screens/DeleteChurchRegionScreen';
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
import { ResourcesScreen } from '../modules/dashboard/screens/ResourcesScreen';
import { RelatingScreen } from '../modules/dashboard/screens/RelatingScreen';
import { FAQScreen } from '../modules/dashboard/screens/FAQScreen';
import { EventTypeScreen } from '../modules/dashboard/screens/EventTypeScreen';
import { PushMailScreen } from '../modules/dashboard/screens/PushMailScreen';
import { SettingsScreen } from '../modules/dashboard/screens/SettingsScreen';
import GeneralScreen from '../modules/setting/screens/GeneralScreen';
import BibleVerseScreen from '../modules/setting/screens/BibleVerseScreen';
import RationalisingScreen from '../modules/setting/screens/RationalisingScreen';
import { ProfileScreen } from '../modules/user/screens/ProfileScreen';
import { SwitchUserScreen } from '../modules/user/screens/SwitchUserScreen';
import { SupportScreen } from '../modules/dashboard/screens/SupportScreen';
import { UserListScreen } from '../modules/user/screens/UserListScreen';
import DeleteUserScreen from '../modules/user/screens/DeleteUserScreen';
import EditCountryScreen from '../modules/country/screens/EditCountryScreen';
import DeleteCountryScreen from '../modules/country/screens/DeleteCountryScreen';
import AddCountryScreen from '../modules/country/screens/AddCountryScreen';

const Stack = createNativeStackNavigator();

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

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
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
      <NavigationContainer>
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
              <Stack.Screen name="ChurchDetail" component={ChurchDetailScreen} />
              <Stack.Screen name="DisableChurch" component={DisableChurchScreen} />
              <Stack.Screen name="DisableChurches" component={ListDisableChurchScreen} />
              <Stack.Screen name="EnableChurch" component={EnableChurchScreen} />
              <Stack.Screen name="Overseer" component={OverseerScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="EnterVisits" component={EnterVisitsScreen} />
              <Stack.Screen name="NewPastorAndChurch" component={NewPastorAndChurchScreen} />
              {/* New screens */}
              <Stack.Screen name="User" component={UserScreen} />
              <Stack.Screen name="UserRoles" component={UserRolesScreen} />
              <Stack.Screen name="Overseers" component={ListOverseerScreen} />
              <Stack.Screen name="Churches" component={ChurchesListScreen} />
              <Stack.Screen name="WatchList" component={WatchListScreen} />
              <Stack.Screen name="OverseerGoals" component={OverseerGoalsScreen} />
              <Stack.Screen name="GenerateReports" component={GenerateReportsScreen} />
              
              <Stack.Screen name="ChurchNetworks" component={ChurchNetworksScreen} />
      <Stack.Screen name="ChurchRegions" component={ChurchRegionsScreen} />
      <Stack.Screen name="AddChurchRegion" component={AddChurchRegionScreen} />
      <Stack.Screen name="EditChurchRegion" component={EditChurchRegionScreen} />
      <Stack.Screen name="DeleteChurchRegion" component={DeleteChurchRegionScreen} />
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
              <Stack.Screen name="Resources" component={ResourcesScreen} />
              <Stack.Screen name="Relating" component={RelatingScreen} />
              <Stack.Screen name="FAQ" component={FAQScreen} />
              <Stack.Screen name="EventType" component={EventTypeScreen} />
              <Stack.Screen name="PushMail" component={PushMailScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="SettingsGeneral" component={GeneralScreen} />
              <Stack.Screen name="SettingsBibleVerse" component={BibleVerseScreen} />
              <Stack.Screen name="SettingsRationalising" component={RationalisingScreen} />
              <Stack.Screen name="UserList" component={UserListScreen} />
              <Stack.Screen name="DeleteUser" component={DeleteUserScreen} />
              <Stack.Screen name="ChangePasswordForOtherUser" component={ChangePasswordForOtherUserScreen} />
              <Stack.Screen name="DashboardPastorLeader" component={DashboardPastorLeaderScreen} />
              <Stack.Screen name="EditCountry" component={EditCountryScreen} />
              <Stack.Screen name="DeleteCountry" component={DeleteCountryScreen} />
              <Stack.Screen name="AddCountry" component={AddCountryScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
