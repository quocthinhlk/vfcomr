import api from '../../../config/api';

export interface ChurchNetworkItem {
  id: number;
  name: string;
  /** Pastors of churches in this network can't edit their own credentials. */
  pastor_credential_locked: boolean;
}

export interface GetChurchNetworkResponse {
  success: boolean;
  data: ChurchNetworkItem;
  message: string;
}

export interface ChurchNetworkPayload {
  name: string;
  pastor_credential_locked: boolean;
}

const toItem = (raw: any): ChurchNetworkItem => ({
  id: Number(raw?.id),
  name: String(raw?.name ?? ''),
  pastor_credential_locked: raw?.pastor_credential_locked === true,
});

/**
 * GET church-networks: every network at once (the API has no paging or
 * search), so the list screen searches and pages locally.
 */
export async function listChurchNetworks(): Promise<ChurchNetworkItem[]> {
  const response = await api.get('church-networks');
  const data = (response.data as any)?.data;
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return list.map(toItem).filter(item => Number.isFinite(item.id));
}

export async function getChurchNetworkById(id: number): Promise<ChurchNetworkItem | null> {
  const response = await api.get<GetChurchNetworkResponse>(`church-networks/${id}`);
  const data = (response.data as any)?.data;
  return data ? toItem(data) : null;
}

/** POST church-networks. Fails with 400 "Church network name already exists". */
export async function createChurchNetwork(payload: ChurchNetworkPayload) {
  const response = await api.post('church-networks', payload);
  return response.data;
}

export async function updateChurchNetwork(id: number, payload: ChurchNetworkPayload) {
  const response = await api.patch(`church-networks/${id}`, payload);
  return response.data;
}

/**
 * DELETE church-networks/:id. Refused while churches belong to the network
 * (500, `errors.detail`: "cannot delete church network: N churches are
 * associated with this network").
 */
export async function deleteChurchNetwork(id: number) {
  const response = await api.delete(`church-networks/${id}`);
  return response.data;
}
