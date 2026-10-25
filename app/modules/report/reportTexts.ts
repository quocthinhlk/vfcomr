import {useCallback} from 'react';
import {useTranslation} from '../../shared/hooks/useTranslation';
import {REPORT_TEXTS} from './reportTexts.data';

type Params = Record<string, string | number | null | undefined>;

function lookup(language: string, path: string): unknown {
  const root = (REPORT_TEXTS as Record<string, unknown>)[language];
  return path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object') {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, root);
}

/** True when the web has a text for this path (in English at least). */
export function hasReportText(path: string): boolean {
  return typeof lookup('en', path) === 'string';
}

/**
 * Web wording for `path` (e.g. "generateReport.labelChurch") in `language`,
 * falling back to English, with `{name}` placeholders filled from `params`.
 */
export function reportText(language: string, path: string, params?: Params): string {
  let value = lookup(language, path);
  if (typeof value !== 'string') {
    value = lookup('en', path);
  }
  if (typeof value !== 'string') {
    return path;
  }
  if (!params) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (match, key: string) => {
    const param = params[key];
    return param == null ? match : String(param);
  });
}

/** "12_months_average" → "12 Months Average" (same as the web's fallback). */
export function humanizeReportType(type: string): string {
  return type
    .split('_')
    .map(part => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

/** Name of a catalog report type: the web's text when it has one, else humanized. */
export function reportTypeName(language: string, type: string): string {
  const path = `generateReport.types.${type}`;
  return hasReportText(path) ? reportText(language, path) : humanizeReportType(type);
}

/** `rt(path, params)` bound to the app language. */
export function useReportText() {
  const {selectedLanguage} = useTranslation();
  const language = selectedLanguage || 'en';
  const rt = useCallback(
    (path: string, params?: Params) => reportText(language, path, params),
    [language],
  );
  return {rt, language};
}
