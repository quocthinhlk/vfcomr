import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {COLORS} from '../../../shared/constants/colors';
import {hs, ms} from '../../../shared/utils/scale';
import {getReportCatalog, ReportCatalog} from '../services/report.service';
import {EVENT_STYLE_PAGES, ReportPageId, resolveReportPage} from '../reportPages';
import {useReportText} from '../reportTexts';
import {CurrentUser, fetchCurrentUser} from '../hooks/useReportData';
import {
  ChurchReportPage,
  ChurchStatusPage,
  MultiChurchPage,
  VisitReportPage,
} from './pages/ChurchPages';
import {
  AccessRightsPage,
  LeadersGraphPage,
  LeadersSpreadsheetPage,
  MyDirectoryPage,
} from './pages/LeaderPages';
import {
  EventStylePage,
  OverseerGoals3YearPage,
  ResearchInfoPage,
  UaogSearchLogPage,
} from './pages/OverseerPages';
import type {ReportPageProps} from './pages/shared';

/** Heading of each page, as on the web. */
function headingKey(pageId: ReportPageId): string {
  if (pageId === 'visit') {
    return 'generateReport.visitPageTitle';
  }
  if (pageId === 'overseer_goals_actuals_3yr') {
    return 'generateReport.bannerGenerateReport';
  }
  if (pageId === 'uaog_search_log') {
    return 'generateReport.uaogSearchLogTitle';
  }
  return EVENT_STYLE_PAGES[pageId]?.titleKey ?? 'mainMenu.generateReports';
}

function ReportPageBody({pageId, ...props}: ReportPageProps & {pageId: ReportPageId}) {
  switch (pageId) {
    case 'church':
      return <ChurchReportPage {...props} />;
    case 'church_status':
      return <ChurchStatusPage {...props} />;
    case 'multi_church':
      return <MultiChurchPage {...props} />;
    case 'leaders_spreadsheet':
      return <LeadersSpreadsheetPage {...props} />;
    case 'leaders_graph':
      return <LeadersGraphPage {...props} />;
    case 'my_directory':
      return <MyDirectoryPage {...props} />;
    case 'uaog_search_log':
      return <UaogSearchLogPage {...props} />;
    case 'overseer_goals':
    case 'overseer_reg_goals':
    case 'overseer_goals_actuals':
    case 'overseer_goals_3yr':
      return <EventStylePage {...props} pageId={pageId} />;
    case 'overseer_goals_actuals_3yr':
      return <OverseerGoals3YearPage {...props} />;
    case 'overseer_access_rights':
      return <AccessRightsPage {...props} />;
    case 'visit':
      return <VisitReportPage {...props} />;
    case 'overseer_researching':
      return <ResearchInfoPage {...props} />;
    default:
      return null;
  }
}

/**
 * Generate Reports: one screen per web page (staging.vfc-omr.org menu
 * "Generate Reports"), picked by the `report` route param.
 */
export const GenerateReportsScreen = () => {
  const route = useRoute<any>();
  const pageId = resolveReportPage(route.params);
  const C = useThemedColors();
  const {rt} = useReportText();
  const [catalog, setCatalog] = useState<ReportCatalog | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Report catalog + signed-in user feed every page: without them there is
  // nothing to pick, so show a retryable error instead of an empty form.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextCatalog, nextMe] = await Promise.all([getReportCatalog(), fetchCurrentUser()]);
      if (!mountedRef.current) {
        return;
      }
      if (!nextMe) {
        throw new Error(rt('generateReport.loadError'));
      }
      setCatalog(nextCatalog);
      setMe(nextMe);
    } catch (error) {
      console.error('Failed to load report form data:', error);
      if (mountedRef.current) {
        setLoadError(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [rt]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hs(64) : 0}
        style={styles.flex}>
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Header title={rt(headingKey(pageId))} />
          {loading ? (
            <ActivityIndicator color={COLORS.mainColor} style={styles.loader} />
          ) : loadError || !catalog || !me ? (
            <ApiErrorState error={loadError} onRetry={load} />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}>
              {/* Keyed by page: switching reports starts from the web's defaults. */}
              <ReportPageBody key={pageId} pageId={pageId} catalog={catalog} me={me} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  scroll: {
    paddingTop: ms(8),
    paddingBottom: ms(24),
  },
  loader: {
    marginTop: ms(40),
  },
});
