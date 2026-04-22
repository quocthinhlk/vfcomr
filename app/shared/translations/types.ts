import en from './locales/en';

export type TranslationKey = keyof typeof en;
export type TranslationDictionary = Record<TranslationKey, string>;
export type LanguageCode = 'en' | 'pt' | 'es' | 'fr' | 'zh' | 'ms' | 'ja';
export type TranslationMap = Record<LanguageCode, TranslationDictionary>;
