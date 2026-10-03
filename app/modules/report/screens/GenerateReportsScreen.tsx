import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import axios from 'axios';
import FileViewer from 'react-native-file-viewer';
import Svg, {Path, Rect, Text as SvgText} from 'react-native-svg';
import {Header} from '../../../shared/components/Header';
import ElementDropdown from '../../../shared/components/ElementDropdown';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import api from '../../../config/api';
import {listUsers} from '../../user/services/user.service';
import {
  downloadReportFile,
  generateReport,
  getReportCatalog,
  humanizeReportKey,
  reportGroupNeeds,
  ReportCatalog,
  ReportDownload,
} from '../services/report.service';

type NamedId = {id: number; label: string};

const GROUP_LABEL_KEY = {
  church: 'reportGroupChurch',
  church_reports_graph_reports: 'reportGroupChurchGraph',
  visit_report: 'reportGroupVisit',
  church_report_status: 'reportGroupStatus',
  multi_church: 'reportGroupMultiChurch',
  user_data: 'reportGroupUserData',
  user_graph: 'reportGroupUserGraph',
  event: 'reportGroupEvent',
  my_directory: 'reportGroupDirectory',
} as const;

const now = new Date();

function flattenRegions(nodes: any[], depth = 0): NamedId[] {
  const result: NamedId[] = [];
  for (const node of nodes) {
    if (node?.id == null) {
      continue;
    }
    result.push({
      id: Number(node.id),
      label: `${depth > 0 ? `${'-'.repeat(depth)} ` : ''}${node.name || node.id}`,
    });
    if (Array.isArray(node.children) && node.children.length) {
      result.push(...flattenRegions(node.children, Math.min(depth + 1, 5)));
    }
  }
  return result;
}

function asRegionList(payload: any): any[] {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  return [];
}

export const GenerateReportsScreen = () => {
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [catalog, setCatalog] = useState<ReportCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [group, setGroup] = useState('church');
  const [reportType, setReportType] = useState('');
  const [church, setChurch] = useState<NamedId | null>(null);
  const [user, setUser] = useState<NamedId | null>(null);
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [geoSingle, setGeoSingle] = useState<NamedId | null>(null);
  const [geoRegions, setGeoRegions] = useState<NamedId[]>([]);
  const [churchRegions, setChurchRegions] = useState<NamedId[]>([]);
  const [languageRegions, setLanguageRegions] = useState<NamedId[]>([]);
  const [selectedGeo, setSelectedGeo] = useState<number[]>([]);
  const [selectedChurchRegions, setSelectedChurchRegions] = useState<number[]>([]);
  const [selectedLanguageRegions, setSelectedLanguageRegions] = useState<number[]>([]);
  const [churchItems, setChurchItems] = useState<NamedId[]>([]);
  const [userItems, setUserItems] = useState<NamedId[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [reportFiles, setReportFiles] = useState<ReportDownload[]>([]);
  const [openingUrl, setOpeningUrl] = useState<string | null>(null);

  const needs = reportGroupNeeds(group);
  const activeGroup = catalog?.groups.find(item => item.key === group) ?? catalog?.groups[0];

  const monthOptions = useMemo(() => {
    return Array.from({length: 12}, (_, index) => {
      const month = index + 1;
      const label = new Date(2024, index, 1).toLocaleString(selectedLanguage || 'en', {
        month: 'long',
      });
      return {id: String(month), label};
    });
  }, [selectedLanguage]);

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return Array.from({length: 16}, (_, index) => {
      const year = current - index;
      return {id: String(year), label: String(year)};
    });
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const next = await getReportCatalog();
      setCatalog(next);
      const first = next.groups[0];
      if (first) {
        setGroup(first.key);
        setReportType(first.types[0] || '');
      }
    } catch (error) {
      Alert.alert(tRef.current('error'), getApiErrorMessage(error, tRef.current));
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let mounted = true;
    api
      .get('users/me')
      .then(res => {
        const data = res?.data?.data;
        const id = Number(data?.id);
        if (!mounted || !Number.isFinite(id)) {
          return;
        }
        const name =
          data?.name ||
          [data?.first_name, data?.last_name].filter(Boolean).join(' ') ||
          String(id);
        setUser({id, label: name});
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('geographical-regions', {params: {sort_by: 'name', sort_desc: false}}),
      api.get('church-regions', {params: {sort_by: 'name', sort_desc: false}}),
      api.get('language-regions', {params: {sort_by: 'name', sort_desc: false}}),
    ])
      .then(([geo, churchRes, language]) => {
        if (!mounted) {
          return;
        }
        setGeoRegions(flattenRegions(asRegionList(geo)));
        setChurchRegions(flattenRegions(asRegionList(churchRes)));
        setLanguageRegions(flattenRegions(asRegionList(language)));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const loadChurches = useCallback(async (search: string) => {
    try {
      const res = await api.get('churches', {
        params: {
          page: 1,
          limit: 30,
          search: search.trim(),
          sort_by: 'name',
          sort_desc: false,
          disabled: false,
        },
      });
      const items = res?.data?.data?.items ?? [];
      setChurchItems(
        items.map((item: {id: number; name: string}) => ({id: item.id, label: item.name})),
      );
    } catch {
      setChurchItems([]);
    }
  }, []);

  const loadUserOptions = useCallback(async (search: string) => {
    try {
      const res = await listUsers({page: 1, limit: 30, search: search.trim()});
      setUserItems(
        (res?.data?.items ?? []).map(item => ({
          id: item.id,
          label: item.name || String(item.id),
        })),
      );
    } catch {
      setUserItems([]);
    }
  }, []);

  useEffect(() => {
    void loadChurches('');
    void loadUserOptions('');
  }, [loadChurches, loadUserOptions]);

  const groupLabel = (key: string) => {
    const translationKey = GROUP_LABEL_KEY[key as keyof typeof GROUP_LABEL_KEY];
    return translationKey ? t(translationKey) : humanizeReportKey(key);
  };

  const clearError = (key: string) => {
    setErrors(current => ({...current, [key]: false}));
  };

  const withSelected = (items: NamedId[], selected: NamedId | null) => {
    if (!selected || items.some(item => item.id === selected.id)) {
      return items;
    }
    return [selected, ...items];
  };

  const toDropdown = (items: {id: string | number; label: string}[]) =>
    items.map(item => ({label: item.label, value: item.id}));

  const onGenerate = async () => {
    if (submitting) {
      return;
    }
    const regionsMissing =
      needs.regions &&
      selectedGeo.length + selectedChurchRegions.length + selectedLanguageRegions.length === 0;
    const nextErrors = {
      church: needs.church && !church,
      user: needs.user && !user,
      type: needs.reportType && !reportType,
      regions: regionsMissing,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    setSubmitting(true);
    setReportFiles([]);
    try {
      const result = await generateReport({
        group,
        reportType,
        churchId: church?.id,
        userId: user?.id,
        endMonth,
        endYear,
        geographicalRegionId: geoSingle?.id ?? null,
        geographicalRegionIds: selectedGeo,
        churchRegionIds: selectedChurchRegions,
        languageRegionIds: selectedLanguageRegions,
      });
      if (result.kind === 'files') {
        setReportFiles(result.files);
        return;
      }
      Alert.alert(t('success'), result.message);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? getApiErrorMessage(error, t)
        : error instanceof Error && error.message
          ? error.message
          : getApiErrorMessage(error, t);
      Alert.alert(t('error'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSavedFile = async (file: ReportDownload) => {
    if (openingUrl || submitting) {
      return;
    }
    setOpeningUrl(file.url);
    try {
      const localPath = await downloadReportFile(file);
      const fileUrl = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
      try {
        await FileViewer.open(localPath, {
          displayName: file.filename,
          showOpenWithDialog: true,
          showAppsSuggestions: true,
        });
      } catch {
        await Share.share(
          Platform.OS === 'ios'
            ? {url: fileUrl, title: file.filename}
            : {title: file.filename, message: file.filename, url: fileUrl},
        );
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? getApiErrorMessage(error, t)
        : error instanceof Error && error.message
          ? error.message
          : getApiErrorMessage(error, t);
      Alert.alert(t('error'), message);
    } finally {
      setOpeningUrl(null);
    }
  };

  const dropdown = (
    label: string,
    data: {label: string; value: string | number}[],
    value: string | number | null,
    onChange: (value: string | number | null) => void,
    error = false,
    onSearchText?: (text: string) => void,
  ) => (
    <View style={[styles.field, submitting && styles.fieldDisabled]}>
      <Text style={[formStyles.label, {color: error ? COLORS.danger : C.textSecondary}]}>
        {label}
      </Text>
      <ElementDropdown
        data={data}
        value={value}
        onChange={onChange}
        placeholder={t('selectOption')}
        disabled={submitting}
        error={error}
        onSearchText={onSearchText}
        containerStyle={{
          backgroundColor: C.inputBg,
          borderColor: error ? COLORS.danger : C.inputBorder,
        }}
      />
      {error ? <RNText style={styles.errorText}>{t('required')}</RNText> : null}
    </View>
  );

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={{flex: 1}}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={t('generateReports')} />
          {loadingCatalog ? (
            <ActivityIndicator color={COLORS.mainColor} style={styles.loader} />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}>
              {catalog?.subHeading ? (
                <Text style={[styles.subHeading, {color: C.textSecondary}]}>
                  {catalog.subHeading}
                </Text>
              ) : null}
              {dropdown(
                t('reportCategory'),
                (catalog?.groups ?? []).map(item => ({
                  label: groupLabel(item.key),
                  value: item.key,
                })),
                group,
                value => {
                  if (value == null || value === '') {
                    return;
                  }
                  const nextGroup = String(value);
                  const nextTypes =
                    catalog?.groups.find(item => item.key === nextGroup)?.types ?? [];
                  setGroup(nextGroup);
                  setReportType(nextTypes[0] || '');
                  clearError('type');
                },
              )}
              {needs.reportType
                ? dropdown(
                    needs.directory ? t('sortBy') : t('reportType'),
                    (activeGroup?.types ?? []).map(type => ({
                      label: humanizeReportKey(type),
                      value: type,
                    })),
                    reportType || null,
                    value => {
                      setReportType(value == null ? '' : String(value));
                      clearError('type');
                    },
                    errors.type,
                  )
                : null}
              {needs.church
                ? dropdown(
                    t('church'),
                    toDropdown(withSelected(churchItems, church)),
                    church?.id ?? null,
                    value => {
                      if (value == null || value === '') {
                        setChurch(null);
                        return;
                      }
                      const id = Number(value);
                      const found =
                        churchItems.find(item => item.id === id) ||
                        (church?.id === id ? church : null);
                      setChurch(found);
                      clearError('church');
                    },
                    errors.church,
                    text => {
                      void loadChurches(text);
                    },
                  )
                : null}
              {needs.user
                ? dropdown(
                    t('selectUser'),
                    toDropdown(withSelected(userItems, user)),
                    user?.id ?? null,
                    value => {
                      if (value == null || value === '') {
                        setUser(null);
                        return;
                      }
                      const id = Number(value);
                      const found =
                        userItems.find(item => item.id === id) ||
                        (user?.id === id ? user : null);
                      setUser(found);
                      clearError('user');
                    },
                    errors.user,
                    text => {
                      void loadUserOptions(text);
                    },
                  )
                : null}
              {needs.month || needs.year ? (
                <View style={styles.row}>
                  {needs.month ? (
                    <View style={styles.rowItem}>
                      {dropdown(
                        t('month'),
                        toDropdown(monthOptions),
                        String(endMonth),
                        value => {
                          if (value == null || value === '') {
                            return;
                          }
                          setEndMonth(Number(value));
                        },
                      )}
                    </View>
                  ) : null}
                  {needs.year ? (
                    <View style={styles.rowItem}>
                      {dropdown(
                        t('endYear'),
                        toDropdown(yearOptions),
                        String(endYear),
                        value => {
                          if (value == null || value === '') {
                            return;
                          }
                          setEndYear(Number(value));
                        },
                      )}
                    </View>
                  ) : null}
                </View>
              ) : null}
              {needs.geoSingle
                ? dropdown(
                    t('geographicalRegion'),
                    toDropdown(geoRegions),
                    geoSingle?.id ?? null,
                    value => {
                      if (value == null || value === '') {
                        setGeoSingle(null);
                        return;
                      }
                      const id = Number(value);
                      setGeoSingle(geoRegions.find(item => item.id === id) || null);
                    },
                  )
                : null}
              {needs.regions ? (
                <>
                  {dropdown(
                    t('geographicalRegion'),
                    toDropdown(geoRegions),
                    selectedGeo[0] ?? null,
                    value => {
                      setSelectedGeo(value == null || value === '' ? [] : [Number(value)]);
                      clearError('regions');
                    },
                    errors.regions && selectedGeo.length === 0,
                  )}
                  {dropdown(
                    t('churchRegion'),
                    toDropdown(churchRegions),
                    selectedChurchRegions[0] ?? null,
                    value => {
                      setSelectedChurchRegions(
                        value == null || value === '' ? [] : [Number(value)],
                      );
                      clearError('regions');
                    },
                    errors.regions && selectedChurchRegions.length === 0,
                  )}
                  {dropdown(
                    t('languageRegion'),
                    toDropdown(languageRegions),
                    selectedLanguageRegions[0] ?? null,
                    value => {
                      setSelectedLanguageRegions(
                        value == null || value === '' ? [] : [Number(value)],
                      );
                      clearError('regions');
                    },
                    errors.regions && selectedLanguageRegions.length === 0,
                  )}
                </>
              ) : null}
              <TouchableOpacity
                style={[styles.generateButton, submitting && styles.generateButtonBusy]}
                disabled={submitting}
                activeOpacity={0.8}
                onPress={() => {
                  void onGenerate();
                }}>
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} style={styles.generateSpinner} />
                ) : null}
                <RNText style={styles.generateText}>{t('generate')}</RNText>
              </TouchableOpacity>
              {reportFiles.length > 0 ? (
                <View style={[styles.fileList, {borderColor: C.border}]}>
                  {reportFiles.map((file, index) => {
                    const busy = openingUrl === file.url;
                    return (
                      <TouchableOpacity
                        key={file.url}
                        style={[
                          styles.fileRow,
                          index > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border},
                        ]}
                        disabled={busy || submitting || openingUrl != null}
                        activeOpacity={0.6}
                        onPress={() => {
                          void openSavedFile(file);
                        }}>
                        <ReportFileIcon kind={file.label} />
                        <RNText
                          style={[styles.fileName, {color: C.textPrimary}]}
                          numberOfLines={2}>
                          {file.filename}
                        </RNText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
      {openingUrl ? (
        <View style={[styles.openingOverlay, {backgroundColor: C.overlay}]}>
          <ActivityIndicator size="large" color={COLORS.mainColor} />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const ReportFileIcon = ({kind}: {kind: 'pdf' | 'excel'}) => {
  const badge = kind === 'pdf' ? '#E53935' : '#1D6F42';
  const label = kind === 'pdf' ? 'PDF' : 'XLS';
  return (
    <Svg width={ws(28)} height={hs(36)} viewBox="0 0 32 40">
      <Path
        d="M7 1.5h13.2L27.5 9v27.2a2.3 2.3 0 0 1-2.3 2.3H7a2.3 2.3 0 0 1-2.3-2.3V3.8A2.3 2.3 0 0 1 7 1.5Z"
        fill="#F7F8FA"
        stroke="#C5CDD6"
      />
      <Path d="M20 1.8V9h7.2" fill="#EEF1F4" stroke="#C5CDD6" />
      <Rect x="3.5" y="23" width="25" height="11" rx="2" fill={badge} />
      <SvgText
        x="16"
        y="31"
        fill="#fff"
        fontSize="7"
        fontWeight="700"
        textAnchor="middle">
        {label}
      </SvgText>
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  generateButton: {
    marginTop: ms(8),
    minHeight: hs(44),
    borderRadius: rs(3),
    backgroundColor: COLORS.mainColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonBusy: {
    opacity: 0.7,
  },
  generateSpinner: {
    marginRight: ms(8),
  },
  generateText: {
    color: COLORS.white,
    fontSize: fs(15),
    fontWeight: '700',
  },
  errorText: {
    marginTop: ms(4),
    color: COLORS.danger,
    fontSize: fs(12),
  },
  fileList: {
    marginTop: ms(16),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(12),
  },
  fileName: {
    flex: 1,
    marginLeft: ms(12),
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  scroll: {
    paddingBottom: ms(24),
  },
  subHeading: {
    fontSize: fs(12),
    marginBottom: ms(12),
  },
  field: {
    marginBottom: ms(12),
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: ms(10),
  },
  rowItem: {
    flex: 1,
  },
  loader: {
    marginTop: ms(40),
  },
});
