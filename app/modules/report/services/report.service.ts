import RNFS from 'react-native-fs';
import api from '../../../config/api';

/**
 * Generate Reports API, mirroring the web app's generateReportService
 * (staging.vfc-omr.org): same endpoints, same request bodies, same file
 * handling ("file" → file_url, "pdf" → pdf_url).
 */

export type ReportCatalog = {
  title: string;
  subHeading: string;
  /** Catalog group → report types the API offers (GET generate-reports). */
  reportTypes: Record<string, string[]>;
};

export const REPORT_ENDPOINTS = {
  church: 'generate-reports/church',
  churchGraph: 'generate-reports/church-reports-graph-reports',
  churchReportStatus: 'generate-reports/church-report-status',
  myDirectory: 'generate-reports/my-directory',
  visitReport: 'generate-reports/visit-report',
  userGraph: 'generate-reports/user-graph',
  multiChurch: 'generate-reports/multi-church',
  userData: 'generate-reports/user-data',
  event: 'generate-reports/event',
  uaogSearchLog: 'generate-reports/uaog-public-search-log',
  overseerAccessRights: 'generate-reports/overseer-access-rights',
  /** App only (Research Info sketch): not on the web. */
  overseerResearching: 'generate-reports/overseer-researching',
} as const;

export type ReportEndpoint = keyof typeof REPORT_ENDPOINTS;

/** "file": the report file (file_url). "pdf": its PDF version (pdf_url). */
export type ReportFileMode = 'file' | 'pdf';

export type ReportDownload = {url: string; filename: string; label: 'pdf' | 'excel'};

export type GeneratedReport =
  | {kind: 'files'; files: ReportDownload[]}
  | {kind: 'message'; message: string};

let catalogRequest: Promise<ReportCatalog> | null = null;

/** GET generate-reports, cached like the web (retried after a failure). */
export function getReportCatalog(): Promise<ReportCatalog> {
  if (!catalogRequest) {
    catalogRequest = api
      .get('generate-reports')
      .then(response => {
        const data = response.data?.data ?? {};
        const types = data.report_types ?? {};
        const reportTypes: Record<string, string[]> = {};
        Object.keys(types).forEach(key => {
          reportTypes[key] = Array.isArray(types[key]) ? types[key].map(String) : [];
        });
        return {
          title: data.title || 'Generate Reports',
          subHeading: data.sub_heading || '',
          reportTypes,
        };
      })
      .catch(error => {
        catalogRequest = null;
        throw error;
      });
  }
  return catalogRequest;
}

/** POST a report request and return the file(s) to open, like the web's generate(). */
export async function generateReport(
  endpoint: ReportEndpoint,
  body: Record<string, unknown>,
  fallbackFilename: string,
  mode: ReportFileMode = 'file',
): Promise<GeneratedReport> {
  const response = await api.post(REPORT_ENDPOINTS[endpoint], body, {timeout: 120000});
  const payload = response.data ?? {};
  if (payload?.success === false) {
    throw {response: {data: payload}};
  }
  const files = listReportFiles(readReportPayload(payload), mode, fallbackFilename);
  if (files.length === 0) {
    const message =
      (typeof payload?.message === 'string' && payload.message) || 'Request was successful';
    return {kind: 'message', message};
  }
  return {kind: 'files', files};
}

/**
 * The API's own explanation of a failed report, as the web shows it:
 * `errors.detail` first, then `message`. Null when there is none.
 */
export function reportErrorMessage(error: unknown): string | null {
  const data = (error as any)?.response?.data ?? error;
  if (!data || typeof data !== 'object') {
    return null;
  }
  const pick = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const joined = value.map(item => String(item).trim()).filter(Boolean).join('\n');
      return joined || null;
    }
    return null;
  };
  return pick((data as any).errors?.detail) || pick((data as any).message);
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

type ReportFilePayload = {
  file_name?: string;
  file_url?: string;
  file_type?: string;
  pdf_url?: string;
};

function readReportPayload(body: any): ReportFilePayload {
  const nested = body?.data;
  if (nested && typeof nested === 'object') {
    return nested;
  }
  return body ?? {};
}

function listReportFiles(
  data: ReportFilePayload,
  mode: ReportFileMode,
  fallbackFilename: string,
): ReportDownload[] {
  const pdfUrl = httpUrl(data.pdf_url);
  const fileUrl = httpUrl(data.file_url);
  const fileName = safeFileName(data.file_name);
  const fallback = safeFileName(fallbackFilename) || 'report';

  // Web: "pdf" takes pdf_url, named after file_name with a .pdf extension.
  if (mode === 'pdf' || (!fileUrl && pdfUrl)) {
    if (!pdfUrl) {
      return [];
    }
    const base = (fileName || nameFromUrl(pdfUrl) || fallback).replace(/\.[^.]+$/, '');
    return [{url: pdfUrl, filename: `${base}.pdf`, label: 'pdf'}];
  }
  if (!fileUrl) {
    return [];
  }
  // Web: "file" takes file_url, named file_name (or the URL's last segment).
  let filename = fileName || nameFromUrl(fileUrl) || fallback;
  const fileType = (data.file_type || '').toLowerCase().replace(/^\./, '');
  if (!extensionOf(filename)) {
    filename = `${filename}.${fileType || extensionOf(fallback) || 'pdf'}`;
  }
  const ext = extensionOf(filename);
  return [{url: fileUrl, filename, label: ext === 'pdf' ? 'pdf' : 'excel'}];
}

function nameFromUrl(url: string): string {
  try {
    return safeFileName(decodeURIComponent(url.split('?')[0].split('/').pop() || ''));
  } catch {
    return '';
  }
}

function httpUrl(value: unknown): string {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : '';
}

function safeFileName(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().split('?')[0].split('/').pop()?.replace(/[^\w.\-]+/g, '_') || '';
}

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename);
  return match?.[1]?.toLowerCase() || '';
}

/* ------------------------------------------------------------------ */
/* Option lists used by the report forms                                */
/* ------------------------------------------------------------------ */

export type NamedId = {id: number; label: string};

/** GET users/overseers (the web's #40 loads up to 200). */
export async function listReportOverseers(search = '', limit = 200): Promise<NamedId[]> {
  const response = await api.get('users/overseers', {
    params: {page: 1, limit, ...(search.trim() ? {search: search.trim()} : {})},
  });
  const items = response.data?.data?.items ?? [];
  return items
    .map((item: any) => ({id: Number(item?.id), label: item?.name || String(item?.id)}))
    .filter((item: NamedId) => Number.isFinite(item.id));
}

/** Research reports take a "YYYY-YYYY" period: next one first, then 15 back. */
export function researchYearPeriods(today = new Date()): string[] {
  const current = today.getFullYear();
  return Array.from({length: 16}, (_, index) => {
    const start = current - index;
    return `${start}-${start + 1}`;
  });
}

/** Web `yearOptions(n, e)`: next `ahead` years down to `back` years ago. */
export function yearOptions(back = 15, ahead = 1, today = new Date()): string[] {
  const current = today.getFullYear();
  const years: string[] = [];
  for (let year = current + ahead; year >= current - back; year--) {
    years.push(String(year));
  }
  return years;
}

/** Web `reportYearOptions()`: this year down to 1980. */
export function yearsSince1980(today = new Date()): string[] {
  const current = today.getFullYear();
  const years: string[] = [];
  for (let year = current; year >= Math.min(1980, current); year--) {
    years.push(String(year));
  }
  return years;
}
