import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';

export type RoleChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RoleChangeRequestItem {
  id: number;
  user_id: number;
  user_name: string;
  old_role_id: number;
  old_role_name: string;
  new_role_id: number;
  new_role_name: string;
  requested_by: number;
  requested_by_name: string;
  requested_at: string;
  status: RoleChangeRequestStatus | string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: number | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  admin_comments: string | null;
}

export interface ListRoleChangeRequestsResponse {
  success: boolean;
  data: {
    items: RoleChangeRequestItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface GetRoleChangeRequestResponse {
  success: boolean;
  data: RoleChangeRequestItem;
  message: string;
}

export interface ListRoleChangeRequestsParams {
  status?: RoleChangeRequestStatus;
  page?: number;
  limit?: number;
  sort_desc?: boolean;
}

export async function listRoleChangeRequests(
  params: ListRoleChangeRequestsParams = {},
): Promise<ListRoleChangeRequestsResponse> {
  const {
    status = 'pending',
    page = 1,
    limit = DEFAULT_PAGE_LIMIT,
    sort_desc = true,
  } = params;

  const res = await api.get<ListRoleChangeRequestsResponse>(
    'role-change-requests',
    {
      params: {
        status,
        page,
        limit,
        sort_desc,
      },
    },
  );
  return res.data;
}

export async function getRoleChangeRequest(
  id: number,
): Promise<GetRoleChangeRequestResponse> {
  const res = await api.get<GetRoleChangeRequestResponse>(
    `role-change-requests/${id}`,
  );
  return res.data;
}

export async function updateRoleChangeRequestStatus(
  id: number,
  status: RoleChangeRequestStatus,
): Promise<GetRoleChangeRequestResponse> {
  const res = await api.patch<GetRoleChangeRequestResponse>(
    `role-change-requests/${id}/status`,
    {status},
  );
  return res.data;
}

