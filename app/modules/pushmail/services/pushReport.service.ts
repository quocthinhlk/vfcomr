import api from '../../../config/api';

export type PushReportOption = {value: string; label: string};

export interface PushReportOptions {
  days_of_month: PushReportOption[];
  frequencies: PushReportOption[];
  report_types: PushReportOption[];
  scopes: PushReportOption[];
  statuses: PushReportOption[];
}

export interface PushReportConfig {
  id: number;
  report_type: string;
  report_label: string;
  user_id: number;
  frequency: number;
  day_of_month: number;
  execution_date: string;
  scope: string;
  status: number;
  status_label: string;
}

/** Status 2 ("Remove") deletes the user's configuration instead of saving it. */
export const PUSH_REPORT_STATUS_REMOVE = '2';

export interface PushReportPayload {
  report_type: string;
  frequency: number;
  day_of_month: number;
  scope: string;
  status: number;
}

/** GET push-reports/options: the choices for every radio group (labels come from the server). */
export async function getPushReportOptions(): Promise<PushReportOptions> {
  const res = await api.get('push-reports/options');
  const data = res.data?.data ?? {};
  const list = (v: unknown): PushReportOption[] =>
    Array.isArray(v)
      ? v.map((o: any) => ({value: String(o?.value ?? ''), label: String(o?.label ?? '')}))
      : [];
  return {
    days_of_month: list(data.days_of_month),
    frequencies: list(data.frequencies),
    report_types: list(data.report_types),
    scopes: list(data.scopes),
    statuses: list(data.statuses),
  };
}

/** GET push-reports/user/{id}; null when the user has none yet (the API answers 404). */
export async function getUserPushReport(userId: number): Promise<PushReportConfig | null> {
  try {
    const res = await api.get(`push-reports/user/${userId}`);
    return res.data?.data ?? null;
  } catch (e: any) {
    if (e?.response?.status === 404) {
      return null;
    }
    throw e;
  }
}

/** POST push-reports/user/{id}: creates or updates; status 2 removes (no `data` back). */
export async function saveUserPushReport(userId: number, payload: PushReportPayload) {
  const res = await api.post(`push-reports/user/${userId}`, payload);
  return res.data as {success: boolean; data?: PushReportConfig; message?: string};
}
