import api from '../../../config/api';

export interface FAQTag {
  id?: number;
  tag_name: string;
  question_id?: number;
}

export interface FAQItem {
  id: number;
  question_header: string;
  answer: string;
  language_id: number;
  created_at: string;
  modified_at: string;
  /** Missing on FAQs saved without tags. */
  tags?: FAQTag[] | null;
}

export interface ListFAQsResponse {
  success: boolean;
  data: FAQItem[];
  message: string;
}

export interface GetFAQResponse {
  success: boolean;
  data: FAQItem;
  message: string;
}

export interface ListFAQsParams {
  language_id?: number;
  /** Server-side "contains" match on the question header. */
  question_header?: string;
}

// Auth and language headers come from the api interceptor. These calls used to
// require a token saved in AsyncStorage and threw "No authentication token
// found." otherwise (e.g. with the dev test token), so the FAQ screens failed.

/**
 * GET /faqs: every match at once (no paging). Filters: question_header (a
 * case-insensitive "contains" match) and language_id. No match answers
 * data: null, returned here as [].
 */
export async function listFAQs(params: ListFAQsParams = {}): Promise<ListFAQsResponse> {
  const response = await api.get<ListFAQsResponse>('/faqs', {
    params: {
      ...(params.language_id ? {language_id: params.language_id} : {}),
      ...(params.question_header?.trim()
        ? {question_header: params.question_header.trim()}
        : {}),
    },
  });
  return {...response.data, data: Array.isArray(response.data?.data) ? response.data.data : []};
}

export async function getFAQById(id: number) {
  const response = await api.get<GetFAQResponse>(`/faqs/${id}`);
  return response.data;
}

export interface CreateFAQPayload {
  question_header: string;
  /** HTML (shown as rich text, like the web). */
  answer: string;
  language_id: number;
  /** Replaces the FAQ's tags ([] removes them all). */
  tags: {tag_name: string}[];
}

/** POST /faqs answers the created FAQ (with its id). */
export async function createFAQ(payload: CreateFAQPayload) {
  const response = await api.post<GetFAQResponse>('/faqs', payload);
  return response.data;
}

export type UpdateFAQPayload = CreateFAQPayload;

/** PATCH /faqs/{id} needs every field (question_header, answer, language_id, tags). */
export async function updateFAQ(id: number, payload: UpdateFAQPayload) {
  const response = await api.patch<GetFAQResponse>(`/faqs/${id}`, payload);
  return response.data;
}

export async function deleteFAQ(id: number) {
  const response = await api.delete(`/faqs/${id}`);
  return response.data;
}
