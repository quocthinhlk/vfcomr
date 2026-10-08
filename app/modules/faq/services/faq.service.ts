import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  tags: FAQTag[];
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

export async function listFAQs(params: ListFAQsParams = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }

  const response = await api.get<ListFAQsResponse>(`/faqs`, {
    params: {
      ...(params.language_id ? { language_id: params.language_id } : {}),
      ...(params.question_header?.trim()
        ? { question_header: params.question_header.trim() }
        : {}),
    },
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function getFAQById(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.get<GetFAQResponse>(`/faqs/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export interface CreateFAQPayload {
  question_header: string;
  answer: string;
  language_id: number;
  tags: { tag_name: string }[];
}

export async function createFAQ(payload: CreateFAQPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.post(`/faqs`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Create FAQ failed';
    console.error('Create FAQ error:', message);
    throw new Error(message);
  }
}

export interface UpdateFAQPayload {
  question_header: string;
  answer: string;
  language_id: number;
  tags: { tag_name: string }[];
}

export async function updateFAQ(id: number, payload: UpdateFAQPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.patch(`/faqs/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function deleteFAQ(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  const response = await api.delete(`/faqs/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

