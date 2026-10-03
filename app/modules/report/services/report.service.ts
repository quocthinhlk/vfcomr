import RNFS from 'react-native-fs';
import api from '../../../config/api';

export type ReportCatalog = {
  title: string;
  subHeading: string;
  groups: {key: string; types: string[]}[];
};

const ENDPOINTS: Record<string, string> = {
  church: 'generate-reports/church',
  church_reports_graph_reports: 'generate-reports/church-reports-graph-reports',
  visit_report: 'generate-reports/visit-report',
  church_report_status: 'generate-reports/church-report-status',
  multi_church: 'generate-reports/multi-church',
  user_data: 'generate-reports/user-data',
  user_graph: 'generate-reports/user-graph',
  event: 'generate-reports/event',
  my_directory: 'generate-reports/my-directory',
};

export type ReportRequest = {
  group: string;
  reportType?: string;
  churchId?: number | null;
  userId?: number | null;
  endMonth?: number | null;
  endYear?: number | null;
  geographicalRegionId?: number | null;
  geographicalRegionIds?: number[];
  churchRegionIds?: number[];
  languageRegionIds?: number[];
};

export type ReportDownload = {url: string; filename: string; label: 'pdf' | 'excel'};

export type GeneratedReport =
  | {kind: 'files'; files: ReportDownload[]}
  | {kind: 'message'; message: string};

export async function getReportCatalog(): Promise<ReportCatalog> {
  const response = await api.get('generate-reports');
  const data = response.data?.data ?? {};
  const types = data.report_types ?? {};
  const groups = Object.keys(types).map(key => ({
    key,
    types: Array.isArray(types[key]) ? types[key].map(String) : [],
  }));
  return {
    title: data.title || 'Generate Reports',
    subHeading: data.sub_heading || '',
    groups,
  };
}

export function buildReportBody(request: ReportRequest): Record<string, unknown> {
  const group = request.group;
  if (
    group === 'church' ||
    group === 'church_reports_graph_reports' ||
    group === 'visit_report'
  ) {
    return {
      church_id: request.churchId,
      end_month: request.endMonth,
      end_year: request.endYear,
      report_type: request.reportType,
      msc_report_type: 1,
    };
  }
  if (group === 'church_report_status') {
    return {
      user_id: request.userId,
      end_month: request.endMonth,
      end_year: request.endYear,
      report_type: request.reportType,
    };
  }
  if (group === 'user_data') {
    return {
      user_id: request.userId,
      geographical_region_id: request.geographicalRegionId ?? null,
      end_year: request.endYear,
      report_type: request.reportType,
    };
  }
  if (group === 'user_graph') {
    return {
      user_id: request.userId,
      end_year: request.endYear,
      report_type: request.reportType,
    };
  }
  if (group === 'multi_church') {
    return {
      geographical_region_ids: request.geographicalRegionIds ?? [],
      church_region_ids: request.churchRegionIds ?? [],
      language_region_ids: request.languageRegionIds ?? [],
      end_year: request.endYear,
      report_type: request.reportType,
    };
  }
  if (group === 'event') {
    return {
      user_id: request.userId,
      end_year: request.endYear,
    };
  }
  return {sort_by: request.reportType};
}

type ReportFilePayload = {
  report_type?: string;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  pdf_url?: string;
};

export async function generateReport(request: ReportRequest): Promise<GeneratedReport> {
  const path = ENDPOINTS[request.group];
  if (!path) {
    throw new Error('Unknown report.');
  }
  const response = await api.post(path, buildReportBody(request), {timeout: 120000});
  const body = response.data ?? {};
  const data = readReportPayload(body);
  const files = listReportFiles(data);
  if (files.length === 0) {
    const message =
      (typeof body?.message === 'string' && body.message) || 'Request was successful';
    return {kind: 'message', message};
  }
  return {kind: 'files', files};
}

export async function downloadReportFile(file: ReportDownload): Promise<string> {
  const localPath = `${RNFS.CachesDirectoryPath}/${file.filename}`;
  const exists = await RNFS.exists(localPath);
  if (!exists) {
    const download = await RNFS.downloadFile({fromUrl: file.url, toFile: localPath}).promise;
    if (download.statusCode < 200 || download.statusCode >= 300) {
      throw new Error(`Could not download the report (${download.statusCode}).`);
    }
  }
  return localPath;
}

function readReportPayload(body: any): ReportFilePayload {
  const nested = body?.data;
  if (nested && (nested.file_url || nested.pdf_url || nested.file_name)) {
    return nested;
  }
  if (body?.file_url || body?.pdf_url) {
    return body;
  }
  return nested ?? {};
}

function listReportFiles(data: ReportFilePayload): ReportDownload[] {
  const files: ReportDownload[] = [];
  const pdfUrl = httpUrl(data.pdf_url);
  const fileUrl = httpUrl(data.file_url);
  const fileType = (data.file_type || '').toLowerCase().replace(/^\./, '');
  const fileName = safeFileName(data.file_name);
  const base = (fileName || 'report').replace(/\.[^.]+$/, '');

  if (pdfUrl) {
    files.push({url: pdfUrl, filename: `${base}.pdf`, label: 'pdf'});
  }
  if (fileUrl) {
    const ext = fileType || extensionOf(fileName) || 'xlsx';
    const named = fileName && fileName.toLowerCase().endsWith(`.${ext}`)
      ? fileName
      : `${base}.${ext}`;
    if (!files.some(file => file.url === fileUrl)) {
      files.push({
        url: fileUrl,
        filename: named,
        label: ext === 'pdf' ? 'pdf' : 'excel',
      });
    }
  }
  return files;
}

function httpUrl(value: unknown): string {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : '';
}

function safeFileName(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.split('?')[0].split('/').pop()?.replace(/[^\w.\-]+/g, '_') || '';
}

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename);
  return match?.[1]?.toLowerCase() || '';
}

export function reportGroupNeeds(group: string) {
  return {
    church: group === 'church' || group === 'church_reports_graph_reports' || group === 'visit_report',
    user:
      group === 'church_report_status' ||
      group === 'user_data' ||
      group === 'user_graph' ||
      group === 'event',
    month:
      group === 'church' ||
      group === 'church_reports_graph_reports' ||
      group === 'visit_report' ||
      group === 'church_report_status',
    year: group !== 'my_directory',
    reportType: group !== 'event',
    geoSingle: group === 'user_data',
    regions: group === 'multi_church',
    directory: group === 'my_directory',
  };
}

export function humanizeReportKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
