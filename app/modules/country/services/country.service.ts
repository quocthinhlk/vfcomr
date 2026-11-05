import api, {DEFAULT_PAGE_LIMIT} from '../../../config/api';

// Auth and language headers come from the api interceptor. These calls used to
// read the token from AsyncStorage themselves, which overrode the
// interceptor's choice and threw "No authentication token found" when the
// session token lived elsewhere (e.g. the dev test token).

export const COUNTRY_NAME_MAX = 255;

export interface CountryItem {
  id: number;
  name: string;
}

export interface ListCountriesResponse {
  success: boolean;
  data: {
    items: CountryItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  message: string;
}

export interface ListCountriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** The API searches by name, ignoring case and accents ("cote" finds Côte d'Ivoire). */
export async function listCountries(params: ListCountriesParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const name = (params.search ?? '').trim();

  const response = await api.get<ListCountriesResponse>(`/countries`, {
    params: {page, limit, name},
  });
  return response.data;
}

export interface GetCountryResponse {
  success: boolean;
  data: CountryItem;
  message: string;
}

export async function getCountryById(id: number) {
  const response = await api.get<GetCountryResponse>(`/countries/${id}`);
  return response.data;
}

export interface CreateCountryPayload {
  name: string;
}

export async function createCountry(payload: CreateCountryPayload) {
  const response = await api.post(`/countries`, payload);
  return response.data;
}

export interface UpdateCountryPayload {
  name: string;
}

export async function updateCountry(id: number, payload: UpdateCountryPayload) {
  const response = await api.patch(`/countries/${id}`, payload);
  return response.data;
}

export async function deleteCountry(id: number) {
  const response = await api.delete(`/countries/${id}`);
  return response.data;
}

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Another country with this name (case-insensitive). Create is checked by the
 * API, but PATCH is not: renaming a country to "Vietnam" made a second Vietnam.
 */
export async function findCountryByName(
  name: string,
  excludeId?: number,
): Promise<CountryItem | null> {
  const res = await listCountries({page: 1, limit: 100, search: name});
  return (
    (res?.data?.items ?? []).find(c => c.id !== excludeId && sameName(c.name, name)) ?? null
  );
}

/**
 * Churches and cities still using the country. The API deletes a country in
 * use and leaves those records pointing at a missing country.
 */
export async function getCountryUsage(id: number): Promise<{churches: number; cities: number}> {
  const [churchesRes, citiesRes] = await Promise.all([
    api.get('churches', {params: {country_id: id, page: 1, limit: 1}}),
    api.get(`cities/country/${id}`),
  ]);
  const cities = citiesRes?.data?.data;
  return {
    churches: Number(churchesRes?.data?.data?.total) || 0,
    cities: Array.isArray(cities) ? cities.length : 0,
  };
}
