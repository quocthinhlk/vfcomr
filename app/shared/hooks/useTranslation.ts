import { useCallback, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations, TranslationKey, LanguageCode } from '../translations';

export const useTranslation = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  const { selectedLanguage } = context;

  // Stable between renders (changes only with the language): screens put `t`
  // in hook deps, and a new function every render re-runs those effects forever.
  const t = useCallback(
    (key: TranslationKey): string => {
      const language = selectedLanguage as LanguageCode;
      return translations[language]?.[key] || translations.en[key] || key;
    },
    [selectedLanguage],
  );

  return { t, selectedLanguage };
};
