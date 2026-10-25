import type {ReportEndpoint} from './services/report.service';

/**
 * The Generate Reports pages of the web app (staging.vfc-omr.org), in its menu
 * order, with the same permissions per role. `overseer_researching` is the
 * app-only "Research Info Reports" page (from the client's sketch).
 */
export type ReportPageId =
  | 'church'
  | 'church_status'
  | 'multi_church'
  | 'leaders_spreadsheet'
  | 'leaders_graph'
  | 'my_directory'
  | 'uaog_search_log'
  | 'overseer_goals'
  | 'overseer_reg_goals'
  | 'overseer_goals_actuals'
  | 'overseer_goals_3yr'
  | 'overseer_goals_actuals_3yr'
  | 'overseer_access_rights'
  | 'visit'
  | 'overseer_researching';

type MenuEntry = {id: ReportPageId; menuKey: string; permission: string};

/** Web menu: mainMenu.generateReports children, same order. */
export const REPORT_MENU: MenuEntry[] = [
  {id: 'church', menuKey: 'mainMenu.churchReport', permission: 'report.church'},
  {id: 'church_status', menuKey: 'mainMenu.churchReportingStatus', permission: 'report.church-status'},
  {id: 'multi_church', menuKey: 'mainMenu.multiChurchReports', permission: 'report.multi-church'},
  {
    id: 'leaders_spreadsheet',
    menuKey: 'mainMenu.leadersSpreadsheetReports',
    permission: 'report.leaders-spreadsheet',
  },
  {id: 'leaders_graph', menuKey: 'mainMenu.leadersGraphReports', permission: 'report.leaders-graph'},
  {id: 'my_directory', menuKey: 'mainMenu.myDirectory', permission: 'report.my-directory'},
  {id: 'uaog_search_log', menuKey: 'mainMenu.uaogPublicSearchLog', permission: 'report.uaog-search-log'},
  {id: 'overseer_goals', menuKey: 'mainMenu.overseerGoalsOnly', permission: 'report.overseer-goals'},
  {id: 'overseer_reg_goals', menuKey: 'mainMenu.overseerRegGoalsOnly', permission: 'report.overseer-reg-goals'},
  {
    id: 'overseer_goals_actuals',
    menuKey: 'mainMenu.overseerGoalsActuals',
    permission: 'report.overseer-goals-actuals',
  },
  {id: 'overseer_goals_3yr', menuKey: 'mainMenu.overseerGoals3Year', permission: 'report.overseer-goals-3yr'},
  {
    id: 'overseer_goals_actuals_3yr',
    menuKey: 'mainMenu.overseerGoalsActuals3Year',
    permission: 'report.overseer-goals-actuals-3yr',
  },
  {
    id: 'overseer_access_rights',
    menuKey: 'mainMenu.overseerAccessRights',
    permission: 'report.overseer-access-rights',
  },
  {id: 'visit', menuKey: 'mainMenu.visitReports', permission: 'report.visit'},
];

/* Web: hard-coded permission lists per role (role ids 1, 2, 3, 8). */
const PASTOR_LEADER_REPORTS = ['report.church', 'report.church-status', 'report.my-directory', 'report.visit'];
const OVERSEER_REPORTS = [
  ...PASTOR_LEADER_REPORTS,
  'report.multi-church',
  'report.leaders-spreadsheet',
  'report.leaders-graph',
  'report.overseer-goals',
  'report.overseer-goals-actuals',
];
const ADMIN_REPORTS = [
  ...OVERSEER_REPORTS.filter(permission => permission !== 'report.overseer-goals'),
  'report.uaog-search-log',
  'report.overseer-reg-goals',
  'report.overseer-goals-3yr',
  'report.overseer-goals-actuals-3yr',
  'report.overseer-access-rights',
];

export const ROLE_ID = {SUPER: 1, ADMIN: 2, PASTOR_LEADER: 3, OVERSEER: 8} as const;

export function reportPermissionsForRole(roleId?: number | null): string[] {
  if (roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER) {
    return ADMIN_REPORTS;
  }
  if (roleId === ROLE_ID.OVERSEER) {
    return OVERSEER_REPORTS;
  }
  return PASTOR_LEADER_REPORTS;
}

/** Menu entries this role may open, in web order (+ the app-only Research Info). */
export function reportMenuForRole(roleId?: number | null): {id: ReportPageId; menuKey: string}[] {
  const allowed = new Set(reportPermissionsForRole(roleId));
  const entries: {id: ReportPageId; menuKey: string}[] = REPORT_MENU.filter(entry =>
    allowed.has(entry.permission),
  );
  // App only: Research Info Reports (overseers and admins, as before).
  if (roleId === ROLE_ID.OVERSEER || roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.SUPER) {
    entries.push({id: 'overseer_researching', menuKey: 'app.researchInfoReports'});
  }
  return entries;
}

const PAGE_IDS = new Set<string>([...REPORT_MENU.map(entry => entry.id), 'overseer_researching']);

/** Old `group` params (before the web layout) → the page that now holds them. */
const LEGACY_GROUP_PAGE: Record<string, ReportPageId> = {
  church: 'church',
  church_reports_graph_reports: 'church',
  visit_report: 'church',
  church_report_status: 'church_status',
  multi_church: 'multi_church',
  user_data: 'leaders_spreadsheet',
  user_graph: 'leaders_graph',
  my_directory: 'my_directory',
  overseer_goals: 'overseer_goals_actuals',
  overseer_researching: 'overseer_researching',
};

export function resolveReportPage(params?: {report?: unknown; group?: unknown}): ReportPageId {
  if (typeof params?.report === 'string' && PAGE_IDS.has(params.report)) {
    return params.report as ReportPageId;
  }
  if (typeof params?.group === 'string' && LEGACY_GROUP_PAGE[params.group]) {
    return LEGACY_GROUP_PAGE[params.group];
  }
  return 'church';
}

/* ------------------------------------------------------------------ */
/* Report options (codes, hints and names exactly as on the web)        */
/* ------------------------------------------------------------------ */

export type ReportOptionDef = {
  id: string;
  code: string;
  /** generateReport.* path of the hint shown in brackets; '' for none. */
  hintKey: string;
  /** generateReport.* path of the name; '' → catalog name. */
  nameKey: string;
};

export type ChurchOptionDef = ReportOptionDef & {
  group: 'data' | 'graph' | 'visit' | 'financial';
  endpoint: Extract<ReportEndpoint, 'church' | 'churchGraph' | 'visitReport'>;
  /** No month: the report runs on the year only. */
  yearOnly: boolean;
};

export const CHURCH_SECTIONS: {key: ChurchOptionDef['group']; titleKey: string}[] = [
  {key: 'data', titleKey: 'generateReport.sectionDataReports'},
  {key: 'graph', titleKey: 'generateReport.sectionGraphReports'},
  {key: 'visit', titleKey: 'generateReport.sectionVisitReports'},
  {key: 'financial', titleKey: 'generateReport.sectionFinancialReports'},
];

export const CHURCH_OPTIONS: ChurchOptionDef[] = [
  {id: '1_month_weekly', code: '[# 1]', hintKey: 'generateReport.typeHints.weeklyData', nameKey: 'generateReport.churchData1Month', group: 'data', endpoint: 'church', yearOnly: false},
  {id: '6_months_weekly', code: '[# 2]', hintKey: 'generateReport.typeHints.weeklyData', nameKey: 'generateReport.churchData6Months', group: 'data', endpoint: 'church', yearOnly: false},
  {id: '12_months_weekly', code: '[# 3]', hintKey: 'generateReport.typeHints.weeklyData', nameKey: 'generateReport.churchData12Months', group: 'data', endpoint: 'church', yearOnly: false},
  {id: '12_months_average', code: '[# 4]', hintKey: 'generateReport.typeHints.monthlyAveragedData', nameKey: 'generateReport.churchData12Months', group: 'data', endpoint: 'church', yearOnly: false},
  {id: '36_months_average', code: '[# 5]', hintKey: 'generateReport.typeHints.monthlyAveragedData', nameKey: 'generateReport.churchData3Years', group: 'data', endpoint: 'church', yearOnly: false},
  {id: '36_months_projections', code: '[# 33]', hintKey: '', nameKey: 'generateReport.types.36_months_projections', group: 'data', endpoint: 'church', yearOnly: true},
  {id: '12_months_quick_look_graph', code: '[# 10]', hintKey: 'generateReport.typeHints.weeklyAsDashboard', nameKey: 'generateReport.types.12_months_quick_look_graph', group: 'graph', endpoint: 'churchGraph', yearOnly: true},
  {id: '12_months_weekly_graph', code: '[# 11]', hintKey: 'generateReport.typeHints.weeklyMoreComprehensive', nameKey: 'generateReport.churchGraph12Report', group: 'graph', endpoint: 'churchGraph', yearOnly: true},
  {id: '12_months_average_graph', code: '[# 12]', hintKey: 'generateReport.typeHints.monthlyAveragedData', nameKey: 'generateReport.churchGraph12Report', group: 'graph', endpoint: 'churchGraph', yearOnly: true},
  {id: '36_months_average_graph', code: '[# 13]', hintKey: 'generateReport.typeHints.monthlyAveragedData', nameKey: 'generateReport.churchGraph3Years', group: 'graph', endpoint: 'churchGraph', yearOnly: true},
  {id: '24_months_visits_monthly', code: '[# 19]', hintKey: 'generateReport.typeHints.monthlyByIndividualChurch', nameKey: 'generateReport.churchVisit2Years', group: 'visit', endpoint: 'visitReport', yearOnly: true},
  {id: '1_month_accounts', code: '[# 17]', hintKey: 'generateReport.typeHints.monthlyByIndividualChurch', nameKey: 'generateReport.churchAccounts1Month', group: 'financial', endpoint: 'church', yearOnly: true},
  {id: '12_months_accounts', code: '[# 18]', hintKey: 'generateReport.typeHints.monthlyByIndividualChurch', nameKey: 'generateReport.churchAccounts12Months', group: 'financial', endpoint: 'church', yearOnly: true},
];

/** Catalog group each church endpoint lists its types under. */
export const CHURCH_ENDPOINT_GROUP: Record<ChurchOptionDef['endpoint'], string> = {
  church: 'church',
  churchGraph: 'church_reports_graph_reports',
  visitReport: 'visit_report',
};

export const STATUS_OPTIONS: ReportOptionDef[] = [
  {id: '12_months_status_report_by_user', code: '[# 9]', hintKey: 'generateReport.typeHints.weeklyData', nameKey: ''},
];

export const MULTI_CHURCH_VISITS = '12_months_visits_events_monthly_multi_church';

export const MULTI_CHURCH_OPTIONS: ReportOptionDef[] = [
  {id: MULTI_CHURCH_VISITS, code: '[# 21]', hintKey: 'generateReport.typeHints.monthlyData', nameKey: ''},
  {id: 'mail_merge_report', code: '[# 29]', hintKey: 'generateReport.typeHints.churches', nameKey: ''},
  {id: 'disabled_churches_report', code: '[# 31]', hintKey: 'generateReport.typeHints.churches', nameKey: ''},
];

export const LEADERS_SHEET_OPTIONS: ReportOptionDef[] = [
  {id: '24_months_visits', code: '[# 20]', hintKey: 'generateReport.typeHints.monthlyData', nameKey: 'generateReport.leaderSheetTwoYearVisits'},
  {id: '12_months_church_planting', code: '[# 28]', hintKey: 'generateReport.typeHints.yearlyData', nameKey: 'generateReport.leaderSheetPlantingA3'},
  {id: '12_months_church_planting_a4', code: '[# 39]', hintKey: 'generateReport.typeHints.yearlyData', nameKey: 'generateReport.leaderSheetPlantingA4'},
  {id: 'leader_credentials_report', code: '[# 30]', hintKey: '', nameKey: 'generateReport.leaderSheetCredentials'},
  {id: 'picture_church_pastor', code: '[# 32]', hintKey: 'generateReport.typeHints.latestData', nameKey: 'generateReport.leaderSheetPictures'},
  {id: '36_months_projections', code: '[# 34]', hintKey: '', nameKey: 'generateReport.leaderSheetProjections'},
  {id: '36_months_projections_only', code: '[# 35]', hintKey: '', nameKey: 'generateReport.leaderSheetProjectionsOnly'},
];

export const LEADERS_GRAPH_OPTIONS: ReportOptionDef[] = [
  {id: '36_months_cumulative_church_planting', code: '[# 16]', hintKey: 'generateReport.typeHints.monthlyData', nameKey: 'generateReport.leaderGraphCumulative'},
  {id: '12_months_visits_to_churches', code: '[# 22]', hintKey: 'generateReport.typeHints.monthlyData', nameKey: 'generateReport.leaderGraphVisits'},
];

/** My Directory: pastors/leaders sort all users; admins and overseers list overseers. */
export const DIRECTORY_OPTIONS = [
  {id: 'name', code: '[# 23.1]', nameKey: 'generateReport.types.name'},
  {id: 'geo', code: '[# 23.2]', nameKey: 'generateReport.types.geo'},
  {id: 'overseers', code: '[# 23.3]', nameKey: 'generateReport.types.overseers'},
] as const;

export function directoryOptionsForRole(roleId?: number | null): string[] {
  if (roleId === ROLE_ID.PASTOR_LEADER) {
    return ['name', 'geo'];
  }
  if (roleId === ROLE_ID.ADMIN || roleId === ROLE_ID.OVERSEER || roleId === ROLE_ID.SUPER) {
    return ['overseers'];
  }
  return [];
}

export const ACCESS_RIGHTS_OPTIONS = [
  {id: '41', code: '[# 41]', nameKey: 'generateReport.accessRightsUnder'},
  {id: '42', code: '[# 42]', nameKey: 'generateReport.accessRightsDashboard'},
] as const;

/** Web "EventStyleReport" pages: Leader + End Year, posted to generate-reports/event. */
export const EVENT_STYLE_PAGES: Partial<
  Record<ReportPageId, {titleKey: string; descriptionKey: string; reportType: string}>
> = {
  overseer_goals: {
    titleKey: 'generateReport.overseerGoalsTitle',
    descriptionKey: 'generateReport.overseerGoalsDescription',
    reportType: 'overseer_goals_only',
  },
  overseer_reg_goals: {
    titleKey: 'generateReport.overseerRegGoalsTitle',
    descriptionKey: 'generateReport.overseerRegGoalsDescription',
    reportType: '36',
  },
  overseer_goals_actuals: {
    titleKey: 'generateReport.overseerGoalsActualsTitle',
    descriptionKey: 'generateReport.overseerGoalsActualsDescription',
    reportType: '37',
  },
  overseer_goals_3yr: {
    titleKey: 'generateReport.overseerGoals3YearTitle',
    descriptionKey: 'generateReport.overseerGoals3YearDescription',
    reportType: '38',
  },
};
