import {useCallback} from 'react';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {LANGUAGE_NAME_MAX} from '../services/language.service';
import type {LanguageNameError} from './language.utils';

/** Text shown under the name field for a validation error. */
export function useLanguageNameMessage() {
  const {t} = useTranslation();
  return useCallback(
    (error: LanguageNameError) =>
      error === 'required'
        ? t('fieldIsRequired').replace('{field}', t('name'))
        : error === 'tooLong'
          ? t('countryNameTooLong').replace('{max}', String(LANGUAGE_NAME_MAX))
          : t('languageNameExists'),
    [t],
  );
}
