import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations, TranslationKey, LanguageCode } from '../translations';

export const useTranslation = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  const { selectedLanguage } = context;

  const t = (key: TranslationKey): string => {
    const language = selectedLanguage as LanguageCode;
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return { t, selectedLanguage };
};
