import React, { useCallback, useMemo, useState, useContext, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Platform, Animated, Easing, Modal, Alert, PermissionsAndroid, Text as RNText, ActivityIndicator, ActionSheetIOS, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Popover, MenuItem as UIKittenMenuItem, Button } from '@ui-kitten/components';
import {useNavigation, useRoute, useIsFocused} from '@react-navigation/native';
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
import { fs, ws, hs, ms, rs } from '../../../shared/utils/scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ZoomableImageModal from '../../../shared/components/ZoomableImageModal';
import {FlatListWithVerticalScrollbar} from '../../../shared/components/FlatListWithVerticalScrollbar';
import IosActionSheet from '../../../shared/components/IosActionSheet';
import {downloadImageToCameraRoll} from '../../../shared/utils/downloadImage';
import ImagePicker from 'react-native-image-crop-picker';
import {getApiErrorMessage, parseApiError} from '../../../shared/utils/apiErrorHandler';
import {BellSvgIcon} from '../../../shared/components/icons';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {CheckIcon, ChevronRightIcon} from '../../../shared/components/icons/UiIcons';
import {useUiTokens} from '../../../shared/styles/uiTokens';
import {getUserById, updateUser} from '../../user/services/user.service';
import {getChurchDetail, updateChurch} from '../../church/services/church.service';
import {churchAttributeBadgeStyles} from '../../church/components/ChurchAttributeBadges';
import {
  getChurchMscFlags,
  mergeAssignedChurchesLists,
  normalizeAssignedChurches,
  sortChurchesForAssignedList,
} from '../../church/utils/churchListOrder';
import {
  ensureAndroidPermission,
  isOverseer,
  isPastorLeader,
  isPermissionError,
  promptPermissionSettings,
  resolveRoleIdFromUser,
} from '../../../shared/utils/permissions';
import AppLoadingView from '../../../shared/components/AppLoadingView';
import {useOnReconnect} from '../../../shared/hooks/useOnReconnect';

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

const DASHBOARD_SCROLL_DATA: {id: string}[] = [];

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

/** Route / list navigation may pass church_id as number or string — normalize once. */
const parseRouteChurchId = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.trunc(raw);
  }
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
};

/** Axios: `{ data: T }` envelope or body already `T`. */
const getAxiosDataPayload = (res: any): any => {
  const body = res?.data;
  if (body == null) {
    return null;
  }
  if (
    body.data !== undefined &&
    body.data !== null &&
    typeof body.data === 'object' &&
    !Array.isArray(body.data)
  ) {
    return body.data;
  }
  return body;
};

const USERS_ME_INCLUDE_PASTOR = {params: {include_pastor_churches: 'true'}};

/**
 * Church photo thumbnail for the church picker. `uri`: undefined = still
 * loading (empty box), null = church has no photo ("No image"), string = photo.
 */
const ChurchThumb: React.FC<{uri?: string | null}> = ({uri}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (uri === undefined) {
    return (
      <View style={[styles.modalItemThumb, {backgroundColor: C.inputBg}]} />
    );
  }
  if (!uri || failed) {
    return (
      <View
        style={[styles.modalItemThumb, styles.modalItemNoImage, {backgroundColor: C.inputBg, borderColor: C.border}]}>
        <RNText style={[styles.modalItemNoImageText, {color: C.textSecondary}]} numberOfLines={2}>
          {t('noImage')}
        </RNText>
      </View>
    );
  }
  return (
    <Image
      source={{uri}}
      onError={() => setFailed(true)}
      style={styles.modalItemThumb}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
};

/**
 * Churches for the org picker modal: Pastor Leader reads `from_churches` on `users/me`;
 * otherwise falls back to `pastor_of_churches` / `pastor_churches`.
 */
const getOrgModalChurchesFromUserMe = (
  userData: any,
  roleId: number | null,
): any[] | null => {
  if (!userData || typeof userData !== 'object') {
    return null;
  }
  if (isPastorLeader(roleId)) {
    const from =
      userData.from_churches ??
      userData.fromChurches ??
      null;
    if (Array.isArray(from) && from.length > 0) {
      return normalizeAssignedChurches(
        from.filter((c: any) => c && typeof c === 'object' && c.disabled !== true),
      );
    }
  }
  const alt =
    userData.pastor_of_churches ??
    userData.pastor_churches ??
    null;
  return normalizeAssignedChurches(alt);
};

/** Merge dashboard payload shapes (overseer + church_id query vs pastor) into one `dashboard_info` + stable `church_id`. */
const DASHBOARD_INFO_MERGE_KEYS = [
  'church_id',
  'church_name',
  'country_name',
  'photo_url',
  'church_region_logo_url',
  'last_report_date',
  'is_verified',
  'verified_date',
  'verified_by_user_name',
] as const;

const DASHBOARD_INFO_FROM_INDICATORS_KEYS = [
  'last_report_date',
  'is_verified',
  'verified_date',
  'verified_by_user_name',
] as const;

const LAST_REPORT_DATE_KEYS = [
  'last_report_date',
  'lastReportDate',
  'last_monthly_report_date',
  'lastMonthlyReportDate',
  'last_reported_at',
  'report_date',
  'latest_report_date',
] as const;

const INDICATOR_OBJECT_KEYS = [
  'dashboard_indicators',
  'church_dashboard_indicators',
  'church_indicators',
  'indicators',
  'statistics',
  'stats',
] as const;

const INDICATOR_SCALAR_KEYS = [
  'church_id',
  'avg_attendance',
  'growth',
  'currency_symbol_code',
  'avg_monthly_giving',
  'avg_monthly_giving_in_usd',
  'avg_monthly_mfp_giving',
  'avg_monthly_mfp_giving_in_usd',
  'total_church_plants',
  'percent_cell_group_attendance',
  'total_new_decisions',
  'percent_liw_students',
] as const;

const firstNonEmptyDateFromSources = (...sources: any[]): string | undefined => {
  for (const src of sources) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) {
      continue;
    }
    for (const k of LAST_REPORT_DATE_KEYS) {
      const v = src[k];
      if (v != null && String(v).trim() !== '') {
        return String(v);
      }
    }
  }
  return undefined;
};

const pickIndicatorObject = (raw: any): Record<string, any> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  for (const name of INDICATOR_OBJECT_KEYS) {
    const v = raw[name];
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0) {
      return {...v};
    }
  }
  return {};
};

const mergeScalarIndicatorsFrom = (target: Record<string, any>, src: any) => {
  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    return;
  }
  for (const k of INDICATOR_SCALAR_KEYS) {
    if ((target[k] === undefined || target[k] === null) && src[k] !== undefined && src[k] !== null) {
      target[k] = src[k];
    }
  }
};

const normalizePastorLeaderDashboard = (
  rawInput: any,
  opts?: { fallbackChurchId?: number | null },
): any => {
  if (rawInput == null || typeof rawInput !== 'object') {
    return rawInput;
  }
  let raw: any = rawInput;
  if (
    raw.success === true &&
    raw.data != null &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data)
  ) {
    raw = raw.data;
  }
  const out = {...raw};
  let info: Record<string, any> =
    raw.dashboard_info != null &&
    typeof raw.dashboard_info === 'object' &&
    !Array.isArray(raw.dashboard_info)
      ? {...raw.dashboard_info}
      : {};

  const mergeFrom = (src: Record<string, any> | null | undefined) => {
    if (!src || typeof src !== 'object' || Array.isArray(src)) {
      return;
    }
    for (const key of DASHBOARD_INFO_MERGE_KEYS) {
      const v = src[key];
      if (v != null && v !== '' && (info[key] == null || info[key] === '')) {
        info[key] = v;
      }
    }
  };

  if (raw.church && typeof raw.church === 'object' && !Array.isArray(raw.church)) {
    mergeFrom(raw.church);
  }

  let indicators =
    raw.dashboard_indicators && typeof raw.dashboard_indicators === 'object' && !Array.isArray(raw.dashboard_indicators)
      ? {...raw.dashboard_indicators}
      : pickIndicatorObject(raw);

  const indicatorsSparse =
    !indicators ||
    (typeof indicators === 'object' &&
      !Array.isArray(indicators) &&
      Object.keys(indicators).length === 0);
  if (indicatorsSparse) {
    mergeScalarIndicatorsFrom(indicators, raw);
    mergeScalarIndicatorsFrom(indicators, raw.church);
  }

  if (indicators && typeof indicators === 'object' && !Array.isArray(indicators)) {
    for (const key of DASHBOARD_INFO_FROM_INDICATORS_KEYS) {
      const v = indicators[key];
      if (v != null && v !== '' && (info[key] == null || info[key] === '')) {
        info[key] = v;
      }
    }
  }

  if (info.last_report_date == null || String(info.last_report_date).trim() === '') {
    const lr = firstNonEmptyDateFromSources(
      info,
      raw,
      indicators,
      raw.church,
      raw.monthly_summary,
      raw.monthly_data,
      raw.latest_monthly_report,
      raw.last_monthly_report,
    );
    if (lr) {
      info.last_report_date = lr;
    }
  }

  if (info.is_verified == null && raw.verification_status != null) {
    const vs = String(raw.verification_status).toLowerCase();
    info.is_verified = vs.includes('verified') || vs === '1' || vs === 'true';
  }
  if (info.is_verified == null && raw.church && typeof raw.church === 'object' && raw.church.is_verified != null) {
    info.is_verified = raw.church.is_verified;
  }

  const fid = opts?.fallbackChurchId ?? null;
  let cid = parseRouteChurchId(info.church_id);
  if (cid == null && fid != null) {
    cid = fid;
  }
  if (cid == null && indicators && typeof indicators === 'object') {
    cid = parseRouteChurchId(indicators.church_id);
  }
  if (cid != null) {
    info.church_id = cid;
  }

  if (typeof info.is_verified === 'string') {
    const s = info.is_verified.toLowerCase();
    info.is_verified = s === 'true' || s === '1' || s === 'yes';
  } else if (info.is_verified === 1 || info.is_verified === 0) {
    info.is_verified = Boolean(info.is_verified);
  }

  out.dashboard_info = info;
  out.dashboard_indicators = indicators && typeof indicators === 'object' && !Array.isArray(indicators) ? indicators : {};

  // Normalize assigned_churches; merge dashboard list with pastor/from church sources for MSC flags.
  const fromAssigned = normalizeAssignedChurches(out.assigned_churches);
  const alt =
    raw.from_churches ??
    raw.fromChurches ??
    raw.pastor_of_churches ??
    raw.pastor_churches ??
    raw.churches ??
    null;
  const fromAlt = normalizeAssignedChurches(alt);
  out.assigned_churches = mergeAssignedChurchesLists(fromAssigned, fromAlt);

  return out;
};

const normalizeFileUri = (p: string) => (p.startsWith('file://') ? p : `file://${p}`);

/** Stats: always resolve indicators (envelope / alternate keys / root scalars). */
const resolveDashboardIndicatorsForStats = (dashboardData: any): Record<string, any> => {
  if (!dashboardData || typeof dashboardData !== 'object') {
    return {};
  }
  const asCopy = (v: any): Record<string, any> | null =>
    v != null && typeof v === 'object' && !Array.isArray(v) ? {...v} : null;

  const main = asCopy(dashboardData.dashboard_indicators);
  if (main && Object.keys(main).length > 0) {
    return main;
  }
  for (const key of ['church_dashboard_indicators', 'church_indicators', 'indicators', 'statistics', 'stats']) {
    const o = asCopy((dashboardData as any)[key]);
    if (o && Object.keys(o).length > 0) {
      return o;
    }
  }
  const fromRoot: Record<string, any> = {};
  for (const k of INDICATOR_SCALAR_KEYS) {
    const v = (dashboardData as any)[k];
    if (v !== undefined && v !== null) {
      fromRoot[k] = v;
    }
  }
  const cc = (dashboardData as any).currency_code;
  if (cc != null && cc !== '' && (fromRoot.currency_symbol_code == null || fromRoot.currency_symbol_code === '')) {
    fromRoot.currency_code = cc;
  }
  return fromRoot;
};

// Stats data will be populated from API
const getStatsData = (dashboardData: any, t?: (k: string) => string) => {
  if (!dashboardData || typeof dashboardData !== 'object') {
    return [];
  }
  const indicators = resolveDashboardIndicatorsForStats(dashboardData);
  const currencyRaw = indicators.currency_symbol_code ?? indicators.currency_code ?? '';
  const currencySymbol =
    decodeHtmlEntity(String(currencyRaw || '')) || (String(currencyRaw || '').trim() ? String(currencyRaw).trim() : '');
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
      value: `${(indicators.percent_cell_group_attendance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`,
      label: tr('peopleInCgs', 'People in CG’s'),
      helpMessage: tr(
        'statInfoPeopleInCgs',
        'The average Connect Group (Cell Group) attendance over the last 3 months, as a % of the average, adult and youth, weekly service attendance'
      ),
    },
    {
      icon: require('../../../../app/assets/images/icon/angel.png'),
      value: `${(indicators.total_new_decisions || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      label: tr('newDecisions', 'New Decisions'),
      helpMessage: tr(
        'statInfoNewDecisions',
        'The number of New Decisions for Christ made over the last 3 Months'
      ),
    },
    {
      icon: require('../../../../app/assets/images/icon/education.png'),
      value: `${(indicators.percent_liw_students || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`,
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
  // { icon: require('../../../../app/assets/images/icon/worship1.png'), label: 'Worship Services', routeName: 'WorshipServices' },
  { icon: require('../../../../app/assets/images/icon/line-chart.png'), label: 'Attendance & Giving Charts', routeName: 'AttendanceAndGivingCharts' },
  { icon: require('../../../../app/assets/images/icon/house-user.png'), label: 'New Pastor & New Church', routeName: 'NewPastorAndChurch' },
  { icon: require('../../../../app/assets/images/icon/user.png'), label: 'New Pastor', routeName: 'AddUser' },
  { icon: require('../../../../app/assets/images/icon/home.png'), label: 'New Church', routeName: 'AddChurch' },
];

function getApiOrigin(): string {
  const base = String(api.defaults.baseURL || '').trim();
  if (!base) return '';
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

function resolveChurchPictureUri(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('file://')) {
    return s;
  }
  const origin = getApiOrigin();
  if (!origin) return s;
  if (s.startsWith('/')) {
    return `${origin}${s}`;
  }
  return `${origin}/${s.replace(/^\/+/, '')}`;
}

function churchPictureDedupeKey(resolved: string): string {
  try {
    const u = new URL(resolved);
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/+$/, '');
  } catch {
    return resolved.split('?')[0].toLowerCase().replace(/\/+$/, '');
  }
}

/** Merge photo_url + photos[] etc.; same file often appears twice (absolute + relative). */
function dedupeResolvedChurchPictureUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const resolved = resolveChurchPictureUri(String(raw || '').trim());
    if (!resolved) continue;
    const key = churchPictureDedupeKey(resolved);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }
  return out;
}

function isRenderableChurchImageUri(u: string): boolean {
  const s = String(u || '').trim();
  return /^https?:\/\//i.test(s) || s.startsWith('file://');
}

const DEFAULT_CHURCH_PHOTO_ASSET = require('../../../assets/images/group-user.jpg');
const DEFAULT_CHURCH_PICTURE_URI =
  Image.resolveAssetSource(DEFAULT_CHURCH_PHOTO_ASSET)?.uri ?? '';

export default function DashboardPastorLeaderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setIsAuthenticated } = useContext(AuthContext);
  const { selectedLanguage, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const C = useThemedColors();
  const T = useUiTokens();
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';
  const gradientBase = isDark ? '0,0,0' : '255,255,255';
  const [menuVisible, setMenuVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  /** For overseers: the ID of the pastor/leader whose profile is displayed. Used for "tap name" navigation. */
  const [pastorProfileUserId, setPastorProfileUserId] = useState<number | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Back online: re-run the dashboard loaders.
  useOnReconnect(() => setReloadToken(token => token + 1));
  const [logoError, setLogoError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const { showAllStats, toggleShowAllStats, icons } = useDashboardStats();
  const rotation = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const orgSheetSlide = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  useEffect(() => {
    if (!orgModalVisible) {
      return;
    }
    orgSheetSlide.setValue(Dimensions.get('window').height);
    Animated.timing(orgSheetSlide, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [orgModalVisible, orgSheetSlide]);
  const userMeRef = useRef<any>(null);
  const refreshAssignedChurchesFromUserMe = useCallback(() => {
    const userData = userMeRef.current;
    if (!userData) {
      return;
    }
    const orgList = getOrgModalChurchesFromUserMe(userData, currentUserRoleId);
    if (!orgList?.length) {
      return;
    }
    setDashboardData((prev: any) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        assigned_churches: mergeAssignedChurchesLists(prev.assigned_churches, orgList),
      };
    });
  }, [currentUserRoleId]);

  const openOrgModal = useCallback(() => {
    refreshAssignedChurchesFromUserMe();
    setOrgModalVisible(true);
  }, [refreshAssignedChurchesFromUserMe]);
  const sortedAssignedChurches = useMemo(
    () => sortChurchesForAssignedList(dashboardData?.assigned_churches || []),
    [dashboardData?.assigned_churches],
  );

  // Church photos for the picker: the list rows carry no photo, so load each
  // church's photo_url once (in parallel) when the popup opens; cached by id.
  // null = loaded, no photo (shows the blank cover).
  const [churchPhotoById, setChurchPhotoById] = useState<Record<number, string | null>>({});
  const churchPhotoRequestedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!orgModalVisible) {
      return;
    }
    const currentId = Number(dashboardData?.dashboard_info?.church_id);
    const currentPhoto = dashboardData?.dashboard_info?.photo_url;
    if (Number.isFinite(currentId) && currentPhoto && !churchPhotoRequestedRef.current.has(currentId)) {
      churchPhotoRequestedRef.current.add(currentId);
      setChurchPhotoById(prev => ({...prev, [currentId]: String(currentPhoto)}));
    }
    const missing = sortedAssignedChurches
      .map((ch: any) => Number(ch.id))
      .filter((id: number) => Number.isFinite(id) && !churchPhotoRequestedRef.current.has(id));
    missing.forEach((id: number) => churchPhotoRequestedRef.current.add(id));
    missing.forEach((id: number) => {
      getChurchDetail(id)
        .then((d: any) => {
          setChurchPhotoById(prev => ({...prev, [id]: d?.photo_url ? String(d.photo_url) : null}));
        })
        .catch(() => {
          // Retry next time the popup opens; blank cover meanwhile.
          churchPhotoRequestedRef.current.delete(id);
        });
    });
  }, [orgModalVisible, sortedAssignedChurches, dashboardData?.dashboard_info?.church_id, dashboardData?.dashboard_info?.photo_url]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState<string>('');
  const [selectedImageMenuVisible, setSelectedImageMenuVisible] = useState(false); // Android fallback menu

  // Profile avatar popup (keep separate from selectedImage modal)
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false); // Android fallback
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarPath, setLocalAvatarPath] = useState<string | null>(null);
  const [churchPictureExpanded, setChurchPictureExpanded] = useState(false);
  const [churchPicturesLoading, setChurchPicturesLoading] = useState(false);
  const [churchPicturesLoaded, setChurchPicturesLoaded] = useState(false);
  const [churchPictures, setChurchPictures] = useState<string[]>([]);
  const [churchPicturesError, setChurchPicturesError] = useState<string | null>(null);
  const organizationRowWidthRef = useRef(0);
  /** Last line of the org text: width + y-offset, used to place the chevron right after the text end. */
  const [orgLastLineInfo, setOrgLastLineInfo] = useState<{width: number; y: number} | null>(null);
  const [hasMapLocation, setHasMapLocation] = useState<boolean | null>(null);
  const [mapChurchDisabled, setMapChurchDisabled] = useState(false);
  const isFocused = useIsFocused();
  const [unreadNotifications] = useState<number>(0);

  /** After initial bootstrap, `church_id` in route params is handled by the param effect (same screen, new selection). */
  const bootstrapDoneRef = useRef(false);

  const isOverseerUser = isOverseer(currentUserRoleId ?? undefined);

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

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    toastOpacity.stopAnimation();
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  }, [toastOpacity]);

  const closeAvatarPopup = useCallback(() => {
    setAvatarMenuVisible(false);
    setAvatarModalVisible(false);
  }, []);

  const refreshMeAvatar = useCallback(async () => {
    try {
      const res = await api.get('users/me');
      const userData = getAxiosDataPayload(res);
      const nextUrl = userData?.photo_url || '';
      setUserProfile((prev: any) => ({
        ...(prev || {}),
        profileImage: nextUrl,
      }));
      setProfileError(false);
    } catch {
      // ignore
    }
  }, []);

  const uploadAndApplyAvatar = useCallback(async (imagePath: string) => {
    if (!currentUserId || avatarUploading) return;
    setAvatarUploading(true);
    let uploadedUserPhotoPath: string | null = null;
    try {
      const form = new FormData();
      const fileName = imagePath.split('/').pop() || 'photo.jpg';
      form.append('file', {
        uri: imagePath,
        name: fileName,
        type: 'image/jpeg',
      } as any);
      form.append('entity_type', 'users');
      form.append('alt_text', String(userProfile?.name || '').trim());

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
      console.error('[avatar upload] error:', e?.response?.status, e?.response?.data, e?.message);
      uploadedUserPhotoPath = null;
    }

    if (!uploadedUserPhotoPath) {
      setAvatarUploading(false);
      Alert.alert(t('error'), t('failedToLoadData'));
      return;
    }

    try {
      await updateUser(currentUserId, {user_photo: uploadedUserPhotoPath} as any);
      setLocalAvatarPath(null);
      await refreshMeAvatar();
      closeAvatarPopup();
      showToast(t('profileUpdatedSuccess'));
    } catch (e: any) {
      Alert.alert(t('error'), getApiErrorMessage(e, t) || t('couldNotUpdateUser'));
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarUploading, closeAvatarPopup, currentUserId, refreshMeAvatar, showToast, t, userProfile?.name]);

  const openAvatarPhotoSourcePicker = useCallback(() => {
    const pickFromLibrary = async () => {
      const cancelText = t('cancel') || 'Cancel';
      const ok = await ensureAndroidPermission('library', cancelText);
      if (!ok) return;
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
          // Close immediately after cropping completes to avoid flashing old image.
          closeAvatarPopup();
          setLocalAvatarPath(image.path);
          void uploadAndApplyAvatar(image.path);
        }
      } catch (err) {
        if (isPermissionError(err)) {
          promptPermissionSettings('library', t('cancel') || 'Cancel');
        }
      }
    };

    const takePhoto = async () => {
      const cancelText = t('cancel') || 'Cancel';
      const ok = await ensureAndroidPermission('camera', cancelText);
      if (!ok) return;
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
          closeAvatarPopup();
          setLocalAvatarPath(image.path);
          void uploadAndApplyAvatar(image.path);
        }
      } catch (err) {
        if (isPermissionError(err)) {
          promptPermissionSettings('camera', t('cancel') || 'Cancel');
        }
      }
    };

    if (Platform.OS === 'ios') {
      const takeLabel = 'Take Photo';
      const chooseLabel = 'Choose Photo';
      const cancelLabel = t('cancel') || 'Cancel';
      ActionSheetIOS.showActionSheetWithOptions(
        {options: [takeLabel, chooseLabel, cancelLabel], cancelButtonIndex: 2, userInterfaceStyle: 'light'},
        (idx: number) => {
          if (idx === 0) void takePhoto();
          if (idx === 1) void pickFromLibrary();
        },
      );
      return;
    }

    setAvatarMenuVisible(true);
  }, [closeAvatarPopup, t, uploadAndApplyAvatar]);
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

  /** Returns false when offline / timed out (the error state is shown instead). */
  const handleSelectAssignedChurch = async (church: any): Promise<boolean> => {
    const churchIdNum = parseRouteChurchId(church?.id) ?? null;
    const churchNameFromParam = typeof church?.name === 'string' ? church.name.trim() : '';
    const churchCountryFromParam = typeof church?.country_name === 'string' ? church.country_name.trim() : '';

    setOrgModalVisible(false);
    setLoading(true);
    setBannerError(false);
    setProfileError(false);
    setLogoError(false);
    setChurchPictureExpanded(false);
    setChurchPictures([]);
    setChurchPicturesLoaded(false);
    setChurchPicturesError(null);

    try {
      // Save selected church to AsyncStorage
      if (church?.id) {
        await AsyncStorage.setItem('selectedChurchId', String(church.id));
      }
      if (churchNameFromParam) {
        await AsyncStorage.setItem('selectedChurchName', churchNameFromParam);
      }
      if (churchCountryFromParam) {
        await AsyncStorage.setItem('selectedChurchCountryName', churchCountryFromParam);
      }

      const dashboardEndpoint =
        churchIdNum != null ? `dashboard/churches/${churchIdNum}` : 'dashboard';

      let data: any = null;
      try {
        const res = await withTimeout(api.get(dashboardEndpoint));
        data = normalizePastorLeaderDashboard(getAxiosDataPayload(res), {fallbackChurchId: churchIdNum});
      } catch (apiErr: any) {
        console.warn('[handleSelectAssignedChurch] dashboard API failed:', apiErr?.message);
        // Offline: don't pass off an empty dashboard (all zeros) as real data.
        const parsed = parseApiError(apiErr);
        if (parsed.isNetworkError || parsed.isTimeout) {
          setLoadError(getApiErrorMessage(apiErr, tRef.current));
          return false;
        }
        // Build a minimal data structure so the screen is still usable
        data = normalizePastorLeaderDashboard(
          { dashboard_info: { church_id: churchIdNum, church_name: churchNameFromParam, country_name: churchCountryFromParam }, dashboard_indicators: {} },
          {fallbackChurchId: churchIdNum},
        );
      }

      // Ensure data is always a valid object (never null)
      if (data == null || typeof data !== 'object') {
        data = normalizePastorLeaderDashboard(
          { dashboard_info: { church_id: churchIdNum, church_name: churchNameFromParam, country_name: churchCountryFromParam }, dashboard_indicators: {} },
          {fallbackChurchId: churchIdNum},
        );
      }

      let organization =
        (data?.dashboard_info?.church_name && String(data.dashboard_info.church_name).trim()) ||
        churchNameFromParam ||
        '';
      let location =
        (data?.dashboard_info?.country_name && String(data.dashboard_info.country_name).trim()) ||
        churchCountryFromParam ||
        '';

      const di = data?.dashboard_info && typeof data.dashboard_info === 'object' ? data.dashboard_info : {};
      const lastReportEmpty = !di.last_report_date || String(di.last_report_date).trim() === '';
      const needChurchDetail =
        churchIdNum != null &&
        (!organization ||
          !location ||
          !di.photo_url ||
          !di.church_region_logo_url ||
          !String(di.church_region_logo_url || '').trim() ||
          lastReportEmpty);

      if (needChurchDetail) {
        try {
          const d = await getChurchDetail(churchIdNum!);
          if (d) {
            if (!organization && d.name) {
              organization = String(d.name).trim();
            }
            if (!location && d.country_name) {
              location = String(d.country_name).trim();
            }
            const nextInfo = {...(data?.dashboard_info && typeof data.dashboard_info === 'object' ? data.dashboard_info : {})};
            if (!nextInfo.photo_url && d.photo_url) {
              nextInfo.photo_url = d.photo_url;
            }
            const regionLogo =
              (d as any).church_region_logo_url ||
              (d as any).region_logo_url ||
              (d as any).church_region?.logo_url ||
              (d as any).church_region?.photo_url;
            if (!nextInfo.church_region_logo_url && regionLogo) {
              nextInfo.church_region_logo_url = String(regionLogo).trim();
            }
            if (!nextInfo.church_name && d.name) {
              nextInfo.church_name = String(d.name).trim();
            }
            if (!nextInfo.country_name && d.country_name) {
              nextInfo.country_name = String(d.country_name).trim();
            }
            if (churchIdNum != null && nextInfo.church_id == null) {
              nextInfo.church_id = churchIdNum;
            }
            if (lastReportEmpty) {
              const lrFromDetail = firstNonEmptyDateFromSources(d);
              if (lrFromDetail) {
                nextInfo.last_report_date = lrFromDetail;
              }
            }
            data = {...data, dashboard_info: nextInfo};
          }
        } catch {
          // ignore detail errors; we still have the dashboard data
        }
      }

      // Preserve assigned_churches when switching churches (new dashboard won't include the list)
      const prevAssigned = dashboardData?.assigned_churches;
      if (Array.isArray(prevAssigned) && prevAssigned.length > 0) {
        data.assigned_churches = mergeAssignedChurchesLists(
          data.assigned_churches,
          prevAssigned,
        );
      }

      setDashboardData(data);
      setUserProfile((prev: any) => ({
        ...(prev || {}),
        name: prev?.name || '',
        organization,
        location,
        lastRecord: formatLastRecord(data.dashboard_info?.last_report_date || ''),
        profileImage: (prev && prev.profileImage) || '',
        bannerImage: data.dashboard_info?.photo_url || '',
      }));
      return true;
    } catch (e) {
      console.warn('[handleSelectAssignedChurch] unexpected error:', e);
      // Even on unexpected error, show church info from params so screen is not blank
      const fallbackData = normalizePastorLeaderDashboard(
        { dashboard_info: { church_id: churchIdNum, church_name: churchNameFromParam, country_name: churchCountryFromParam }, dashboard_indicators: {} },
        {fallbackChurchId: churchIdNum},
      );
      if (dashboardData == null) {
        setDashboardData(fallbackData);
      }
      if (churchNameFromParam || churchCountryFromParam) {
        setUserProfile((prev: any) => ({
          ...(prev || {}),
          name: prev?.name || '',
          organization: churchNameFromParam || prev?.organization || '',
          location: churchCountryFromParam || prev?.location || '',
          lastRecord: prev?.lastRecord || '-',
          profileImage: (prev && prev.profileImage) || '',
          bannerImage: prev?.bannerImage || '',
        }));
      }
      return true;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const incoming = parseRouteChurchId(route?.params?.church_id);
        const incomingName = route?.params?.church_name;
        const incomingCountry = route?.params?.church_country_name;

        const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
        const savedChurchName = await AsyncStorage.getItem('selectedChurchName');
        const savedChurchCountryName = await AsyncStorage.getItem(
          'selectedChurchCountryName',
        );

        const effectiveChurchId =
          incoming ?? parseRouteChurchId(savedChurchId);

        if (effectiveChurchId != null) {
          const userRes = await withTimeout(
            api.get('users/me', USERS_ME_INCLUDE_PASTOR),
          );
          if (!mounted) {
            return;
          }
          const userData = getAxiosDataPayload(userRes);
          if (!userData) {
            return;
          }
          if (typeof userData.id === 'number') {
            setCurrentUserId(userData.id);
          }
          const resolvedRole = resolveRoleIdFromUser(userData);
          if (resolvedRole != null) {
            setCurrentUserRoleId(resolvedRole);
          }
          setUserProfile({
            prefix: userData.prefix || '',
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            title: userData.title || '',
            organization: '',
            location: '',
            profileImage: userData.photo_url || '',
            bannerImage: '',
          });

          const resolvedName =
            typeof incomingName === 'string' && incomingName.trim() !== ''
              ? incomingName
              : savedChurchName && String(savedChurchName).trim() !== ''
                ? String(savedChurchName).trim()
                : undefined;

          const resolvedCountry =
            incomingCountry != null && String(incomingCountry).trim() !== ''
              ? incomingCountry
              : savedChurchCountryName &&
                  String(savedChurchCountryName).trim() !== ''
                ? String(savedChurchCountryName).trim()
                : undefined;

          const churchLoaded = await handleSelectAssignedChurch({
            id: effectiveChurchId,
            name: resolvedName,
            country_name: resolvedCountry,
          });

          // Pastor Leader: `from_churches` on users/me powers the org picker; others use pastor assignments.
          userMeRef.current = userData;
          const orgList = getOrgModalChurchesFromUserMe(userData, resolvedRole);
          if (orgList?.length) {
            setDashboardData((prev: any) => {
              if (!prev) {
                return prev;
              }
              return {
                ...prev,
                assigned_churches: mergeAssignedChurchesLists(
                  prev.assigned_churches,
                  orgList,
                ),
              };
            });
          }

          if (mounted && incoming != null) {
            try {
              navigation.setParams({
                church_id: undefined,
                church_name: undefined,
                church_country_name: undefined,
              });
            } catch {
              // ignore
            }
          }
          if (mounted && churchLoaded) {
            setLoadError(null);
          }
          return;
        }

        const [userRes, dashboardRes] = await withTimeout(
          Promise.all([
            api.get('users/me', USERS_ME_INCLUDE_PASTOR),
            api.get('dashboard'),
          ]),
        );
        if (!mounted) return;
        
        const userData = getAxiosDataPayload(userRes);
        const dashboardRaw = getAxiosDataPayload(dashboardRes);

        if (userData && dashboardRaw) {
          userMeRef.current = userData;
          const dashboardData = normalizePastorLeaderDashboard(dashboardRaw, {
            fallbackChurchId: null,
          });

          const roleIdForOrgList = resolveRoleIdFromUser(userData);
          const orgList = getOrgModalChurchesFromUserMe(userData, roleIdForOrgList);
          if (orgList?.length) {
            dashboardData.assigned_churches = mergeAssignedChurchesLists(
              dashboardData.assigned_churches,
              orgList,
            );
          } else if (Array.isArray(dashboardData.assigned_churches)) {
            dashboardData.assigned_churches =
              normalizeAssignedChurches(dashboardData.assigned_churches) ?? [];
          }

          // Store user ID for navigation
          if (typeof userData.id === 'number') {
            setCurrentUserId(userData.id);
          }

          // Store user role ID for menu filtering
          const resolvedRole = roleIdForOrgList;
          if (resolvedRole != null) {
            setCurrentUserRoleId(resolvedRole);
          }

          // Auto-save church_id to AsyncStorage if not already saved
          if (!savedChurchId) {
            const dashboardChurchId = parseRouteChurchId(dashboardData?.dashboard_info?.church_id);
            if (dashboardChurchId != null) {
              await AsyncStorage.setItem('selectedChurchId', String(dashboardChurchId));
              console.log('Auto-saved church_id from dashboard:', dashboardChurchId);
              if (!savedChurchName && dashboardData?.dashboard_info?.church_name) {
                await AsyncStorage.setItem('selectedChurchName', String(dashboardData.dashboard_info.church_name));
              }
            } else {
              const userChurchId = parseRouteChurchId(userData?.church_id);
              if (userChurchId != null) {
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

          let organization =
            (dashboardData.dashboard_info?.church_name &&
              String(dashboardData.dashboard_info.church_name).trim()) ||
            (savedChurchName && String(savedChurchName).trim()) ||
            '';
          let location =
            (dashboardData.dashboard_info?.country_name &&
              String(dashboardData.dashboard_info.country_name).trim()) ||
            '';

          const churchIdForDetail = parseRouteChurchId(
            dashboardData?.dashboard_info?.church_id,
          );
          if ((!organization || !location) && churchIdForDetail != null) {
            try {
              const d = await getChurchDetail(churchIdForDetail);
              if (d) {
                if (!organization && d.name) {
                  organization = String(d.name).trim();
                }
                if (!location && d.country_name) {
                  location = String(d.country_name).trim();
                }
              }
            } catch {
              // ignore
            }
          }

          setUserProfile({
            prefix: userData.prefix || '',
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
            title: userData.title || '',
            organization,
            location,
            profileImage: userData.photo_url || '',
            bannerImage: dashboardData.dashboard_info?.photo_url || '',
          });

          console.log('church_region_logo_url:', dashboardData.dashboard_info?.church_region_logo_url);
          setDashboardData(dashboardData);
          if (mounted) {
            setLoadError(null);
          }
        } else if (mounted) {
          setUserProfile(null);
          setDashboardData(null);
          setLoadError(tRef.current('failedToLoadData'));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (mounted) {
          setUserProfile(null);
          setDashboardData(null);
          setLoadError(getApiErrorMessage(error, tRef.current));
        }
      } finally {
        bootstrapDoneRef.current = true;
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [reloadToken]);

  // Same screen instance receives a new church_id (e.g. stack reuse) after bootstrap finished.
  useEffect(() => {
    if (!bootstrapDoneRef.current) {
      return;
    }
    const id = parseRouteChurchId(route?.params?.church_id);
    if (id == null) {
      return;
    }
    const churchName = route?.params?.church_name;
    const churchCountryName = route?.params?.church_country_name;
    let cancelled = false;
    void (async () => {
      try {
        await handleSelectAssignedChurch({
          id,
          name: typeof churchName === 'string' ? churchName : undefined,
          country_name: churchCountryName,
        });
      } catch {
        // keep current data
      }
      try {
        if (!cancelled) {
          navigation.setParams({
            church_id: undefined,
            church_name: undefined,
            church_country_name: undefined,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route?.params?.church_id, route?.params?.church_name, route?.params?.church_country_name]);

  /**
   * Overseer view: when dashboard_info.pastor_id is available, fetch that pastor's profile
   * and replace the profile card data (name, photo, title) with the pastor's details.
   */
  useEffect(() => {
    if (!isOverseerUser) {
      setPastorProfileUserId(null);
      return;
    }
    const pastorId = dashboardData?.dashboard_info?.pastor_id;
    if (!pastorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getUserById(Number(pastorId));
        if (cancelled) return;
        // getUserById returns response.data (the API envelope); unwrap the inner data object
        const pastor: any = (res as any)?.data ?? res;
        if (!pastor) return;
        if (typeof pastor.id === 'number') {
          setPastorProfileUserId(pastor.id);
        }
        setUserProfile((prev: any) => ({
          ...(prev || {}),
          prefix: pastor.prefix || '',
          name:
            pastor.name ||
            `${pastor.first_name || ''} ${pastor.last_name || ''}`.trim(),
          title: pastor.title || '',
          profileImage: pastor.photo_url || '',
        }));
      } catch {
        // leave current profile unchanged on error
      }
    })();
    return () => { cancelled = true; };
  }, [isOverseerUser, dashboardData?.dashboard_info?.pastor_id]);

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
              navigation.navigate('EditChurch', {
                id: churchId,
                returnTo: 'DashboardPastorLeader',
              });
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
          navigation.navigate(item.routeName, item.params);
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
      } else if (item.routeName === 'AttendanceAndGivingCharts') {
        try {
          const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
          const parsedChurchId = savedChurchId ? parseInt(savedChurchId, 10) : NaN;
          if (!isNaN(parsedChurchId) && parsedChurchId > 0) {
            navigation.navigate('AttendanceAndGivingCharts', {churchId: parsedChurchId});
          } else {
            navigation.navigate('AttendanceAndGivingCharts');
          }
        } catch (error) {
          console.error('Error getting selected church ID for combined charts:', error);
          navigation.navigate('AttendanceAndGivingCharts');
        }
      } else {
        navigation.navigate(item.routeName, item.params);
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
          if (typeof item === 'string') return item.trim();
          if (!item || typeof item !== 'object') return '';
          return String(
            item.url || item.photo_url || item.image_url || item.image || item.path || '',
          ).trim();
        })
        .filter((url: string) => typeof url === 'string' && url.trim() !== '');
    });
    const singleFields = [data?.photo_url, data?.photo, data?.image, data?.image_url];
    const single = singleFields
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .flatMap(v => [v.trim()]);
    const merged = dedupeResolvedChurchPictureUrls(Array.from(new Set([...fromArrays, ...single])));
    return merged.filter(isRenderableChurchImageUri);
  };

  const displayChurchPictures = useMemo(
    () =>
      dedupeResolvedChurchPictureUrls(churchPictures.map(s => String(s || '').trim())).filter(
        isRenderableChurchImageUri,
      ),
    [churchPictures],
  );

  const churchPicturesForDisplay = useMemo(() => {
    if (displayChurchPictures.length > 0) {
      return displayChurchPictures;
    }
    return DEFAULT_CHURCH_PICTURE_URI ? [DEFAULT_CHURCH_PICTURE_URI] : [];
  }, [displayChurchPictures]);
  const getCurrentChurchId = async (): Promise<number | null> => {
    try {
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      const fromSaved = parseRouteChurchId(savedChurchId);
      if (fromSaved != null) {
        return fromSaved;
      }
    } catch (error) {
      console.log('Failed to read selectedChurchId:', error);
    }
    return parseRouteChurchId(dashboardData?.dashboard_info?.church_id);
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    let cancelled = false;
    const checkLocation = async () => {
      try {
        const isOverseerOrPastorLeader =
          isOverseer(currentUserRoleId ?? undefined) ||
          isPastorLeader(currentUserRoleId ?? undefined);
        if (!isOverseerOrPastorLeader) {
          setHasMapLocation(null);
          setMapChurchDisabled(false);
          return;
        }
        const churchId = await getCurrentChurchId();
        if (!churchId) {
          setHasMapLocation(null);
          setMapChurchDisabled(false);
          return;
        }
        const detail = await getChurchDetail(churchId);
        if (cancelled) {
          return;
        }
        const lat = detail?.latitude;
        const lng = detail?.longitude;
        const hasCoords =
          lat != null &&
          lng != null &&
          !(Number(lat) === 0 && Number(lng) === 0);
        setMapChurchDisabled(!!detail?.disabled);
        setHasMapLocation(hasCoords);
      } catch {
        if (!cancelled) {
          setHasMapLocation(null);
          setMapChurchDisabled(false);
        }
      }
    };
    void checkLocation();
    return () => {
      cancelled = true;
    };
  }, [isFocused, currentUserRoleId, dashboardData?.dashboard_info?.church_id, reloadToken, getCurrentChurchId]);

  const refreshChurchPictures = useCallback(async () => {
    try {
      const churchId = await getCurrentChurchId();
      if (!churchId) return;
      const response = await api.get(`churches/${churchId}`);
      const pictureUrls = extractChurchPictures(response);
      setChurchPictures(pictureUrls);
      setChurchPicturesLoaded(true);
      setChurchPicturesError(null);
    } catch {
      // ignore
    }
  }, [dashboardData]);

  const uploadAndApplyChurchPictureFromPicker = useCallback(
    async (imagePath: string) => {
      const churchId = await getCurrentChurchId();
      if (!churchId) {
        Alert.alert(t('error'), 'Could not determine church ID. Please try again.');
        return;
      }

      let uploadedPhotoPath: string | null = null;
      let uploadError: string | null = null;
      try {
        const form = new FormData();
        const fileName = imagePath.split('/').pop() || 'photo.jpg';
        form.append('file', {
          uri: imagePath,
          name: fileName,
          type: 'image/jpeg',
        } as any);
        form.append('entity_type', 'churches');
        form.append('alt_text', userProfile?.organization || 'church photo');
        const uploadRes = await api.post('images/upload', form, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
        uploadedPhotoPath =
          uploadRes?.data?.data?.path ||
          uploadRes?.data?.data?.url ||
          uploadRes?.data?.path ||
          uploadRes?.data?.url ||
          null;
      } catch (e: any) {
        console.error('[church photo upload] error:', e?.response?.status, e?.response?.data, e?.message);
        uploadError = getApiErrorMessage(e, t) || 'Upload failed';
        uploadedPhotoPath = null;
      }

      if (!uploadedPhotoPath) {
        Alert.alert(t('error'), uploadError || t('failedToLoadData'));
        return;
      }

      try {
        await updateChurch(churchId, {photo: uploadedPhotoPath} as any);
        await refreshChurchPictures();
        showToast(t('profileUpdatedSuccess'));
      } catch (e: any) {
        Alert.alert(t('error'), getApiErrorMessage(e, t) || t('failedToLoadData'));
      }
    },
    [refreshChurchPictures, showToast, t, userProfile?.organization],
  );

  const openSelectedImageChurchPhotoPicker = useCallback(() => {
    const pickFromLibrary = async () => {
      const cancelText = t('cancel') || 'Cancel';
      const ok = await ensureAndroidPermission('library', cancelText);
      if (!ok) return;
      try {
        const image: any = await ImagePicker.openPicker({
          width: 1600,
          height: 900,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageMaxWidth: 2048,
          compressImageMaxHeight: 2048,
          compressImageQuality: 0.85,
          includeBase64: false,
        });
        if (image?.path) {
          // Close popup immediately after crop to avoid showing old image.
          setImageModalVisible(false);
          void uploadAndApplyChurchPictureFromPicker(image.path);
        }
      } catch (err) {
        if (isPermissionError(err)) {
          promptPermissionSettings('library', t('cancel') || 'Cancel');
        }
      }
    };

    const takePhoto = async () => {
      const cancelText = t('cancel') || 'Cancel';
      const ok = await ensureAndroidPermission('camera', cancelText);
      if (!ok) return;
      try {
        const image: any = await ImagePicker.openCamera({
          width: 1600,
          height: 900,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageMaxWidth: 2048,
          compressImageMaxHeight: 2048,
          compressImageQuality: 0.85,
          includeBase64: false,
        });
        if (image?.path) {
          setImageModalVisible(false);
          void uploadAndApplyChurchPictureFromPicker(image.path);
        }
      } catch (err) {
        if (isPermissionError(err)) {
          promptPermissionSettings('camera', t('cancel') || 'Cancel');
        }
      }
    };

    if (Platform.OS === 'ios') {
      const takeLabel = 'Take Photo';
      const chooseLabel = 'Choose Photo';
      const cancelLabel = t('cancel') || 'Cancel';
      ActionSheetIOS.showActionSheetWithOptions(
        {options: [takeLabel, chooseLabel, cancelLabel], cancelButtonIndex: 2, userInterfaceStyle: 'light'},
        (idx: number) => {
          if (idx === 0) void takePhoto();
          if (idx === 1) void pickFromLibrary();
        },
      );
      return;
    }

    // Android: dismiss any open modal first so the native picker is not blocked,
    // then show the action choices via a native Alert.
    setImageModalVisible(false);
    setSelectedImageMenuVisible(false);
    requestAnimationFrame(() => {
      Alert.alert(t('changePhoto') || 'Change Photo', '', [
        {text: t('takePhoto') || 'Take Photo', onPress: () => void takePhoto()},
        {text: t('uploadImage') || 'Choose Photo', onPress: () => void pickFromLibrary()},
        {text: t('cancel') || 'Cancel', style: 'cancel'},
      ]);
    });
  }, [t, uploadAndApplyChurchPictureFromPicker]);

  const handleToggleChurchPictures = async () => {
    const nextExpanded = !churchPictureExpanded;
    setChurchPictureExpanded(nextExpanded);
    // Always re-fetch when expanding so the latest picture is shown after an upload.
    if (!nextExpanded || churchPicturesLoading) {
      return;
    }
    await loadChurchPictures();
  };

  // Fetch the current church's pictures (used by expand and by "Try again").
  const loadChurchPictures = async () => {
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
    if (!dashboardData || churchPicturesLoaded || churchPicturesLoading) {
      return;
    }
    let mounted = true;
    (async () => {
      let churchId = parseRouteChurchId(dashboardData?.dashboard_info?.church_id);
      if (churchId == null) {
        try {
          const saved = await AsyncStorage.getItem('selectedChurchId');
          churchId = parseRouteChurchId(saved);
        } catch {
          // ignore
        }
      }
      if (!churchId || !mounted) {
        return;
      }
      try {
        setChurchPicturesLoading(true);
        setChurchPicturesError(null);
        const response = await api.get(`churches/${churchId}`);
        if (!mounted) {
          return;
        }
        const pictureUrls = extractChurchPictures(response);
        setChurchPictures(pictureUrls);
        setChurchPicturesLoaded(true);
      } catch {
        // silent fail – user can still manually expand to retry
      } finally {
        if (mounted) {
          setChurchPicturesLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dashboardData]);

  const handleOrganizationTextLayout = useCallback((event: any) => {
    const lines = event?.nativeEvent?.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) return;
    const lastLine = lines[lines.length - 1];
    const w = Number(lastLine?.width || 0);
    const y = Number(lastLine?.y || 0);
    if (w > 0) {
      setOrgLastLineInfo(prev => {
        if (prev && Math.abs(prev.width - w) < 1 && Math.abs(prev.y - y) < 1) return prev;
        return {width: w, y};
      });
    }
  }, []);

  // Round chevron badge sits right after the last line of the church name.
  const orgChevronSize = ws(20);
  const orgChevronLeft = orgLastLineInfo != null
    ? Math.min(
        orgLastLineInfo.width + ms(6),
        Math.max(0, organizationRowWidthRef.current - orgChevronSize),
      )
    : null;
  const orgChevronTop = orgLastLineInfo != null
    ? orgLastLineInfo.y + Math.max(0, (fs(22) - orgChevronSize) / 2)
    : ms(1);

  const handleDownloadImage = async () => {
    if (!selectedImage) return;
    try {
      await downloadImageToCameraRoll(selectedImage, {filePrefix: 'dash-image'});
      setImageModalVisible(false);
      Alert.alert(t('success'), t('imageDownloadSuccess'));
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert(t('error'), t('imageDownloadError'));
    }
  };

  const allStats = getStatsData(dashboardData, t as any);
  const visibleStats = showAllStats ? allStats : allStats.slice(0, 4);

  if (loading) {
    return <AppLoadingView />;
  }

  if (!userProfile || loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
        <ApiErrorState
          message={loadError || t('failedToLoadData')}
          onRetry={() => {
            setLoading(true);
            setLoadError(null);
            bootstrapDoneRef.current = false;
            setReloadToken(token => token + 1);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
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
        <TouchableOpacity
          style={styles.notificationIconWrap}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Notifications' as any)}>
          <View style={styles.notificationIcon}>
            <BellSvgIcon width={24} height={24} color={COLORS.mainColor} />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <RNText style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? '9+' : String(unreadNotifications)}
                </RNText>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
        <HamburgerMenuIcon onPress={() => setMenuVisible(true)} />
        <MenuPopup
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          menuItems={getTranslatedMenuItems(selectedLanguage as any, currentUserRoleId ?? undefined)}
          onMenuItemPress={handleMenuItemPress}
          onLogout={handleLogout}
          onChangeLanguage={handleChangeLanguage}
          selectedLanguage={selectedLanguage}
          activeRouteName={route?.name}
          activeRouteParams={route?.params}
        />
      </View>
      <FlatListWithVerticalScrollbar
        style={styles.scrollView}
        data={DASHBOARD_SCROLL_DATA}
        keyExtractor={item => item.id}
        renderItem={() => null}
        ListHeaderComponent={
          <>
        {(isOverseer(currentUserRoleId ?? undefined) || isPastorLeader(currentUserRoleId ?? undefined)) &&
          hasMapLocation === false &&
          !mapChurchDisabled && (
            <View style={styles.locationWarningBanner}>
              <Text style={styles.locationWarningText} numberOfLines={2}>
                {t('omrMapLocationMissing') ||
                  'This church does not have a map location yet.'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const churchId = parseRouteChurchId(
                    dashboardData?.dashboard_info?.church_id,
                  );
                  if (churchId != null) {
                    navigation.navigate('EditChurchLocation' as any, {
                      id: churchId,
                    });
                  }
                }}>
                <Text style={styles.locationWarningAction}>
                  {t('addLocation') || 'Add location'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Row 1: Organization + dropdown */}
          <TouchableOpacity
            style={styles.organizationRow}
            disabled={isOverseerUser}
            activeOpacity={isOverseerUser ? 1 : 0.7}
            onPress={() => {
              if (!isOverseerUser) {
                openOrgModal();
              }
            }}
            onLayout={(event) => { organizationRowWidthRef.current = event.nativeEvent.layout.width; }}
          >
            <RNText style={[styles.organizationText, { color: C.textPrimary }, !isOverseerUser && { paddingRight: orgChevronSize + ms(6) }]} onTextLayout={handleOrganizationTextLayout}>
              {userProfile.organization}
            </RNText>
            {!isOverseerUser && (
              <View
                pointerEvents="none"
                style={[
                  styles.dropdownIcon,
                  {
                    backgroundColor: T.brandTint,
                    left: orgChevronLeft ?? 0,
                    top: orgChevronTop,
                    opacity: orgChevronLeft == null ? 0 : 1,
                  },
                ]}>
                <View style={styles.dropdownChevron}>
                  <ChevronRightIcon color={T.brandText} size={ws(12)} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Row 2-3: Location left | Last Report + Verification right */}
          <View style={styles.locationRow}>
            <Text style={[styles.locationText, { color: C.textSecondary }]}>{userProfile.location}</Text>
            <View style={styles.reportVerifyColumn}>
              {dashboardData?.dashboard_info && (
                dashboardData.dashboard_info.is_verified ? (
                  <RNText
                    style={[styles.verificationText, { color: '#1e7e34' }]}
                    numberOfLines={2}>
                    {'\u2714\uFE0E'} {t('visited')} {formatVisitedMonthYear(dashboardData.dashboard_info.verified_date || '')} by {dashboardData.dashboard_info.verified_by_user_name || ''}
                  </RNText>
                ) : (
                  <RNText style={[styles.verificationText, { color: '#c0392b' }]}>
                    {t('needsVerificationVisit')}
                  </RNText>
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
                  setAvatarModalVisible(true);
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

            {/* Name & title — tappable to view profile */}
            <TouchableOpacity
              onPress={() => {
                const navId = pastorProfileUserId ?? currentUserId;
                if (navId) navigation.navigate('User', { userId: navId });
              }}
              activeOpacity={0.7}
              disabled={!(pastorProfileUserId ?? currentUserId)}
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

        {/* Assigned Churches Modal — same logic as before, shown as a bottom sheet like the Admin overseer picker */}
        {/* Backdrop fades in like the list action sheets; only the card slides up. */}
        <Modal visible={orgModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOrgModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              activeOpacity={1}
              style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${T.backdropOpacity})` }]}
              onPress={() => setOrgModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
            />
            <Animated.View style={[styles.modalCard, { backgroundColor: C.surface, transform: [{ translateY: orgSheetSlide }] }]}>
              <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>{t('yourOtherChurches')}</Text>
              </View>
              <ScrollView style={styles.modalList}>
                {sortedAssignedChurches.map((ch: any) => {
                  const isCurrent =
                    dashboardData?.dashboard_info?.church_id != null &&
                    Number(ch.id) === Number(dashboardData.dashboard_info.church_id);
                  return (
                  <TouchableOpacity
                    key={String(ch.id)}
                    style={[styles.modalItemRow, isCurrent && { backgroundColor: T.brandTint }]}
                    onPress={() => handleSelectAssignedChurch(ch)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isCurrent }}
                  >
                    <ChurchThumb uri={churchPhotoById[Number(ch.id)]} />
                    <View style={styles.modalItemContent}>
                      <Text
                        style={[styles.modalItemName, { color: isCurrent ? T.brandText : C.textPrimary }]}
                        numberOfLines={2}>
                        {ch.name}
                      </Text>
                      {ch.city ? (
                        <Text style={[styles.modalItemCity, { color: C.textSecondary }]}>{ch.city}</Text>
                      ) : null}
                      {(() => {
                        const flags = getChurchMscFlags(ch);
                        if (!flags.is_first_msc && !flags.is_msc) {
                          return null;
                        }
                        const badgeStyles = churchAttributeBadgeStyles;
                        return (
                          <View style={[badgeStyles.badgeRow, styles.modalMscBadgeRow]}>
                            {flags.is_first_msc ? (
                              <View style={[badgeStyles.badge, badgeStyles.badgeMsc]}>
                                <Text style={badgeStyles.badgeTextMsc}>{t('firstMsc')}</Text>
                              </View>
                            ) : null}
                            {flags.is_msc ? (
                              <View style={[badgeStyles.badge, badgeStyles.badgeMsc]}>
                                <Text style={badgeStyles.badgeTextMsc}>{t('msc')}</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })()}
                    </View>
                    <View style={styles.modalItemCheck}>
                      {isCurrent ? <CheckIcon color={T.brandText} size={ws(18)} /> : null}
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>


        {/* Fullscreen image popup (profileImage-like behavior) */}
        <ZoomableImageModal
          visible={imageModalVisible}
          uri={selectedImage}
          onClose={() => setImageModalVisible(false)}
          headerRight={
            selectedImage ? (
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
                          if (!selectedImage) return;
                          try {
                            await downloadImageToCameraRoll(selectedImage, {filePrefix: 'church-photo'});
                            Alert.alert(t('success'), t('imageDownloadSuccess'));
                          } catch {
                            Alert.alert(t('error'), t('imageDownloadError'));
                          }
                          return;
                        }
                        if (buttonIndex === 1) {
                          requestAnimationFrame(() => openSelectedImageChurchPhotoPicker());
                        }
                      },
                    );
                    return;
                  }

                  setSelectedImageMenuVisible(true);
                }}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={{paddingHorizontal: ms(6), paddingVertical: ms(4)}}
              >
                <RNText style={{color: '#fff', fontSize: fs(22), fontWeight: '700'}}>
                  ⋯
                </RNText>
              </TouchableOpacity>
            ) : null
          }
        />

        {Platform.OS === 'android' ? (
          <IosActionSheet
            visible={selectedImageMenuVisible}
            onClose={() => setSelectedImageMenuVisible(false)}
            cancelLabel={t('cancel') || 'Cancel'}
            items={[
              {
                label: t('download') || 'Download',
                disabled: !selectedImage,
                onPress: async () => {
                  if (!selectedImage) return;
                  try {
                    await downloadImageToCameraRoll(selectedImage, {filePrefix: 'church-photo'});
                    Alert.alert(t('success'), t('imageDownloadSuccess'));
                  } catch {
                    Alert.alert(t('error'), t('imageDownloadError'));
                  }
                },
              },
              {
                label: t('changePhoto') || 'Change Photo',
                onPress: () => {
                  requestAnimationFrame(() => openSelectedImageChurchPhotoPicker());
                },
              },
            ]}
          />
        ) : null}

        {/* Profile avatar (UserScreen-like) popup */}
        <ZoomableImageModal
          visible={avatarModalVisible}
          uri={
            localAvatarPath
              ? normalizeFileUri(localAvatarPath)
              : userProfile?.profileImage && !profileError
                ? String(userProfile.profileImage)
                : null
          }
          onClose={closeAvatarPopup}
          headerRight={
            userProfile?.profileImage && !profileError ? (
              <TouchableOpacity
                onPress={() => {
                  const avatarUrl = localAvatarPath
                    ? normalizeFileUri(localAvatarPath)
                    : String(userProfile.profileImage || '');

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
                          if (!avatarUrl || avatarUploading) return;
                          try {
                            await downloadImageToCameraRoll(avatarUrl, {filePrefix: 'user-avatar'});
                            Alert.alert(t('success'), t('imageDownloadSuccess'));
                          } catch {
                            Alert.alert(t('error'), t('imageDownloadError'));
                          }
                          return;
                        }
                        if (buttonIndex === 1) {
                          if (!currentUserId) return;
                          requestAnimationFrame(() => openAvatarPhotoSourcePicker());
                        }
                      },
                    );
                    return;
                  }

                  setAvatarMenuVisible(true);
                }}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={{paddingHorizontal: ms(6), paddingVertical: ms(4)}}
              >
                <RNText style={{color: '#fff', fontSize: fs(22), fontWeight: '700', opacity: avatarUploading ? 0.6 : 1}}>
                  ⋯
                </RNText>
              </TouchableOpacity>
            ) : null
          }
        />

        {Platform.OS === 'android' ? (
          <IosActionSheet
            visible={avatarMenuVisible}
            onClose={() => setAvatarMenuVisible(false)}
            cancelLabel={t('cancel') || 'Cancel'}
            items={[
              {
                label: t('download') || 'Download',
                disabled: !userProfile?.profileImage || avatarUploading,
                onPress: async () => {
                  const avatarUrl = localAvatarPath
                    ? normalizeFileUri(localAvatarPath)
                    : String(userProfile?.profileImage || '');
                  if (!avatarUrl || avatarUploading) return;
                  try {
                    await downloadImageToCameraRoll(avatarUrl, {filePrefix: 'user-avatar'});
                    Alert.alert(t('success'), t('imageDownloadSuccess'));
                  } catch {
                    Alert.alert(t('error'), t('imageDownloadError'));
                  }
                },
              },
              {
                label: t('changePhoto') || 'Change Photo',
                disabled: !currentUserId,
                onPress: () => {
                  requestAnimationFrame(() => openAvatarPhotoSourcePicker());
                },
              },
            ]}
          />
        ) : null}

        {/* Toast Message Modal - Separate modal with highest zIndex */}
        <Modal
          visible={toastVisible}
          transparent
          animationType="none"
          onRequestClose={() => {}}
          statusBarTranslucent
          presentationStyle="overFullScreen"
          hardwareAccelerated
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
                {toastMessage || t('imageDownloadSuccess')}
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
          <TouchableOpacity
            onPress={handleToggleStats}
            style={styles.viewMoreButton}
            activeOpacity={0.75}
            hitSlop={{top: 6, bottom: 10, left: 16, right: 16}}
          >
            <View style={styles.viewMoreRow}>
              <Text style={[styles.viewMoreText, { color: C.textSecondary }]}>
                {showAllStats ? t('viewLess') : t('viewMore')}
              </Text>
              <Animated.Image
                source={icons.iconDown}
                style={[
                  styles.viewMoreIcon,
                  { transform: [{ rotate: arrowRotate }, { translateY: ms(1) }] },
                ]}
              />
            </View>
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
                     item.label === 'Attendance & Giving Charts' ? t('attendanceAndGivingCharts') :
                     item.label === 'New Pastor & New Church' ? t('newPastorAndNewChurch') :
                     item.label === 'New Pastor' ? t('addNewPastor') :
                     item.label === 'New Church' ? t('addNewChurch') : item.label}
                  </Text>
                  <Image source={require('../../../../app/assets/images/icon-down.png')} style={styles.menuArrow} />
                </TouchableOpacity>

                {isNewChurchItem ? (
                  <>
                    <TouchableOpacity
                      style={[styles.menuItem, styles.subMenuItem, { borderBottomColor: C.border, borderBottomWidth: (!churchPictureExpanded && churchPicturesForDisplay.length > 0) ? 0 : 1 }]}
                      onPress={handleToggleChurchPictures}
                      activeOpacity={0.7}
                    >
                      <Image source={require('../../../../app/assets/images/icon/image.png')} style={styles.menuIcon} />
                      <Text style={[styles.menuLabel, { color: C.textPrimary }]}>
                        {t('churchPicture')}
                      </Text>
                      {/* Refreshing while photos are already shown: small inline spinner, no content swap. */}
                      {churchPicturesLoading && churchPicturesForDisplay.length > 0 ? (
                        <ActivityIndicator size="small" color={C.textSecondary} style={{ marginRight: ms(8) }} />
                      ) : null}
                      <Image
                        source={require('../../../../app/assets/images/icon-down.png')}
                        style={[styles.menuArrow, churchPictureExpanded ? styles.menuArrowExpanded : null]}
                      />
                    </TouchableOpacity>
                    {churchPictureExpanded ? (
                      <View style={styles.churchPicturesContainer}>
                        {churchPicturesLoading && churchPicturesForDisplay.length === 0 ? (
                          <ActivityIndicator size="small" color={C.textSecondary} style={{ marginVertical: ms(12) }} />
                        ) : churchPicturesError && churchPicturesForDisplay.length === 0 ? (
                          <View style={styles.churchPictureErrorRow}>
                            <Text style={[styles.churchPictureStatusText, { color: C.error || '#ff4444' }]}>{churchPicturesError}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                void loadChurchPictures();
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              accessibilityRole="button">
                              <Text style={[styles.churchPictureRetry, { color: COLORS.mainColor }]}>{t('tryAgain')}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.churchPicturesList}>
                            {churchPicturesForDisplay.map((url, pictureIndex, arr) => (
                              <TouchableOpacity
                                key={`${url}-${pictureIndex}`}
                                style={[
                                  styles.churchPictureItem,
                                  pictureIndex === arr.length - 1 ? styles.churchPictureItemLast : null,
                                ]}
                                activeOpacity={0.85}
                                onPress={() => {
                                  setSelectedImage(url);
                                  setImageModalVisible(true);
                                }}
                              >
                                <Image
                                  source={{ uri: url }}
                                  style={styles.churchPictureThumb}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : churchPicturesLoading && churchPicturesForDisplay.length === 0 ? (
                      <ActivityIndicator size="small" color={C.textSecondary} style={{ marginVertical: ms(10) }} />
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={styles.churchPicturePeek}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('churchPicture')}${displayChurchPictures.length ? `, ${displayChurchPictures.length}` : ''}`}
                        onPress={() => {
                          void handleToggleChurchPictures();
                        }}
                      >
                        <View style={[styles.churchPicturePeekFrame, { backgroundColor: C.border }]}>
                          <Image
                            source={
                              churchPicturesForDisplay[0]
                                ? { uri: churchPicturesForDisplay[0] }
                                : DEFAULT_CHURCH_PHOTO_ASSET
                            }
                            style={styles.churchPicturePeekImg}
                            resizeMode="cover"
                          />
                          {/* One smooth gradient (was 25 stacked strips → visible banding). */}
                          <LinearGradient
                            pointerEvents="none"
                            colors={[`rgba(${gradientBase},0)`, `rgba(${gradientBase},0.85)`, `rgba(${gradientBase},1)`]}
                            locations={[0, 0.7, 1]}
                            style={StyleSheet.absoluteFill}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const HEADER_LOGO_SIZE = ws(40);

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
    width: HEADER_LOGO_SIZE,
    height: HEADER_LOGO_SIZE,
    borderRadius: HEADER_LOGO_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: HEADER_LOGO_SIZE,
    height: HEADER_LOGO_SIZE,
  },
  verificationText: {
    fontSize: fs(12),
    lineHeight: fs(18),
    textAlign: 'right',
    fontWeight: '600',
    marginTop: ms(3),
    width: '100%',
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
    width: ws(20),
    height: ws(20),
    borderRadius: ws(10),
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownChevron: {
    transform: [{rotate: '90deg'}],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ms(4),
    width: '100%',
  },
  locationText: {
    fontSize: fs(15),
    color: '#000',
    textAlign: 'left',
    flexShrink: 1,
    maxWidth: '32%',
  },
  reportVerifyColumn: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: ms(8),
    minWidth: 0,
  },
  lastRecordDate: {
    fontSize: fs(12),
    color: COLORS.mainColor,
    textAlign: 'right',
    fontWeight: '600',
    width: '100%',
  },
  lastRecordDateValue: {
    fontSize: fs(12),
    color: COLORS.mainColor,
    fontWeight: '700',
  },
  notificationIconWrap: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(4),
    marginRight: ms(4),
  },
  notificationIcon: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconText: {
    fontSize: fs(17),
  },
  notificationBadge: {
    position: 'absolute',
    top: -ms(3),
    right: -ms(5),
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    paddingHorizontal: ms(4),
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: fs(10),
    fontWeight: '700',
  },
  locationWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    marginHorizontal: ms(12),
    marginTop: ms(6),
    marginBottom: ms(4),
    borderRadius: rs(8),
    backgroundColor: '#FFF4CC',
  },
  locationWarningText: {
    flex: 1,
    fontSize: fs(12),
    fontWeight: '600',
    color: '#8A4B16',
    marginRight: ms(8),
  },
  locationWarningAction: {
    fontSize: fs(12),
    fontWeight: '700',
    color: COLORS.mainColor,
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
    paddingHorizontal: ms(12),
    paddingTop: ms(0),
    paddingBottom: ms(6),
    marginTop: ms(0),
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: fs(13),
    color: '#666',
    fontWeight: '500',
  },
  viewMoreIcon: {
    width: ws(10),
    height: hs(10),
    marginLeft: ms(6),
    opacity: 0.9,
  },
  menuContainer: {
    paddingHorizontal: ms(16),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(11),
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
    width: ws(15),
    height: hs(15),
    transform: [{ rotate: '-90deg' }],
  },
  menuArrowExpanded: {
    transform: [{ rotate: '0deg' }],
  },
  subMenuItem: {
    paddingLeft: 0,
  },
  churchPicturesContainer: {
    borderBottomWidth: 0,
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
  churchPictureItemLast: {
    marginBottom: 0,
  },
  churchPictureStatusText: {
    fontSize: fs(12),
    marginTop: ms(4),
  },
  // 16:9 like the photos themselves (was a fixed 180pt crop).
  churchPictureThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: rs(12),
    backgroundColor: 'transparent',
  },
  churchPictureErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
  },
  churchPictureRetry: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  churchPicturePeek: {
    paddingTop: ms(4),
    paddingBottom: ms(8),
  },
  churchPicturePeekFrame: {
    width: '100%',
    height: ms(72),
    borderRadius: rs(12),
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
  // Assigned-churches popup: bottom sheet (slides up, rounded top corners).
  // No dim overlay above the sheet; tapping that area still closes it.
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    paddingTop: ms(8),
    paddingHorizontal: ms(16),
    paddingBottom: ms(28),
    // Without the overlay, a soft upward shadow separates the sheet from the page.
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: -4},
    elevation: 16,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: ms(12),
  },
  modalHeader: {
    marginBottom: ms(12),
  },
  modalTitle: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  modalList: {
    flexGrow: 0,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
    minHeight: 64,
    paddingVertical: ms(10),
    paddingHorizontal: ms(8),
    borderRadius: rs(12),
    marginBottom: ms(2),
  },
  modalItemContent: {
    flex: 1,
    minWidth: 0,
  },
  // 16:10 thumbnail: church photos are landscape, a small circle would crop them away.
  modalItemThumb: {
    width: ws(64),
    height: ws(40),
    borderRadius: rs(8),
  },
  modalItemNoImage: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  modalItemNoImageText: {
    fontSize: fs(10),
    fontWeight: '500',
    textAlign: 'center',
  },
  modalItemName: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  modalItemCity: {
    marginTop: ms(2),
    fontSize: fs(12),
  },
  modalItemCheck: {
    width: ws(24),
    alignItems: 'center',
  },
  modalMscBadgeRow: {
    marginTop: ms(4),
  },
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
    justifyContent: 'center',
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
