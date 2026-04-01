import api from '../../../config/api';

export interface RelatingCountryItem {
  id: number;
  name: string;
}

export interface RelatingCityItem {
  id: number;
  name: string;
}

export interface RelatingChurchExistsResponseData {
  exists: boolean;
  form_required_message?: string;
  message?: string;
}

export interface SupportRequestPayload {
  name: string;
  subject: string;
  message: string;
}

export async function searchRelatingCountries(params?: {
  page?: number;
  limit?: number;
  name?: string;
}): Promise<RelatingCountryItem[]> {
  const response = await api.get('countries', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
      name: (params?.name ?? '').trim(),
    },
  });

  return (response?.data?.data?.items ?? []) as RelatingCountryItem[];
}

export async function listCitiesByCountry(
  countryId: number,
): Promise<RelatingCityItem[]> {
  const response = await api.get(`cities/country/${countryId}`);
  const payload = response?.data?.data;
  if (Array.isArray(payload)) {
    return payload as RelatingCityItem[];
  }
  if (Array.isArray(payload?.items)) {
    return payload.items as RelatingCityItem[];
  }
  return [];
}

export async function checkRelatingChurchExists(params: {
  country_id: number;
  city_id: number;
}): Promise<RelatingChurchExistsResponseData> {
  const response = await api.get('relating/church-exists', {params});
  return (response?.data?.data ?? {}) as RelatingChurchExistsResponseData;
}

export async function createRelatingSupportRequest(payload: SupportRequestPayload) {
  const response = await api.post('support', payload);
  return response?.data;
}
