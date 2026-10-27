import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';

/**
 * Uploads a user photo (images/upload) and returns its stored path. Throws when
 * the API answers without a path, so callers never save an empty photo silently.
 */
export async function uploadUserPhoto(imagePath: string, altText = ''): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri: imagePath,
    name: imagePath.split('/').pop() || 'photo.jpg',
    type: 'image/jpeg',
  } as any);
  form.append('entity_type', 'users');
  form.append('alt_text', altText.trim() || 'user photo');
  const response = await api.post('images/upload', form, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  const path = (response.data as any)?.data?.path;
  if (typeof path !== 'string' || !path) {
    throw new Error((response.data as any)?.message || '');
  }
  return path;
}

export interface AddUserPayload {
  username: string;
  password?: string;
  prefix: string;
  first_name: string;
  last_name: string;
  title: string;
  role_id: string | number | null;
  user_photo: string;
  street_address: string;
  country_id: string | number | null;
  postal_code: string;
  church_id: string | number | null;
  sensitive_nation: boolean | string;
  language_id: string | number | null;
  home_phone: string;
  mobile_phone: string;
  email_address: string;
  credentials: string;
  credentials_number: string;
  /** Issuing body. The API field is `credentials_from` (GET users/:id returns it). */
  credentials_from: string;
  credentials_expiry_date: string | null;
  date_of_birth: string | null;
  marital_status: string;
  name_of_spouse: string;
  children: { full_name: string }[];
}

export async function addUser(payload: Partial<AddUserPayload>) {
  const response = await api.post('/users', payload);
  return response.data;
}

export async function updateUser(id: number, payload: Partial<AddUserPayload>) {
  const response = await api.patch(`/users/${id}`, payload);
  return response.data;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Server-side sort column, e.g. 'name' or 'id'. Omitted → API default. */
  sort_by?: string;
  sort_desc?: boolean;
}

export interface ListUsersItem {
  id: number;
  name: string;
  mobile_phone: string;
  email: string;
  role_name: string;
  country_name: string;
  // Extended fields returned by the list API
  prefix?: string;
  title?: string;
  church_name?: string;
  pastor_of?: string;
  city?: string;
  photo_url?: string;
}

export interface ListUsersResponse {
  success: boolean;
  data: {
    items: ListUsersItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

const MULTI_WORD_FETCH_LIMIT = 100;
const MULTI_WORD_MAX_PAGES = 5;

/**
 * The /users search matches one field at a time, so "shane c" or a full name
 * finds nothing. For multi-word queries: ask the server for the longest word,
 * keep users whose name / username / email contain every word, and page
 * the result here so the screens keep working unchanged.
 */
async function listUsersMultiWord(
  params: ListUsersParams,
  words: string[],
): Promise<ListUsersResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const seed = [...words].sort((a, b) => b.length - a.length)[0];
  const collected: ListUsersItem[] = [];
  for (let p = 1; p <= MULTI_WORD_MAX_PAGES; p++) {
    const response = await api.get<ListUsersResponse>(`/users`, {
      params: {
        page: p,
        limit: MULTI_WORD_FETCH_LIMIT,
        search: seed,
        ...(params.sort_by ? {sort_by: params.sort_by} : {}),
        ...(typeof params.sort_desc === 'boolean' ? {sort_desc: params.sort_desc} : {}),
      },
    });
    const data = response.data?.data;
    collected.push(...(data?.items ?? []));
    if (!data?.has_next) {
      break;
    }
  }
  const needles = words.map(w => w.toLowerCase());
  const matches = collected.filter(u => {
    const any = u as any;
    // Name-like fields only: "shane c" means a person, not a church or city.
    const haystack = [u.prefix, u.name, any.first_name, any.last_name, any.username, u.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return needles.every(n => haystack.includes(n));
  });
  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    success: true,
    data: {
      items: matches.slice((safePage - 1) * limit, safePage * limit),
      total,
      page: safePage,
      limit,
      total_pages: totalPages,
      has_next: safePage < totalPages,
      has_previous: safePage > 1,
    },
  } as ListUsersResponse;
}

export async function listUsers(params: ListUsersParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const search = params.search ?? '';

  const words = search.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return listUsersMultiWord(params, words);
  }

  const response = await api.get<ListUsersResponse>(`/users`, {
    params: {
      page,
      limit,
      search: search.trim(),
      ...(params.sort_by ? { sort_by: params.sort_by } : {}),
      ...(typeof params.sort_desc === 'boolean' ? { sort_desc: params.sort_desc } : {}),
    },
  });
  return response.data;
}

// Add: get user detail by id
export interface UserDetailRole {
  id: number;
  name: string;
  remarks: string | null;
}

export interface UserDetailData {
  id: number;
  username: string;
  prefix: string;
  first_name: string;
  last_name: string;
  title: string;
  street_address: string;
  country_id: number;
  postal_code: string;
  church_id: number | null;
  sensitive_nation: boolean;
  language_id: number;
  home_phone: string;
  mobile_phone: string;
  email_address: string;
  credentials: string;
  credentials_number: string;
  credentials_from: string;
  credentials_expiry_date: string | null;
  date_of_birth: string | null;
  marital_status: string;
  name_of_spouse: string;
  children: any;
  profile_comments: string;
  country_name: string;
  role: UserDetailRole;
  created: string | null;
  modified: string | null;
  user_photo: string | null;
  photo_url: string | null;
  name: string;
  createdAt: string;
}

export interface GetUserResponse {
  success: boolean;
  data: UserDetailData;
  message: string;
}

export async function getUserById(id: number, includePastorChurches?: boolean) {
  const response = await api.get<GetUserResponse>(`/users/${id}`, {
    params: includePastorChurches ? {include_pastor_churches: 'true'} : {},
  });
  return response.data;
}

export async function deleteUser(id: number) {
  const response = await api.delete(`/users/${id}`);
  return response.data;
}

export interface ChangeMyPasswordPayload {
  old_password: string;
  new_password: string;
  repeat_new_password: string;
}

/**
 * The logged-in user changes their own password.
 * Fails with 400 "Old password is incorrect" or 422 `errors.<field>`.
 */
export async function changeMyPassword(payload: ChangeMyPasswordPayload) {
  const response = await api.post('users/me/password', payload);
  return response.data as {success: boolean; message: string};
}

export interface ChangeEmailPayload {
  old_email: string;
  new_email: string;
  password: string;
}

/**
 * Changes the sign-in email after checking the current email + password.
 * Fails with "Invalid email or password" when they don't match.
 */
export async function changeEmail(payload: ChangeEmailPayload) {
  const response = await api.post('users/change-email', payload);
  return response.data as {success: boolean; message: string};
}
