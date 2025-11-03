import * as Yup from 'yup';
import api from '../../../../config/api';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMscOptions, enableHouseCp, enableCpmOptions } from '../../config/church.constants';

export interface AddChurchFormValues {
  name: string;
  short_name: string;
  is_msc: string;
  enable_cpm: string;
  parent_id: string;
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
  is_msc: Yup.string().required('Required'),
  enable_cpm: Yup.string().required('Required'),
  language_id: Yup.string().required('Required'),
  church_type_id: Yup.string().required('Required'),
  pastor_id: Yup.string().required('Required'),
  church_network_id: Yup.string().required('Required'),
  church_region_id: Yup.string().required('Required'),
  geographical_region_id: Yup.string().required('Required'),
  language_region_id: Yup.string().required('Required'),
  country_id: Yup.string().required('Required'),
  currency_id: Yup.string().required('Required'),
  email_address: Yup.string().email('Invalid email').required('Required'),
  date_of_birth: Yup.date().nullable().required('Required'),
});

export function useFormOptions() {
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    async function fetchOptions() {
      try {
        setLoading(true);
        // languages (lazy: first page only)
        const languages = await api.get('languages', { params: { page: 1, limit: 10 } });
        const languageOptions = ((languages.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // mother churches (lazy: first page only)
        const mothers = await api.get('churches', { params: { page: 1, limit: 10, sort_by: 'id', sort_desc: true } });
        const motherChurchOptions = ((mothers.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // church types
        const types = await api.get('church-types');
        const churchTypeOptions = ((types.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // pastors
        const pastors = await api.get('users/pastors', { params: { page: 1, limit: 10 } });
        const pastorOptions = ((pastors.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // church networks
        const networks = await api.get('church-networks');
        const churchNetworkOptions = ((networks.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // church regions
        const cRegions = await api.get('church-regions');
        const churchRegionOptions = ((cRegions.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // geographical regions (tree -> flattened with hyphens)
        const geo = await api.get('geographical-regions');
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
        const langRegions = await api.get('language-regions');
        const languageRegionOptions = ((langRegions.data?.data ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // countries: fetch all once (limit=1000); search handled on demand in screen
        const countries = await api.get('countries', { params: { page: 1, limit: 1000 } });
        const countryOptions = ((countries.data?.data?.items ?? []) as any[]).map(i => ({ label: i.name, value: String(i.id) }));

        // currencies
        const currencies = await api.get('currencies');
        const localCurrencyOptions = ((currencies.data?.data?.items ?? []) as any[]).map((i: any) => ({ label: `${i.name} (${i.three_letter_code})`, value: String(i.id) }));

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
      } catch (error) {
        console.error('Error fetching form options:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOptions();
  }, []);

  return { loading, ...options };
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