import api from '../../../config/api';

export interface OmrSupportIntroData {
  title?: string;
  message?: string;
}

export interface OmrSupportRequestPayload {
  name: string;
  /** Required by the API ("Email is a required field"): requests sent
   * without it were all rejected. */
  email: string;
  subject: string;
  message: string;
}

export async function getOmrSupportIntro(): Promise<OmrSupportIntroData> {
  const response = await api.get('support');
  return (response?.data?.data ?? {}) as OmrSupportIntroData;
}

export async function createOmrSupportRequest(payload: OmrSupportRequestPayload) {
  const response = await api.post('support', payload);
  return response?.data;
}

/** The signed-in user, to prefill name and e-mail. */
export async function getSupportContact() {
  const response = await api.get('users/me');
  return response?.data?.data;
}
