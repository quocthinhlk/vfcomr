import api from '../../../config/api';

// Auth and language headers come from the api interceptor. These calls used to
// read the token from AsyncStorage themselves, which overrode the
// interceptor's choice and threw "No authentication token found" when the
// session token lived elsewhere (e.g. the dev test token).

export const LANGUAGE_NAME_MAX = 255;
/** The API answers at most 100 per page (a larger limit falls back to 10). */
const PAGE_SIZE = 100;

export interface LanguageItem {
  id: number;
  name: string;
}

export interface ListLanguagesResponse {
  success: boolean;
  data: {
    items: LanguageItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

/**
 * Every language (60 on staging). The API's own search is unusable: it only
 * matches the start of the name ("nam" finds nothing) and reports the
 * unfiltered total, so the list showed 6 pages of which only the first had
 * results. Screens search and page locally instead.
 */
export async function listAllLanguages(): Promise<LanguageItem[]> {
  const items: LanguageItem[] = [];
  for (let page = 1; page <= 50; page++) {
    const response = await api.get<ListLanguagesResponse>(`/languages`, {
      params: {page, limit: PAGE_SIZE},
    });
    const data = response.data?.data;
    items.push(...(data?.items ?? []));
    if (!data?.has_next || !(data?.items ?? []).length) {
      break;
    }
  }
  return items;
}

export interface GetLanguageResponse {
  success: boolean;
  data: LanguageItem;
  message: string;
}

export async function getLanguageById(id: number) {
  const response = await api.get<GetLanguageResponse>(`/languages/${id}`);
  return response.data;
}

export interface CreateLanguagePayload {
  name: string;
}

export async function createLanguage(payload: CreateLanguagePayload) {
  const response = await api.post(`/languages`, payload);
  return response.data;
}

export interface UpdateLanguagePayload {
  name: string;
}

export async function updateLanguage(id: number, payload: UpdateLanguagePayload) {
  const response = await api.patch(`/languages/${id}`, payload);
  return response.data;
}

export async function deleteLanguage(id: number) {
  const response = await api.delete(`/languages/${id}`);
  return response.data;
}

/**
 * FAQs written in this language. The API deletes a language in use and leaves
 * its FAQs pointing at a missing language. (Churches also have a language but
 * cannot be filtered by it.)
 */
export async function getLanguageFaqCount(id: number): Promise<number> {
  const res = await api.get('/faqs', {params: {language_id: id}});
  const data = res?.data?.data;
  if (Array.isArray(data)) {
    return data.length;
  }
  return Number(data?.total ?? data?.items?.length) || 0;
}
