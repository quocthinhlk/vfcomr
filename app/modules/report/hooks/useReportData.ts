import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform, Share} from 'react-native';
import axios from 'axios';
import FileViewer from 'react-native-file-viewer';
import api from '../../../config/api';
import {listUsers} from '../../user/services/user.service';
import {resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {
  downloadReportFile,
  generateReport,
  listReportOverseers,
  NamedId,
  ReportDownload,
  ReportEndpoint,
  reportErrorMessage,
  ReportFileMode,
} from '../services/report.service';
import {useReportText} from '../reportTexts';

export type CurrentUser = {id: number; name: string; roleId: number | null};

/** GET users/me: id, display name and role of the signed-in user. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await api.get('users/me');
  const data = res?.data?.data;
  const id = Number(data?.id);
  if (!Number.isFinite(id)) {
    return null;
  }
  const name =
    data?.name || [data?.first_name, data?.last_name].filter(Boolean).join(' ') || String(id);
  return {id, name, roleId: resolveRoleIdFromUser(data)};
}

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

function mergeById(current: NamedId[], next: NamedId[]): NamedId[] {
  const seen = new Set(current.map(item => item.id));
  return [...current, ...next.filter(item => !seen.has(item.id))];
}

type PageFetcher = (
  page: number,
  search: string,
) => Promise<{items: NamedId[]; hasNext: boolean}>;

/** Searchable, paged list (web UserSelectInput: 25 per page, search with a 400 ms delay). */
function usePagedSearch(fetchPage: PageFetcher) {
  const mounted = useMounted();
  const [items, setItems] = useState<NamedId[]>([]);
  const [loading, setLoading] = useState(false);
  const stateRef = useRef({page: 1, search: '', hasNext: true, busy: false, token: 0});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      const state = stateRef.current;
      if (reset) {
        state.page = 1;
        state.hasNext = true;
        state.token += 1;
      }
      if (!state.hasNext || (state.busy && !reset)) {
        return;
      }
      const token = state.token;
      state.busy = true;
      setLoading(true);
      try {
        const result = await fetchPage(state.page, state.search);
        if (!mounted.current || token !== stateRef.current.token) {
          return;
        }
        state.hasNext = result.hasNext;
        state.page += 1;
        setItems(current => (reset ? result.items : mergeById(current, result.items)));
      } catch {
        // A failed search keeps the current list.
      } finally {
        if (token === stateRef.current.token) {
          state.busy = false;
          if (mounted.current) {
            setLoading(false);
          }
        }
      }
    },
    [fetchPage, mounted],
  );

  useEffect(() => {
    void load(true);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [load]);

  const search = useCallback(
    (text: string) => {
      stateRef.current.search = text.trim();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void load(true);
      }, 400);
    },
    [load],
  );

  const loadMore = useCallback(() => {
    void load(false);
  }, [load]);

  /** Keep a pre-selected entry (e.g. the signed-in user) in the list. */
  const ensure = useCallback((item: NamedId | null) => {
    if (item) {
      setItems(current => (current.some(entry => entry.id === item.id) ? current : [item, ...current]));
    }
  }, []);

  return {items, loading, search, loadMore, ensure};
}

const fetchUserPage: PageFetcher = async (page, search) => {
  const res = await listUsers({page, limit: 25, search, sort_by: 'name', sort_desc: false});
  const data: any = res?.data ?? {};
  const items: NamedId[] = (data.items ?? []).map((item: any) => ({
    id: Number(item.id),
    label: item.name || String(item.id),
  }));
  return {items, hasNext: data.has_next != null ? !!data.has_next : items.length >= 25};
};

const fetchChurchPage: PageFetcher = async (page, search) => {
  const res = await api.get('churches', {
    params: {page, limit: 30, search, sort_by: 'name', sort_desc: false, disabled: false},
  });
  const data = res?.data?.data ?? {};
  const items: NamedId[] = (data.items ?? []).map((item: any) => ({
    id: Number(item.id),
    label: item.name || String(item.id),
  }));
  return {items, hasNext: data.has_next != null ? !!data.has_next : items.length >= 30};
};

/** Leader / user picker options (web UserSelectInput). */
export function useUserSearch() {
  return usePagedSearch(fetchUserPage);
}

/** Church picker options. */
export function useChurchSearch() {
  return usePagedSearch(fetchChurchPage);
}

/** Overseers for the #40 report (web: first 200). */
export function useOverseerList() {
  const mounted = useMounted();
  const [items, setItems] = useState<NamedId[]>([]);
  useEffect(() => {
    listReportOverseers('', 200)
      .then(list => {
        if (mounted.current) {
          setItems(list);
        }
      })
      .catch(() => {});
  }, [mounted]);
  return items;
}

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

function asList(payload: any): any[] {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  return [];
}

export type RegionKind = 'geo' | 'church' | 'language' | 'countries';

const REGION_REQUEST: Record<RegionKind, () => Promise<any>> = {
  geo: () => api.get('geographical-regions', {params: {sort_by: 'name', sort_desc: false}}),
  church: () => api.get('church-regions', {params: {sort_by: 'name', sort_desc: false}}),
  language: () => api.get('language-regions', {params: {sort_by: 'name', sort_desc: false}}),
  countries: () =>
    api.get('countries', {params: {page: 1, limit: 1000, sort_by: 'name', sort_desc: false}}),
};

/** Region / country lists for the region pickers. */
export function useRegionLists(kinds: RegionKind[]) {
  const mounted = useMounted();
  const [lists, setLists] = useState<Record<RegionKind, NamedId[]>>({
    geo: [],
    church: [],
    language: [],
    countries: [],
  });
  const key = kinds.join(',');
  useEffect(() => {
    const wanted = key.split(',').filter(Boolean) as RegionKind[];
    wanted.forEach(kind => {
      REGION_REQUEST[kind]()
        .then(res => {
          if (mounted.current) {
            setLists(current => ({...current, [kind]: flattenRegions(asList(res))}));
          }
        })
        .catch(error => {
          console.error(`Failed to load ${kind} options:`, error);
        });
    });
  }, [key, mounted]);
  return lists;
}

/** Submit a report and open its file(s), with the web's error wording. */
export function useReportGenerator() {
  const mounted = useMounted();
  const {t} = useTranslation();
  const {rt} = useReportText();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [files, setFiles] = useState<ReportDownload[]>([]);
  const [infoMessage, setInfoMessage] = useState('');
  const [openingUrl, setOpeningUrl] = useState<string | null>(null);

  const generate = useCallback(
    async (
      endpoint: ReportEndpoint,
      body: Record<string, unknown>,
      fallbackFilename: string,
      mode: ReportFileMode = 'file',
    ) => {
      setErrorMessage('');
      setInfoMessage('');
      setFiles([]);
      setSubmitting(true);
      try {
        const result = await generateReport(endpoint, body, fallbackFilename, mode);
        if (!mounted.current) {
          return;
        }
        if (result.kind === 'files') {
          setFiles(result.files);
        } else {
          setInfoMessage(result.message);
        }
      } catch (error) {
        if (!mounted.current) {
          return;
        }
        // No response (offline, timeout): the app's localized message. Otherwise
        // the API's own reason (errors.detail / message), as on the web.
        const noResponse = axios.isAxiosError(error) && !error.response;
        setErrorMessage(
          noResponse
            ? getApiErrorMessage(error, t)
            : reportErrorMessage(error) || rt('generateReport.generateError'),
        );
      } finally {
        if (mounted.current) {
          setSubmitting(false);
        }
      }
    },
    [mounted, rt, t],
  );

  const openFile = useCallback(
    async (file: ReportDownload) => {
      if (openingUrl) {
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
        if (mounted.current) {
          setErrorMessage(
            axios.isAxiosError(error)
              ? getApiErrorMessage(error, t)
              : error instanceof Error && error.message
                ? error.message
                : getApiErrorMessage(error, t),
          );
        }
      } finally {
        if (mounted.current) {
          setOpeningUrl(null);
        }
      }
    },
    [mounted, openingUrl, t],
  );

  return {submitting, errorMessage, infoMessage, files, generate, openFile, openingUrl};
}
