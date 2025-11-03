import * as Yup from 'yup';
import api from '../../../../config/api';
import { useEffect, useState } from 'react';
import { sensitiveNationOptions } from '../../config/user.constants';

export interface AddUserFormValues {
  username: string;
  password?: string; // Optional for updates
  prefix: string;
  first_name: string;
  last_name: string;
  title: string;
  role_id: string | number | null;
  user_photo: string;
  street_address: string;
  country_id: string | number | null;
  postal_code: string;
  church_id: string | number | null;
  sensitive_nation: boolean | string;
  language_id: string | number | null;
  home_phone: string;
  mobile_phone: string;
  email_address: string;
  credentials: string;
  credentials_number: string;
  credentials_form: string;
  credentials_expiry_date: Date | null;
  date_of_birth: Date | null;
  marital_status: string;
  name_of_spouse?: string;
  children: { full_name: string }[];
}

export const AddUserSchema = Yup.object().shape({
  username: Yup.string().required('Required'),
  password: Yup.string().required('Required'),
  prefix: Yup.string().required('Required'),
  first_name: Yup.string().required('Required'),
  last_name: Yup.string().required('Required'),
  title: Yup.string().required('Required'),
  role_id: Yup.string().required('Required'),
  // user_photo: Yup.string().required('Required'),
  street_address: Yup.string().required('Required'),
  country_id: Yup.string().required('Required'),
  postal_code: Yup.string().required('Required'),
  // church_id: Yup.number().required('Required'),
  sensitive_nation: Yup.string().required('Required'),
  language_id: Yup.string().required('Required'),
  // home_phone: Yup.string().required('Required'),
  // mobile_phone: Yup.string().required('Required'),
  email_address: Yup.string().email('Invalid email').required('Required'),
  // credentials: Yup.string().required('Required'),
  // credentials_number: Yup.string().required('Required'),
  // credentials_form: Yup.string().required('Required'),
  credentials_expiry_date: Yup.date().nullable().required('Required'),
  date_of_birth: Yup.date().nullable().required('Required'),
  marital_status: Yup.string().required('Required'),
  // name_of_spouse: Yup.string().required('Required'),
  children: Yup.array().of(
    Yup.object().shape({
      full_name: Yup.string().required('Required'),
    })
  ).min(1, 'At least one child is required'), // Assuming children are for spouse
});

export function useFormOptions() {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({
    prefixOptions: [] as { label: string; value: string }[],
    omrStatusOptions: [] as { label: string; value: string }[],
    countryOptions: [] as { label: string; value: string }[],
    credentialOptions: [] as { label: string; value: string }[],
    languageOptions: [] as { label: string; value: string }[],
    maritalOptions: [] as { label: string; value: string }[],
    sensitiveNationOptions,
  });

  useEffect(() => {
    console.log('Fetching form options...');
    async function fetchOptions() {
      try {
        const response = await api.get('users/form-data');
        const data = response.data;

        setOptions({
          prefixOptions: (data.prefixes || []).map((item: string) => ({
            label: item,
            value: item,
          })),
          omrStatusOptions: (data.roles || []).map((item: any) => ({
            label: item.name,
            value: String(item.id),
          })),
          countryOptions: (data.countries || []).map((item: any) => ({
            label: item.name,
            value: String(item.id),
          })),
          credentialOptions: (data.credentials || []).map((item: string) => ({
            label: item,
            value: item,
          })),
          languageOptions: (data.languages || []).map((item: any) => ({
            label: item.name,
            value: String(item.id),
          })),
          maritalOptions: (data.marital_status || []).map((item: string) => ({
            label: item,
            value: item,
          })),
          sensitiveNationOptions,
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