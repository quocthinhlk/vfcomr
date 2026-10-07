import * as Yup from 'yup';
import api from '../../../../config/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMscOptions, enableHouseCp, enableCpmOptions } from '../../config/church.constants';

export const ADD_NEW_CITY_VALUE = '__add_new_city__';

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

export const AddChurchSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  short_name: Yup.string(),
  is_msc: Yup.string(),
  is_first_msc: Yup.string().when('is_msc', {
    is: (v: any) => v === 'Yes',
    then: schema => schema.required('Required'),
    otherwise: schema => schema.notRequired(),
  }),
  enable_cpm: Yup.string().required('Required'),
  msc_parent_id: Yup.string().when(['is_msc', 'is_first_msc'], {
    is: (isMsc: any, isFirst: any) => isMsc === 'Yes' && isFirst === 'No',
    then: schema => schema.required('Required'),
    otherwise: schema => schema.notRequired(),
  }),
  language_id: Yup.string(),
  church_type_id: Yup.string().required('Required'),
  pastor_id: Yup.string().required('Required'),
  geographical_region_id: Yup.string().required('Required'),
  country_id: Yup.string().required('Required'),
  currency_id: Yup.string().required('Required'),
  email_address: Yup.string().email('Invalid email').required('Required'),
  date_of_birth: Yup.date().nullable().required('Required'),
});

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
    isMscOptions,
    enableHouseCp,
    enableCpmOptions,
  });

  const fetchOptions = useCallback(async () => {
    const token = ++loadTokenRef.current;
    const current = () => token === loadTokenRef.current;
    try {
      setLoading(true);
      setError(null);
      const fetchAllPagedOptions = async (
        endpoint: string,
        params: Record<string, any>,
        mapItem: (i: any) => {label: string; value: string},
      ) => {
        const seen = new Set<string>();
        const out: {label: string; value: string}[] = [];
        let page = 1;
        let hasNext = true;
        let safety = 0;

        while (hasNext && safety < 200) {
          safety += 1;
          const res = await api.get(endpoint, {params: {...params, page}});
          const data = res?.data?.data;
          const items = (data?.items ?? []) as any[];
          for (const i of items) {
            const opt = mapItem(i);
            if (!opt?.value) continue;
            if (seen.has(opt.value)) continue;
            seen.add(opt.value);
            out.push(opt);
          }
          hasNext = Boolean(data?.has_next);
          page += 1;
        }

        return out;
      };

      // languages: load all pages so dropdown shows full list without searching
      const languageOptions = await fetchAllPagedOptions(
        'languages',
        {limit: 200, sort_by: 'name', sort_desc: false},
        i => ({label: i.name, value: String(i.id)}),
      );

      // mother churches: load all pages so dropdown shows full list without searching
      const motherChurchOptions = await fetchAllPagedOptions(
        'churches',
        {limit: 200, sort_by: 'name', sort_desc: false},
        i => ({label: i.name, value: String(i.id)}),
      );

      // church types
      const types = await api.get('church-types', { params: { sort_by: 'name', sort_desc: false } });
      const churchTypeOptions = ((types.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

      // pastors
      const pastors = await api.get('users/pastors', { params: { page: 1, limit: 10, sort_by: 'name', sort_desc: false } });
      const pastorOptions = ((pastors.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

      // church networks
      const networks = await api.get('church-networks', { params: { sort_by: 'name', sort_desc: false } });
      const churchNetworkOptions = ((networks.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

      // church regions
      const cRegions = await api.get('church-regions', { params: { sort_by: 'name', sort_desc: false } });
      const churchRegionOptions = ((cRegions.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

      // geographical regions (tree -> flattened with hyphens)
      const geo = await api.get('geographical-regions', { params: { sort_by: 'name', sort_desc: false } });
      function flattenGeo(nodes: any[], depth = 0): { label: string; value: string }[] {
        const result: { label: string; value: string }[] = [];
        for (const n of nodes) {
          const label = `${'-'.repeat(depth)}${n.name}`;
          result.push({ label, value: String(n.id) });
          if (Array.isArray(n.children) && n.children.length) {
            result.push(...flattenGeo(n.children, Math.min(depth + 1, 5)));
          }
        }
        return result;
      }
      const geoRootItems = ((geo.data?.data?.items ?? []) as any[]);
      const geographicalRegionOptions = geoRootItems.length ? flattenGeo(geoRootItems) : [];

      // language regions
      const langRegions = await api.get('language-regions', { params: { sort_by: 'name', sort_desc: false } });
      const languageRegionOptions = ((langRegions.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

      // countries: fetch all once (limit=1000); search handled on demand in screen
      const countries = await api.get('countries', { params: { page: 1, limit: 1000, sort_by: 'name', sort_desc: false } });
      const countryOptions = ((countries.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

      // currencies
      const currencies = await api.get('currencies', { params: { sort_by: 'name', sort_desc: false } });
      const localCurrencyOptions = ((currencies.data?.data?.items ?? []) as any[]).map((i: any) => ({ label: `${i.name} (${i.three_letter_code})`, value: String(i.id) }));

      if (!current()) return;
      setOptions({
        motherChurchOptions,
        churchTypeOptions,
        churchNetworkOptions,
        pastorOptions,
        languageOptions,
        churchRegionOptions,
        geographicalRegionOptions,
        languageRegionOptions,
        countryOptions,
        localCurrencyOptions,
        isMscOptions,
        enableHouseCp,
        enableCpmOptions,
      });
    } catch (e) {
      if (current()) {
        setError(e);
      }
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

export function formatNumber(numStr: any): string {
  if (numStr === undefined || numStr === null) return '';
  const cleanStr = String(numStr).replace(/\D/g, '');
  if (!cleanStr) return '';
  return parseInt(cleanStr, 10).toLocaleString('en-US');
}

export function parseNumber(formattedStr: any): string {
  if (formattedStr === undefined || formattedStr === null) return '';
  return String(formattedStr).replace(/[^\d]/g, '');
}