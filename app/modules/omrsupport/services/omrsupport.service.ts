import api from '../../../config/api';

export interface OmrSupportIntroData {
  title?: string;
  message?: string;
}

export interface OmrSupportRequestPayload {
  name: string;
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
