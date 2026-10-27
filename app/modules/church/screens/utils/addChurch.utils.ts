import api from '../../../../config/api';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AddChurchFormValues {
  name: string;
  short_name: string;
  is_msc: string;
  is_first_msc: string;
  enable_cpm: string;
  parent_id: string;
  msc_parent_id: string;
  language_id: string;
  church_type_id: string;
  pastor_id: string;
  church_network_id: string;
  church_region_id: string;
  geographical_region_id: string;
  language_region_id: string;
  sensitive_nation: string;
  country_id: string;
  currency_id: string;
  city_id: string;
  new_city_name: string;
  photo_dir: string;
  service_address_street: string;
  service_address_postal_code: string;
  mailing_address_postal_code: string;
  office_address_street: string;
  office_address_postal_code: string;
  office_phone: string;
  office_fax: string;
  email_address: string;
  website: string;
  facebook: string;
  instagram: string;
  twitter: string; // X
  date_of_birth: Date | null;
}

type Option = {label: string; value: string};

const listOf = (res: any): any[] => (Array.isArray(res?.data?.data) ? res.data.data : []);
const itemsOf = (res: any): any[] =>
  Array.isArray(res?.data?.data?.items) ? res.data.data.items : [];
const toOption = (i: any): Option => ({label: i.name, value: String(i.id)});

/** Geographical regions tree → flat list, children prefixed with "-" per level. */
function flattenGeo(nodes: any[], depth = 0): Option[] {
  const result: Option[] = [];
  for (const n of nodes) {
    result.push({label: `${'-'.repeat(depth)}${n.name}`, value: String(n.id)});
    if (Array.isArray(n.children) && n.children.length) {
      result.push(...flattenGeo(n.children, Math.min(depth + 1, 5)));
    }
  }
  return result;
}

const MAX_OPTION_PAGES = 200;

/**
 * Every page of a paged list as options (deduplicated by id). Page 1 tells how
 * many pages there are; the rest are then fetched in parallel instead of one
 * after another (languages answer in ~2 s per page).
 */
async function fetchAllPagedOptions(endpoint: string, params: Record<string, any>): Promise<Option[]> {
  const pageItems = (res: any) => itemsOf(res);
  const first = await api.get(endpoint, {params: {...params, page: 1}});
  const pages: any[][] = [pageItems(first)];
  const firstData = first?.data?.data;
  const totalPages = Number(firstData?.total_pages);
  if (Number.isFinite(totalPages) && totalPages > 1) {
    const rest = await Promise.all(
      Array.from({length: Math.min(totalPages, MAX_OPTION_PAGES) - 1}, (_, index) =>
        api.get(endpoint, {params: {...params, page: index + 2}}),
      ),
    );
    pages.push(...rest.map(pageItems));
  } else if (firstData?.has_next) {
    // No page count in the response: follow has_next.
    let page = 2;
    let hasNext = true;
    while (hasNext && page <= MAX_OPTION_PAGES) {
      const res = await api.get(endpoint, {params: {...params, page}});
      pages.push(pageItems(res));
      hasNext = Boolean(res?.data?.data?.has_next);
      page += 1;
    }
  }
  const seen = new Set<string>();
  const out: Option[] = [];
  for (const item of pages.flat()) {
    const option = toOption(item);
    if (!option.value || seen.has(option.value)) {
      continue;
    }
    seen.add(option.value);
    out.push(option);
  }
  return out;
}

export function useFormOptions() {
  const [loading, setLoading] = useState(true);
  // Options are required by the form (type, pastor, region, country, currency),
  // so a failed load (e.g. offline) is surfaced for screens to show a retryable error.
  const [error, setError] = useState<unknown>(null);
  const loadTokenRef = useRef(0);
  const [options, setOptions] = useState({
    motherChurchOptions: [] as { label: string; value: string }[],
    churchTypeOptions: [] as { label: string; value: string }[],
    churchNetworkOptions: [] as { label: string; value: string }[],
    pastorOptions: [] as { label: string; value: string }[],
    languageOptions: [] as { label: string; value: string }[],
    churchRegionOptions: [] as { label: string; value: string }[],
    geographicalRegionOptions: [] as { label: string; value: string }[],
    languageRegionOptions: [] as { label: string; value: string }[],
    countryOptions: [] as { label: string; value: string }[],
    localCurrencyOptions: [] as { label: string; value: string }[],
    /** True when there are more pastors than the first page in pastorOptions. */
    pastorHasNext: false,
  });

  const fetchOptions = useCallback(async () => {
    const token = ++loadTokenRef.current;
    const current = () => token === loadTokenRef.current;
    setLoading(true);
    setError(null);

    // Phase 1: the small lookups behind the required fields (type, pastor,
    // regions, country, currency), in parallel. They used to wait behind ~20
    // sequential page requests for languages and churches, so these required
    // dropdowns stayed empty for ~20 s on the add/edit/clone forms.
    try {
      const [types, pastors, networks, cRegions, geo, langRegions, countries, currencies] =
        await Promise.all([
          api.get('church-types', {params: {sort_by: 'name', sort_desc: false}}),
          api.get('users/pastors', {params: {page: 1, limit: 10, sort_by: 'name', sort_desc: false}}),
          api.get('church-networks', {params: {sort_by: 'name', sort_desc: false}}),
          api.get('church-regions', {params: {sort_by: 'name', sort_desc: false}}),
          api.get('geographical-regions', {params: {sort_by: 'name', sort_desc: false}}),
          api.get('language-regions', {params: {sort_by: 'name', sort_desc: false}}),
          // countries: all at once (limit=1000); search handled on demand in the screen
          api.get('countries', {params: {page: 1, limit: 1000, sort_by: 'name', sort_desc: false}}),
          api.get('currencies', {params: {sort_by: 'name', sort_desc: false}}),
        ]);
      if (!current()) {
        return;
      }
      const geoRootItems = (geo.data?.data?.items ?? []) as any[];
      setOptions(prev => ({
        ...prev,
        churchTypeOptions: listOf(types).map(toOption),
        pastorOptions: itemsOf(pastors).map(toOption),
        pastorHasNext: Boolean(pastors?.data?.data?.has_next),
        churchNetworkOptions: listOf(networks).map(toOption),
        churchRegionOptions: listOf(cRegions).map(toOption),
        geographicalRegionOptions: geoRootItems.length ? flattenGeo(geoRootItems) : [],
        languageRegionOptions: listOf(langRegions).map(toOption),
        countryOptions: itemsOf(countries).map(toOption),
        localCurrencyOptions: itemsOf(currencies).map((i: any) => ({
          label: `${i.name} (${i.three_letter_code})`,
          value: String(i.id),
        })),
      }));
    } catch (e) {
      if (current()) {
        setError(e);
        setLoading(false);
      }
      return;
    }

    // Phase 2: the full language and church lists (several pages each), so
    // those dropdowns can be scrolled without searching. Both are also searched
    // on the server, so a failure here must not replace a form the user may
    // already be filling in with the error state.
    try {
      const [languageOptions, motherChurchOptions] = await Promise.all([
        fetchAllPagedOptions('languages', {limit: 200, sort_by: 'name', sort_desc: false}),
        fetchAllPagedOptions('churches', {limit: 200, sort_by: 'name', sort_desc: false}),
      ]);
      if (current()) {
        setOptions(prev => ({...prev, languageOptions, motherChurchOptions}));
      }
    } catch (e) {
      console.warn('Could not load the full language / church lists:', e);
    } finally {
      if (current()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOptions();
    return () => {
      // Ignore the in-flight load after unmount.
      loadTokenRef.current += 1;
    };
  }, [fetchOptions]);

  return { loading, error, reload: fetchOptions, ...options };
}
