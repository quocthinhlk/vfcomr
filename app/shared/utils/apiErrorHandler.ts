import axios, {AxiosError} from 'axios';
import type {TranslationKey} from '../translations/types';

export type ApiErrorMessageKey =
  | 'apiErrorNetwork'
  | 'apiErrorTimeout'
  | 'apiErrorUnauthorized'
  | 'apiErrorForbidden'
  | 'apiErrorNotFound'
  | 'apiErrorValidation'
  | 'apiErrorTooManyRequests'
  | 'apiErrorServer'
  | 'apiErrorUnexpected';

/** English fallbacks used when `t()` is unavailable (e.g. axios interceptor). */
export const API_ERROR_FALLBACKS: Record<ApiErrorMessageKey, string> = {
  apiErrorNetwork:
    'Unable to connect to the server. Please check your Internet connection and try again.',
  apiErrorTimeout: 'The request is taking longer than usual. Please try again.',
  apiErrorUnauthorized: 'Your session has expired. Please sign in again.',
  apiErrorForbidden: 'You do not have permission to perform this action.',
  apiErrorNotFound: 'The requested data or resource was not found.',
  apiErrorValidation: 'Please check the information you entered and try again.',
  apiErrorTooManyRequests:
    'You have made too many requests. Please try again later.',
  apiErrorServer: 'The system is experiencing issues. Please try again later.',
  apiErrorUnexpected: 'An unexpected error occurred. Please try again.',
};

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'too_many_requests'
  | 'server'
  | 'client'
  | 'unexpected';

export interface ParsedApiError {
  kind: ApiErrorKind;
  status?: number;
  messageKey: ApiErrorMessageKey;
  /** Safe English message for Error.message / legacy Alert.alert(e.message). */
  safeMessage: string;
  /** Sanitized field errors for 422 / validation responses. */
  validationErrors: Record<string, string> | null;
  /** True when the user should be signed out (global 401). */
  shouldLogout: boolean;
  isNetworkError: boolean;
  isTimeout: boolean;
}

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;
const JSON_LIKE_RE = /^\s*[\{\[][\s\S]*[\}\]]\s*$/;
const STACK_HINT_RE =
  /(stack trace|exception:|at\s+\S+\s*\(|\.java:|\.go:\d+|traceback \(most recent)/i;
const AUTH_PATH_RE =
  /(^|\/)(login|logout|auth\/forgot-password|forgot-password|auth\/reset-password|reset-password)(\/|$|\?)/i;

const FORCE_STATUS_MESSAGE = new Set([401, 403, 404, 429, 500, 502, 503, 504]);

function shouldPreferMappedMessage(parsed: ParsedApiError): boolean {
  return (
    parsed.isNetworkError ||
    parsed.isTimeout ||
    (parsed.status != null && FORCE_STATUS_MESSAGE.has(parsed.status))
  );
}

function looksLikeHtml(value: string): boolean {
  return HTML_TAG_RE.test(value) || /<!DOCTYPE/i.test(value);
}

function looksLikeJsonBlob(value: string): boolean {
  if (!JSON_LIKE_RE.test(value)) {
    return false;
  }
  try {
    JSON.parse(value);
    return true;
  } catch {
    return value.length > 120 && (value.includes('":') || value.includes("':"));
  }
}

/**
 * Returns true when a string must never be shown to end users.
 */
export function isUnsafeErrorContent(value: unknown): boolean {
  if (typeof value !== 'string') {
    return true;
  }

  const text = value.trim();
  if (!text) {
    return true;
  }

  if (looksLikeHtml(text) || looksLikeJsonBlob(text) || STACK_HINT_RE.test(text)) {
    return true;
  }

  // Extremely long payloads are almost always HTML/proxy dumps or logs.
  if (text.length > 280) {
    return true;
  }

  return false;
}

function sanitizePlainMessage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  if (!text || isUnsafeErrorContent(text)) {
    return null;
  }
  return text;
}

function sanitizeValidationErrors(
  errors: unknown,
): Record<string, string> | null {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return null;
  }

  const result: Record<string, string> = {};

  Object.entries(errors as Record<string, unknown>).forEach(([key, value]) => {
    if (key === 'showEditEmailButton') {
      // Preserve boolean-like flags used by Relating support UI.
      if (value === true || value === 'true' || value === 1 || value === '1') {
        result[key] = 'true';
      }
      return;
    }

    if (typeof value === 'string') {
      const safe = sanitizePlainMessage(value);
      if (safe) {
        result[key] = safe;
      }
      return;
    }

    if (Array.isArray(value)) {
      const parts = value
        .map(item => sanitizePlainMessage(item))
        .filter((item): item is string => !!item);
      if (parts.length) {
        result[key] = parts.join(' ');
      }
    }
  });

  return Object.keys(result).length ? result : null;
}

function extractRawMessage(data: unknown): unknown {
  if (data == null) {
    return undefined;
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }

  const obj = data as Record<string, unknown>;
  if (typeof obj.message === 'string') {
    return obj.message;
  }
  if (typeof obj.error === 'string') {
    return obj.error;
  }
  if (typeof obj.detail === 'string') {
    return obj.detail;
  }
  return undefined;
}

function messageKeyForStatus(status?: number): ApiErrorMessageKey {
  if (!status) {
    return 'apiErrorUnexpected';
  }
  if (status === 401) {
    return 'apiErrorUnauthorized';
  }
  if (status === 403) {
    return 'apiErrorForbidden';
  }
  if (status === 404) {
    return 'apiErrorNotFound';
  }
  if (status === 422 || status === 400) {
    return 'apiErrorValidation';
  }
  if (status === 429) {
    return 'apiErrorTooManyRequests';
  }
  if (status >= 500) {
    return 'apiErrorServer';
  }
  return 'apiErrorUnexpected';
}

function kindForStatus(status?: number): ApiErrorKind {
  if (!status) {
    return 'unexpected';
  }
  if (status === 401) {
    return 'unauthorized';
  }
  if (status === 403) {
    return 'forbidden';
  }
  if (status === 404) {
    return 'not_found';
  }
  if (status === 422 || status === 400) {
    return 'validation';
  }
  if (status === 429) {
    return 'too_many_requests';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'client';
}

export function isAuthRequestUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  return AUTH_PATH_RE.test(url);
}

/**
 * Parse any thrown value into a safe, user-facing API error description.
 */
export function parseApiError(error: unknown): ParsedApiError {
  if (axios.isAxiosError(error)) {
    return parseAxiosError(error);
  }

  if (error && typeof error === 'object') {
    const anyErr = error as Record<string, unknown>;
    const status =
      typeof anyErr.status === 'number'
        ? anyErr.status
        : typeof (anyErr.response as any)?.status === 'number'
          ? (anyErr.response as any).status
          : undefined;

    const code = typeof anyErr.code === 'string' ? anyErr.code : undefined;
    if (
      code === 'ECONNABORTED' ||
      code === 'ETIMEDOUT' ||
      anyErr.message === 'REQUEST_TIMEOUT'
    ) {
      return {
        kind: 'timeout',
        status,
        messageKey: 'apiErrorTimeout',
        safeMessage: API_ERROR_FALLBACKS.apiErrorTimeout,
        validationErrors: null,
        shouldLogout: false,
        isNetworkError: false,
        isTimeout: true,
      };
    }

    if (status) {
      const messageKey = messageKeyForStatus(status);
      return {
        kind: kindForStatus(status),
        status,
        messageKey,
        safeMessage: API_ERROR_FALLBACKS[messageKey],
        validationErrors: sanitizeValidationErrors(
          (anyErr.response as any)?.data?.errors,
        ),
        shouldLogout: status === 401 && !isAuthRequestUrl(String(anyErr.config && (anyErr.config as any).url)),
        isNetworkError: false,
        isTimeout: false,
      };
    }

    const safeFromMessage = sanitizePlainMessage(anyErr.message);
    if (safeFromMessage && (anyErr as any).isApiError) {
      const key =
        (typeof anyErr.messageKey === 'string' &&
          (anyErr.messageKey as ApiErrorMessageKey)) ||
        'apiErrorUnexpected';
      return {
        kind: 'unexpected',
        messageKey: key in API_ERROR_FALLBACKS ? key : 'apiErrorUnexpected',
        safeMessage: safeFromMessage,
        validationErrors: sanitizeValidationErrors(anyErr.validationErrors),
        shouldLogout: false,
        isNetworkError: false,
        isTimeout: false,
      };
    }
  }

  return {
    kind: 'unexpected',
    messageKey: 'apiErrorUnexpected',
    safeMessage: API_ERROR_FALLBACKS.apiErrorUnexpected,
    validationErrors: null,
    shouldLogout: false,
    isNetworkError: false,
    isTimeout: false,
  };
}

function parseAxiosError(error: AxiosError): ParsedApiError {
  const status = error.response?.status;
  const code = error.code;
  const url = error.config?.url;

  const isTimeout =
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    /timeout/i.test(error.message || '');

  const isNetworkError =
    !error.response &&
    (code === 'ERR_NETWORK' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'ECONNRESET' ||
      code === 'ERR_INTERNET_DISCONNECTED' ||
      error.message === 'Network Error');

  if (isTimeout) {
    return {
      kind: 'timeout',
      status,
      messageKey: 'apiErrorTimeout',
      safeMessage: API_ERROR_FALLBACKS.apiErrorTimeout,
      validationErrors: null,
      shouldLogout: false,
      isNetworkError: false,
      isTimeout: true,
    };
  }

  if (isNetworkError) {
    return {
      kind: 'network',
      status,
      messageKey: 'apiErrorNetwork',
      safeMessage: API_ERROR_FALLBACKS.apiErrorNetwork,
      validationErrors: null,
      shouldLogout: false,
      isNetworkError: true,
      isTimeout: false,
    };
  }

  const data = error.response?.data;
  const validationErrors = sanitizeValidationErrors(
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as any).errors
      : null,
  );

  const messageKey = messageKeyForStatus(status);
  const kind = kindForStatus(status);
  const shouldLogout = status === 401 && !isAuthRequestUrl(url);

  // Always use mapped copy for known HTTP failure classes.
  if (status && FORCE_STATUS_MESSAGE.has(status)) {
    return {
      kind,
      status,
      messageKey,
      safeMessage: API_ERROR_FALLBACKS[messageKey],
      validationErrors: status === 422 ? validationErrors : null,
      shouldLogout,
      isNetworkError: false,
      isTimeout: false,
    };
  }

  // 400 / 422 / other client errors: prefer safe API text when available.
  const rawMessage = extractRawMessage(data);
  const safeApiMessage = sanitizePlainMessage(rawMessage);

  if (status === 422 || status === 400) {
    return {
      kind: 'validation',
      status,
      messageKey: 'apiErrorValidation',
      safeMessage: safeApiMessage || API_ERROR_FALLBACKS.apiErrorValidation,
      validationErrors,
      shouldLogout: false,
      isNetworkError: false,
      isTimeout: false,
    };
  }

  if (safeApiMessage) {
    return {
      kind: kind || 'unexpected',
      status,
      messageKey: messageKey || 'apiErrorUnexpected',
      safeMessage: safeApiMessage,
      validationErrors,
      shouldLogout,
      isNetworkError: false,
      isTimeout: false,
    };
  }

  return {
    kind: kind || 'unexpected',
    status,
    messageKey: messageKey || 'apiErrorUnexpected',
    safeMessage: API_ERROR_FALLBACKS[messageKey || 'apiErrorUnexpected'],
    validationErrors,
    shouldLogout,
    isNetworkError: false,
    isTimeout: false,
  };
}

type TranslateFn = (key: TranslationKey) => string;

/**
 * Resolve a user-safe error string for Alerts / inline error text.
 * Never returns HTML, raw JSON, or stack traces.
 */
export function getApiErrorMessage(
  error: unknown,
  t?: TranslateFn,
  fallbackKey: ApiErrorMessageKey = 'apiErrorUnexpected',
): string {
  const parsed = parseApiError(error);

  // Network / timeout / known HTTP classes always use localized mapped copy.
  if (shouldPreferMappedMessage(parsed)) {
    if (t) {
      return t(parsed.messageKey as TranslationKey) || parsed.safeMessage;
    }
    return parsed.safeMessage;
  }

  // Validation / other: keep a safe API message when available; otherwise translate.
  if (
    t &&
    (!parsed.safeMessage ||
      parsed.safeMessage === API_ERROR_FALLBACKS[parsed.messageKey])
  ) {
    return (
      t(parsed.messageKey as TranslationKey) ||
      t(fallbackKey as TranslationKey) ||
      parsed.safeMessage
    );
  }

  return (
    parsed.safeMessage ||
    (t ? t(fallbackKey as TranslationKey) : API_ERROR_FALLBACKS[fallbackKey])
  );
}

/**
 * Safe per-field validation errors (422). Returns null when none are usable.
 */
export function getApiValidationErrors(
  error: unknown,
): Record<string, string> | null {
  return parseApiError(error).validationErrors;
}

/**
 * Build a sanitized response.data object so legacy
 * `error.response.data.message` reads never expose HTML/raw dumps.
 */
export function buildSafeResponseData(
  originalData: unknown,
  parsed: ParsedApiError,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    originalData &&
    typeof originalData === 'object' &&
    !Array.isArray(originalData)
      ? {...(originalData as Record<string, unknown>)}
      : {};

  // Drop any prior unsafe message / HTML body fields.
  delete base.html;
  delete base.body;
  delete base.stack;
  delete base.trace;

  base.message = parsed.safeMessage;
  base.messageKey = parsed.messageKey;

  if (parsed.validationErrors) {
    base.errors = {
      ...(typeof base.errors === 'object' &&
      base.errors &&
      !Array.isArray(base.errors)
        ? (base.errors as Record<string, unknown>)
        : {}),
      ...parsed.validationErrors,
    };
  } else if (base.errors != null) {
    const sanitized = sanitizeValidationErrors(base.errors);
    if (sanitized) {
      base.errors = sanitized;
    } else {
      delete base.errors;
    }
  }

  return base;
}

/**
 * Log full technical details for developers without exposing them to UI.
 */
export function logApiError(error: unknown, context?: string): void {
  const prefix = context ? `[API Error:${context}]` : '[API Error]';

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method;
    const data = error.response?.data;
    const dataPreview =
      typeof data === 'string'
        ? data.slice(0, 500)
        : data && typeof data === 'object'
          ? data
          : data;

    console.error(prefix, {
      method,
      url,
      status,
      code: error.code,
      message: error.message,
      data: dataPreview,
    });
    return;
  }

  console.error(prefix, error);
}
