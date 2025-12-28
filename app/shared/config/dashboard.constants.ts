import { ImageSourcePropType } from 'react-native';
import { CommonMenuItem } from '../interfaces/MenuItem';
import api from '../../config/api';
import { isSuperAdmin } from '../utils/permissions';
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

// Function to get translated menu items
export const getTranslatedMenuItems = (languageCode: LanguageCode = 'en', userRoleId?: number): CommonMenuItem[] => {
  const t = (key: TranslationKey): string => {
    const dict = translations[languageCode] as Record<string, string>;
    return dict[key] || translations.en[key] || key;
  };

  const isSuperAdminUser = isSuperAdmin(userRoleId);

  return [
    { label: t('myDashboard'), routeName: 'Dashboard' },
    {
      label: t('users'),
      children: [
        { label: t('all'), routeName: 'UserList' },
        // Overseers item will be conditionally displayed in MenuPopup by permission
        { label: t('overseers'), routeName: 'Overseers' },
        { label: t('addNewPastor'), routeName: 'AddUser' },
        { label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch' },
      ],
    },
    // {
    //   label: t('userRoles'),
    //   disabled: true,
    //   children: [
    //     { label: t('list'), routeName: 'UserRoles' },
    //     { label: t('addNew'), routeName: 'UserRoles' },
    //   ],
    // },
    // { label: t('switchUser'), disabled: true, routeName: 'SwitchUser' },
    {
      label: t('churches'),
      children: [
        { label: t('list'), routeName: 'Churches' },
        { label: t('addNewChurch'), routeName: 'AddChurch' },
        { label: t('addNewChurchAndPastor'), routeName: 'NewPastorAndChurch' },
        { label: t('addNewClonedChurch'), routeName: 'CloneChurch' },
        { label: t('disabledChurches'), routeName: 'DisableChurches' },
        // { label: t('townDescriptorReport'), routeName: 'GenerateReports' },

      ],
    },
    // {
    //   label: t('watchList'),
    //   disabled: true,
    //   children: [
    //     { label: t('viewMyWatchlists'), routeName: 'WatchList' },
    //     { label: t('addNewWatchlist'), routeName: 'WatchList' },
    //     { label: t('generateReports'), routeName: 'GenerateReports' },
    //   ],
    // },
    // {
    //   label: t('overseerGoals'),
    //   disabled: true,
    //   children: [
    //     { label: t('add'), routeName: 'OverseerGoals' },
    //     { label: t('list'), routeName: 'OverseerGoals' },
    //     { label: t('editDefaults'), routeName: 'OverseerGoals' },
    //   ],
    // },
    {
      label: t('generateReports'),
      children: [
        { label: t('churchReports'), routeName: 'GenerateReports' },
        { label: t('churchesReportingStatus'), routeName: 'GenerateReports' },
        { label: t('multiChurchReports'), routeName: 'GenerateReports' },
        { label: t('leadersSpreadsheetReports'), routeName: 'GenerateReports' },
        { label: t('leadersGraphReports'), routeName: 'GenerateReports' },
        { label: t('myDirectory'), routeName: 'GenerateReports' },
        { label: t('uaogPublicSearchLog'), routeName: 'GenerateReports' },
        { label: t('overseerRegGoalsOnly'), routeName: 'GenerateReports' },
        { label: t('overseerGoalsActuals'), routeName: 'GenerateReports' },
        { label: t('overseerGoals3Year'), routeName: 'GenerateReports' },
        { label: t('overseerGoalsActuals3Yrs'), routeName: 'GenerateReports' },
        { label: t('overseerAccessRightsReport'), routeName: 'GenerateReports' },
        { label: t('visitReports'), routeName: 'GenerateReports' },
      ],
    },
    ...(isSuperAdminUser ? [
      {
        label: t('churchNetworks'),
        children: [
          { label: t('list'), routeName: 'ChurchNetworks' },
          { label: t('addNew'), routeName: 'AddChurchNetwork' },
        ],
      },
      {
        label: t('churchTypes'),
        children: [
          { label: t('list'), routeName: 'ChurchTypes' },
          { label: t('addNew'), routeName: 'AddChurchType' },
        ],
      },
      {
        label: t('churchApostolicRegions'),
        children: [
          { label: t('list'), routeName: 'ChurchRegions' },
          { label: t('addNew'), routeName: 'AddChurchRegion' },
        ],
      },
    ] : []),
    // {
    //   label: t('geographicalRegions'),
    //   disabled: true,
    //   children: [
    //     { label: t('list'), routeName: 'ChurchApostolicRegions' },
    //     { label: t('addNew'), routeName: 'ChurchApostolicRegions' },
    //   ],
    // },
    ...(isSuperAdminUser ? [
      {
        label: t('languageRegions'),
        children: [
          { label: t('list'), routeName: 'LanguageRegions' },
          { label: t('addNew'), routeName: 'AddLanguageRegion' },
        ],
      },
      {
        label: t('countries'),
        children: [
          { label: t('list'), routeName: 'Countries' },
          { label: t('addNew'), routeName: 'AddCountry' },
        ],
      },
      {
        label: t('languages'),
        children: [
          { label: t('list'), routeName: 'Languages' },
          { label: t('addNew'), routeName: 'AddLanguage' },
        ],
      },
    ] : []),
    // {
    //   label: t('resources'),
    //   disabled: true,
    //   children: [
    //     { label: t('search'), routeName: 'Resources' },
    //     { label: t('addNewResource'), routeName: 'Resources' },
    //     { label: t('editAddTopicList'), routeName: 'Resources' },
    //   ],
    // },
    // {
    //   label: t('relating'),
    //   disabled: true,
    //   children: [
    //     { label: t('search'), routeName: 'Relating' },
    //     { label: t('viewEditMyRelatingDetails'), routeName: 'Relating' },
    //     { label: t('multiUserRestrictions'), routeName: 'Relating' },
    //   ],
    // },
    // {
    //   label: t('faq'),
    //   disabled: true,
    //   children: [
    //     { label: t('createFaq'), routeName: 'FAQ' },
    //     { label: t('searchFaq'), routeName: 'FAQ' },
    //     { label: t('listFaq'), routeName: 'FAQ' },
    //   ],
    // },
    // {
    //   label: t('eventType'),
    //   disabled: true,
    //   children: [
    //     { label: t('addTypeOfVisit'), routeName: 'EventType' },
    //     { label: t('viewEventType'), routeName: 'EventType' },
    //   ],
    // },
    // {
    //   label: t('pushMail'),
    //   disabled: true,
    //   children: [
    //     { label: t('search'), routeName: 'PushMail' },
    //   ],
    // },
    // { label: t('support'), disabled: true, routeName: 'Support' },
    {
      label: t('settings'),
      children: [
        { label: t('general'), routeName: 'SettingsGeneral' },
        { label: t('bibleVerse'), routeName: 'SettingsBibleVerse' },
        // { label: t('rationalisingTownNames'), routeName: 'SettingsRationalising' },
      ],
    },
  ];
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


