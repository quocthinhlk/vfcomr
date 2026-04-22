// Translation files for multi-language support
import en from './locales/en';
import pt from './locales/pt';
import es from './locales/es';
import fr from './locales/fr';
import zh from './locales/zh';
import ms from './locales/ms';
import ja from './locales/ja';
import type {TranslationMap} from './types';

export const translations: TranslationMap = {
  en,
  pt,
  es,
  fr,
  zh,
  ms,
  ja,
};

export type {TranslationKey, TranslationDictionary, LanguageCode, TranslationMap} from './types';
