import api, { DEFAULT_PAGE_LIMIT } from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ImageUploadResponse {
  path: string;
  message?: string;
}

export async function uploadImage(image: any): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: image.path,
    type: image.mime || 'image/jpeg',
    name: image.path.split('/').pop() || `photo.jpg`,
  });
  formData.append('entity_type', 'users'); // Assuming entity_type for users
  formData.append('alt_text', 'user photo');

  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }

  try {
    const response = await api.post<ImageUploadResponse>(
      'images/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (response.status === 200 && response.data.path) {
      return response.data.path;
    } else {
      throw new Error(response.data?.message || 'Upload failed');
    }
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || err.message || 'Upload failed');
  }
}

export interface AddUserPayload {
  username: string;
  password?: string; // Password might be optional for updates
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
  credentials_form: string;
  credentials_expiry_date: string | Date | null;
  date_of_birth: string | Date | null;
  marital_status: string;
  name_of_spouse: string;
  children: { full_name: string }[];
}

export async function addUser(payload: AddUserPayload) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.post(
      '/users',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: number, payload: Partial<AddUserPayload>) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.patch(
      `/users/${id}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  name?: string;
}

export interface ListUsersItem {
  id: number;
  name: string;
  mobile_phone: string;
  email: string;
  role_name: string;
  country_name: string;
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

export async function listUsers(params: ListUsersParams = {}) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const name = params.name ?? '';

  try {
    const response = await api.get<ListUsersResponse>(`/users`, {
      params: { page, limit, name },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
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
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const params: any = {};
    if (includePastorChurches) {
      params.include_pastor_churches = 'true';
    }
    const response = await api.get<GetUserResponse>(`/users/${id}`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user detail:', error);
    throw error;
  }
}

export async function deleteUser(id: number) {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found.');
  }
  try {
    const response = await api.delete(`/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
} 