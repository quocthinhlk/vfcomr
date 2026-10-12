import { ImageSourcePropType } from 'react-native';
import { CommonMenuItem } from '../interfaces/MenuItem';
import api from '../../config/api';
import { isSuperAdmin, isPastorLeader } from '../utils/permissions';
import { translations, TranslationKey, LanguageCode } from '../translations';

const iconChurch = require('../../assets/images/icon/church.png');
const iconRelated = require('../../assets/images/icon/related.png');
const iconCountry = require('../../assets/images/icon/church.png');
const iconDashboard = require('../../assets/images/icon/dashboard.png');
const iconEvent = require('../../assets/images/icon/event.png');
const iconFaq = require('../../assets/images/icon/faq.png');
const iconGoals = require('../../assets/images/icon/goals.png');
const iconGroups = require('../../assets/images/icon/groups.png');
const iconHelp = require('../../assets/images/icon/help.png');
const iconLanguage = require('../../assets/images/icon/language.png');
const iconList = require('../../assets/images/icon/list.png');
const iconMail = require('../../assets/images/icon/mail.png');
const iconNetwork = require('../../assets/images/icon/network.png');
const iconProfile = require('../../assets/images/icon/profile.png');
const iconRegion = require('../../assets/images/icon/region.png');
const iconReport = require('../../assets/images/icon/report.png');
const iconResource = require('../../assets/images/icon/resource.png');
const iconRoles = require('../../assets/images/icon/roles.png');
const iconSetting = require('../../assets/images/icon/setting.png');
const iconSwitch = require('../../assets/images/icon/switch.png');
const iconType = require('../../assets/images/icon/type.png');

// Add missing image constants used below
const iconUp = require('../../assets/images/icon-up.png');
const iconDownPng = require('../../assets/images/icon-down.png');
const iconUser = require('../../assets/images/user.png');
const iconPeople = require('../../assets/images/people.png');
const iconGrowth = require('../../assets/images/growth.png');
const iconNations = require('../../assets/images/nations.png');
const iconPlanting = require('../../assets/images/planting.png');
const iconRecording = require('../../assets/images/record.png');
const iconEdit = require('../../assets/images/edit.png');

type TFunc = (key: TranslationKey) => string;

const getReportMenuItem = (t: TFunc): CommonMenuItem => ({
  label: t('generateReports'),
  children: [
    {label: t('reportGroupChurch'), routeName: 'GenerateReports', params: {group: 'church'}},
    {
      label: t('reportGroupChurchGraph'),
      routeName: 'GenerateReports',
      params: {group: 'church_reports_graph_reports'},
    },
    {label: t('reportGroupVisit'), routeName: 'GenerateReports', params: {group: 'visit_report'}},
    {
      label: t('reportGroupStatus'),
      routeName: 'GenerateReports',
      params: {group: 'church_report_status'},
    },
    {
      label: t('reportGroupMultiChurch'),
      routeName: 'GenerateReports',
      params: {group: 'multi_church'},
    },
    {label: t('reportGroupUserData'), routeName: 'GenerateReports', params: {group: 'user_data'}},
    {label: t('reportGroupUserGraph'), routeName: 'GenerateReports', params: {group: 'user_graph'}},
    {label: t('reportGroupEvent'), routeName: 'GenerateReports', params: {group: 'event'}},
    {
      label: t('reportGroupDirectory'),
      routeName: 'GenerateReports',
      params: {group: 'my_directory'},
    },
  ],
});

const getPastorMenuItems = (t: TFunc): CommonMenuItem[] => [
  {
    label: t('myChurchProfile'),
    children: [
      {label: t('myDashboard'), routeName: 'Dashboard'},
      // {label: t('churchAttendanceChart'), routeName: 'ChurchAttendanceChart'},
      // {label: t('churchGivingChart'), routeName: 'ChurchGivingChart'},
      {label: t('worshipServices'), routeName: 'WorshipServices'},
      // {label: t('last4WeeksDetails'), routeName: 'Dashboard'},
      // {label: t('multiServiceChurchDetails'), routeName: 'Dashboard'},
      // {label: t('daughterChurchesList'), routeName: 'Dashboard'},
      // {label: t('otherPastorLeadersInChurch'), routeName: 'Dashboard'},
      // {label: t('churchPlantingProjections'), routeName: 'ChurchPlantingProjections'},
      // {label: t('geographicLocationOnMap'), routeName: 'Dashboard'},
      // {label: t('attachments'), routeName: 'Dashboard'},
    ],
  },
  {
    label: t('watchLists'),
    children: [
      {label: t('viewMyWatchlists'), routeName: 'WatchList'},
      {label: t('addNewWatchlist'), routeName: 'WatchListForm'},
    ],
  },
  {
    label: t('pastorsLeadersListMenu'),
    children: [
      {label: t('all'), routeName: 'UserList'},
      {label: t('overseers'), routeName: 'Overseers'},
      {label: t('addNewPastor'), routeName: 'AddUser'},
      {label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch'},
    ],
  },
  {
    label: t('churchesListMenu'),
    children: [
      {label: t('list'), routeName: 'Churches'},
      {label: t('addNewChurch'), routeName: 'AddChurch'},
      {label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch'},
      {label: t('addNewClonedChurch'), routeName: 'CloneChurch'},
      {label: t('disabledChurches'), routeName: 'DisableChurches'},
    ],
  },
  {
    label: t('churchPlantingProjections'),
    children: [
      {label: t('addProjections'), routeName: 'AddChurchPlantingProjection'},
      {label: t('viewProjections'), routeName: 'ChurchPlantingProjections'},
    ],
  },
  getReportMenuItem(t),
  {
    label: t('relating'),
    children: [
      {label: t('search'), routeName: 'RelatingSearch'},
      {label: t('viewEditMyRelatingDetails'), routeName: 'RelatingDetails'},
    ],
  },
  {
    label: t('resources'),
    children: [
      {label: t('search'), routeName: 'Resources'},
    ],
  },
  {
    label: t('faq'),
    children: [
      {label: t('searchFaq'), routeName: 'SearchFAQ'},
      {label: t('listFaq'), routeName: 'FAQs'},
    ],
  },
  {
    label: t('settings'),
    children: [
      {label: t('general'), routeName: 'SettingsGeneral'},
      {label: t('bibleVerse'), routeName: 'SettingsBibleVerse'},
    ],
  },
  {label: t('omrSupport'), routeName: 'OmrSupport'},
];

const getSuperAdminMenuItems = (t: TFunc): CommonMenuItem[] => [
  {label: t('myDashboard'), routeName: 'Dashboard'},
  {
    label: t('watchLists'),
    children: [
      {label: t('viewMyWatchlists'), routeName: 'WatchList'},
      {label: t('addNewWatchlist'), routeName: 'WatchListForm'},
    ],
  },
  {
    label: t('users'),
    children: [
      {label: t('all'), routeName: 'UserList'},
      {label: t('overseers'), routeName: 'Overseers'},
      {label: t('addNewPastor'), routeName: 'AddUser'},
      {label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch'},
      {label: t('roleChangeRequests') || 'Role Change Requests', routeName: 'RoleChangeRequests'},
    ],
  },
  {label: t('switchUser'), routeName: 'SwitchUser'},
  {
    label: t('churches'),
    children: [
      {label: t('list'), routeName: 'Churches'},
      {label: t('addNewChurch'), routeName: 'AddChurch'},
      {label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch'},
      {label: t('addNewClonedChurch'), routeName: 'CloneChurch'},
      {label: t('disabledChurches'), routeName: 'DisableChurches'},
    ],
  },
  {
    label: t('overseerGoals'),
    children: [
      {label: t('list'), routeName: 'OverseerGoals'},
      {label: t('addNew'), routeName: 'AddOverseerGoals'},
      // {label: t('editDefaults'), routeName: 'EditOverseerGoalDefaults'},
    ],
  },
  getReportMenuItem(t),
  {
    label: t('churchNetworks'),
    children: [
      {label: t('list'), routeName: 'ChurchNetworks'},
      {label: t('addNew'), routeName: 'AddChurchNetwork'},
    ],
  },
  {
    label: t('churchTypes'),
    children: [
      {label: t('list'), routeName: 'ChurchTypes'},
      {label: t('addNew'), routeName: 'AddChurchType'},
    ],
  },
  {
    label: t('churchApostolicRegions'),
    children: [
      {label: t('list'), routeName: 'ChurchRegions'},
      {label: t('addNew'), routeName: 'AddChurchRegion'},
    ],
  },
  {
    label: t('geographicalRegions'),
    children: [
      {label: t('list'), routeName: 'GeographicalRegions'},
      {label: t('addNew'), routeName: 'AddGeographicalRegion'},
    ],
  },
  {
    label: t('languageRegions'),
    children: [
      {label: t('list'), routeName: 'LanguageRegions'},
      {label: t('addNew'), routeName: 'AddLanguageRegion'},
    ],
  },
  {
    label: t('countries'),
    children: [
      {label: t('list'), routeName: 'Countries'},
      {label: t('addNew'), routeName: 'AddCountry'},
    ],
  },
  {
    label: t('languages'),
    children: [
      {label: t('list'), routeName: 'Languages'},
      {label: t('addNew'), routeName: 'AddLanguage'},
    ],
  },
  {
    label: t('resources'),
    children: [
      {label: t('search'), routeName: 'Resources'},
      {label: t('addNewResource'), routeName: 'AddNewResource'},
    ],
  },
  {
    label: t('relating'),
    children: [
      {label: t('search'), routeName: 'RelatingSearch'},
      {label: t('viewEditMyRelatingDetails'), routeName: 'RelatingDetails'},
      {label: t('multiUserRestrictions'), routeName: 'RelatingMultiUserRestrictions'},
    ],
  },
  {
    label: t('faq'),
    children: [
      {label: t('listFaq'), routeName: 'FAQs'},
      {label: t('searchFaq'), routeName: 'SearchFAQ'},
      {label: t('createFaq'), routeName: 'AddFAQ'},
    ],
  },
  {
    label: t('eventType'),
    children: [
      {label: t('list') || 'List', routeName: 'EventTypes'},
      {label: t('addNew') || 'Add New', routeName: 'AddEventType'},
    ],
  },
  {
    label: t('settings'),
    children: [
      {label: t('general'), routeName: 'SettingsGeneral'},
      {label: t('bibleVerse'), routeName: 'SettingsBibleVerse'},
    ],
  },
];

const getDefaultMenuItems = (t: TFunc): CommonMenuItem[] => [
  {label: t('myDashboard'), routeName: 'Dashboard'},
  {
    label: t('watchLists'),
    children: [
      {label: t('viewMyWatchlists'), routeName: 'WatchList'},
      {label: t('addNewWatchlist'), routeName: 'WatchListForm'},
    ],
  },
  {
    label: t('users'),
    children: [
      {label: t('all'), routeName: 'UserList'},
      {label: t('overseers'), routeName: 'Overseers'},
      {label: t('addNewPastor'), routeName: 'AddUser'},
      {label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch'},
    ],
  },
  {
    label: t('churches'),
    children: [
      {label: t('list'), routeName: 'Churches'},
      {label: t('addNewChurch'), routeName: 'AddChurch'},
      {label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch'},
      {label: t('addNewClonedChurch'), routeName: 'CloneChurch'},
      {label: t('disabledChurches'), routeName: 'DisableChurches'},
    ],
  },
  getReportMenuItem(t),
  // {
  //   label: t('visits'),
  //   children: [
  //     {label: t('list'), routeName: 'Visits'},
  //     {label: 'Add New Visitor', routeName: 'AddVisits'},
  //   ],
  // },
  {
    label: t('resources'),
    children: [
      {label: t('search'), routeName: 'Resources'},
    ],
  },
  {
    label: t('relating'),
    children: [
      {label: t('search'), routeName: 'RelatingSearch'},
      {label: t('viewEditMyRelatingDetails'), routeName: 'RelatingDetails'},
    ],
  },
  {
    label: t('faq'),
    children: [
      {label: t('searchFaq'), routeName: 'SearchFAQ'},
      {label: t('listFaq'), routeName: 'FAQs'},
    ],
  },
  {
    label: t('settings'),
    children: [
      {label: t('general'), routeName: 'SettingsGeneral'},
      {label: t('bibleVerse'), routeName: 'SettingsBibleVerse'},
    ],
  },
];

// Function to get translated menu items
export const getTranslatedMenuItems = (
  languageCode: LanguageCode = 'en',
  userRoleId?: number,
): CommonMenuItem[] => {
  const t = (key: TranslationKey): string => {
    const dict = translations[languageCode] as Record<string, string>;
    return dict[key] || translations.en[key] || key;
  };

  if (isPastorLeader(userRoleId)) {
    return getPastorMenuItems(t);
  }
  if (isSuperAdmin(userRoleId)) {
    return getSuperAdminMenuItems(t);
  }
  return getDefaultMenuItems(t);
};

export const dashboardMenuItems: CommonMenuItem[] = [
  { label: 'My Dashboard', routeName: 'Dashboard' },
  {
    label: 'Users',
    children: [
      { label: 'All', routeName: 'UserList' },
      { label: 'Overseers', routeName: 'Overseers' },
      { label: 'Add New Pastor', routeName: 'AddUser' },
      { label: 'Add New Church & New Pastor', routeName: 'NewPastorAndChurch' },
    ],
  },
  { label: 'Switch User', disabled: true, routeName: 'SwitchUser' },
  {
    label: 'Churches',
    children: [
      { label: 'List', routeName: 'Churches' },
      { label: 'Add New Church', routeName: 'AddChurch' },
      { label: 'Add New Church & New Pastor', routeName: 'NewPastorAndChurch' },
      { label: 'Add New Cloned Church', routeName: 'CloneChurch' },
      { label: 'Disabled Churches', routeName: 'DisableChurches' },
      { label: 'Town Descriptor Report', routeName: 'GenerateReports' },
    ],
  },
  { label: 'Support', disabled: true, routeName: 'Support' },
  {
    label: 'Settings',
    disabled: false,
    children: [
      { label: 'Bible Verse', routeName: 'Settings' },
      { label: 'Rationalising Town Names', routeName: 'Settings' },
    ],
  },
];

// New data for Dashboard redesign
export type UserProfile = {
  name: string;
  role: string;
  location: string;
  profileImage: string | ImageSourcePropType;
};

export const BLANK_AVATAR = require('../../assets/images/blank-avatar.png');

// Fetch current user's profile mapped to dashboard needs
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const res = await api.get('users/me');
    const d = res?.data?.data || {};
    const firstName = d?.first_name || '';
    const lastName = d?.last_name || '';
    const fullName = `${firstName}${firstName && lastName ? ' ' : ''}${lastName}` || d?.username || '';
    const roleName = (d?.role && d.role?.name) ? d.role.name : '';
    const location = d?.country_name || '';
    const photo = d?.photo_url;
    return {
      name: fullName,
      role: roleName,
      location,
      profileImage: photo || BLANK_AVATAR,
    };
  } catch {
    return {
      name: '',
      role: '',
      location: '',
      profileImage: BLANK_AVATAR,
    };
  }
}

export interface DashboardStatItem {
  value: string;
  label: string;
  icon: ImageSourcePropType;
}

export const dashboardStats: DashboardStatItem[] = [
  { value: '40', label: 'Churches', icon: iconChurch },
  { value: '500', label: 'People', icon: iconPeople },
  { value: '5%', label: 'Churches Growing', icon: iconGrowth },
  { value: '20', label: 'Churches Recording', icon: iconRecording },
  { value: '2', label: 'Nations', icon: iconNations },
  { value: '500', label: 'Churches with CGs', icon: iconChurch },
  { value: '300', label: 'Churches with GT/LIW', icon: iconChurch },
  { value: '20', label: 'Churches with MFP', icon: iconChurch },
  { value: '30', label: 'Churches Planting', icon: iconPlanting },
  { value: '530', label: 'Churches Visited', icon: iconRecording },
];

export const dashboardActions: CommonMenuItem[] = [
  { label: 'Enter Visits', icon: iconReport, routeName: 'EnterVisits' },
  { label: 'Edit Profile', icon: iconEdit, routeName: 'EditProfile' },
  { label: 'New Pastor & New Church', icon: iconChurch, routeName: 'NewPastorAndChurch' },
  { label: 'New Pastor', icon: iconUser, routeName: 'AddUser' },
  { label: 'New Church', icon: iconChurch, routeName: 'AddChurch' },
];

export const dashboardIcons = {
  iconUp,
  iconDown: iconDownPng,
  editIcon: require('../../assets/images/edit.png'),
};


