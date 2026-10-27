import {PermissionsAndroid, Platform} from 'react-native';
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

export type ReportFormat = 'excel' | 'pdf';

export type ReportDownload = {url: string; filename: string; label: ReportFormat};

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

/**
 * POST a report request and return every format the API produced for it
 * (Excel from file_url, PDF from pdf_url), so the user picks one to download.
 * The web picks file_url or pdf_url the same way; the request is identical.
 */
export async function generateReport(
  endpoint: ReportEndpoint,
  body: Record<string, unknown>,
  fallbackFilename: string,
): Promise<GeneratedReport> {
  const response = await api.post(REPORT_ENDPOINTS[endpoint], body, {timeout: 120000});
  const payload = response.data ?? {};
  if (payload?.success === false) {
    throw {response: {data: payload}};
  }
  const files = listReportFiles(readReportPayload(payload), fallbackFilename);
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
  // One folder per URL: reports generated with other filters often reuse the
  // same file name, and a cache keyed by name alone reopened the old file.
  const dir = `${RNFS.CachesDirectoryPath}/reports/${urlKey(file.url)}`;
  const localPath = `${dir}/${file.filename}`;
  if (await RNFS.exists(localPath)) {
    return localPath;
  }
  await RNFS.mkdir(dir);
  const download = await RNFS.downloadFile({fromUrl: file.url, toFile: localPath}).promise;
  if (download.statusCode < 200 || download.statusCode >= 300) {
    await RNFS.unlink(localPath).catch(() => {});
    throw new Error(`Could not download the report (${download.statusCode}).`);
  }
  return localPath;
}

/** Thrown when Android (9 and older) refuses the storage permission. */
export class StoragePermissionError extends Error {}

/**
 * Android: saves a report in the public Download folder (visible in the Files /
 * Downloads apps), unlike downloadReportFile, which keeps it in the app cache to
 * open it. An existing file of the same name is kept; the copy gets " (1)"…
 * (iOS saves through the system "Save to Files" sheet instead.)
 */
export async function saveReportToDownloads(file: ReportDownload): Promise<string> {
  const cached = await downloadReportFile(file);
  if (Number(Platform.Version) < 29) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new StoragePermissionError();
    }
  }
  const dir = RNFS.DownloadDirectoryPath;
  await RNFS.mkdir(dir);
  const target = await freePath(dir, file.filename);
  await RNFS.copyFile(cached, target);
  // Make it show up in the Downloads / Files apps right away.
  await RNFS.scanFile(target).catch(() => {});
  return target;
}

/** `dir/name.ext`, or `dir/name (n).ext` when that already exists. */
export async function freePath(dir: string, filename: string): Promise<string> {
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  let candidate = `${dir}/${filename}`;
  for (let n = 1; (await RNFS.exists(candidate)) && n < 1000; n++) {
    candidate = `${dir}/${base} (${n})${ext}`;
  }
  return candidate;
}

/** Short stable key for a URL (djb2), safe as a folder name. */
function urlKey(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export type ReportFilePayload = {
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

/**
 * The downloadable formats of a generated report, Excel first:
 * - file_url: the report file, named file_name (or the URL's last segment);
 *   usually a spreadsheet, sometimes already a PDF.
 * - pdf_url: its PDF version, named after file_name with a .pdf extension.
 */
export function listReportFiles(data: ReportFilePayload, fallbackFilename: string): ReportDownload[] {
  const pdfUrl = httpUrl(data.pdf_url);
  const fileUrl = httpUrl(data.file_url);
  const fileName = safeFileName(data.file_name);
  const fallback = safeFileName(fallbackFilename) || 'report';
  const files: ReportDownload[] = [];

  if (fileUrl) {
    let filename = fileName || nameFromUrl(fileUrl) || fallback;
    const fileType = (data.file_type || '').toLowerCase().replace(/^\./, '');
    if (!extensionOf(filename)) {
      filename = `${filename}.${fileType || 'xlsx'}`;
    }
    files.push({url: fileUrl, filename, label: extensionOf(filename) === 'pdf' ? 'pdf' : 'excel'});
  }
  if (pdfUrl && pdfUrl !== fileUrl && !files.some(file => file.label === 'pdf')) {
    const base = (fileName || nameFromUrl(pdfUrl) || fallback).replace(/\.[^.]+$/, '');
    files.push({url: pdfUrl, filename: `${base}.pdf`, label: 'pdf'});
  }
  return files.sort((x, y) => (x.label === y.label ? 0 : x.label === 'excel' ? -1 : 1));
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
