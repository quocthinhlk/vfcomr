import {useCallback} from 'react';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COUNTRY_NAME_MAX} from '../services/country.service';
import type {CountryNameError} from './country.utils';

/** Text shown under the name field for a validation error. */
export function useCountryNameMessage() {
  const {t} = useTranslation();
  return useCallback(
    (error: CountryNameError) =>
      error === 'required'
        ? t('fieldIsRequired').replace('{field}', t('name'))
        : error === 'tooLong'
          ? t('countryNameTooLong').replace('{max}', String(COUNTRY_NAME_MAX))
          : t('countryNameExists'),
    [t],
  );
}
