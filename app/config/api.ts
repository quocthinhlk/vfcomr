// app/config/api.ts
import axios, {AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_ERROR_FALLBACKS,
  ApiErrorMessageKey,
  buildSafeResponseData,
  logApiError,
  parseApiError,
  type ParsedApiError,
} from '../shared/utils/apiErrorHandler';
import {translations} from '../shared/translations';
import type {LanguageCode} from '../shared/translations/types';

export const DEFAULT_PAGE_LIMIT = 10;
const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';
const DEFAULT_LANGUAGE = 'en';

// Admin token
export const TOKEN_FOR_TEST = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDQwODI2NTYsInJvbGUiOiJBZG1pbiIsInJvbGVJRCI6MiwidXNlcklEIjo0ODI1fQ.11_t1FZFBdad3vcBG8_eq5c4LSSkHubeWxMjfx6OA9s";
// Overseer token
// export const TOKEN_FOR_TEST = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDQwODI3MTUsInJvbGUiOiJHaXZpbmcgT3ZlcnNpZ2h0Iiwicm9sZUlEIjo4LCJ1c2VySUQiOjI0Mn0.JSdjDkonHna9DZVwORfbsLIz70oHRsbehAVR5We3TYY";
// export const TOKEN_FOR_TEST = '';

const api = axios.create({
  baseURL: 'https://tintran.cloud-ip.cc/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

type UnauthorizedHandler = () => void | Promise<void>;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedInFlight = false;

/**
 * Register a callback (usually from Navigation/AuthContext) to clear session on 401.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

const FORCE_STATUS_MESSAGE = new Set([401, 403, 404, 429, 500, 502, 503, 504]);

async function resolveLocalizedApiMessage(
  parsed: ParsedApiError,
): Promise<string> {
  const preferMapped =
    parsed.isNetworkError ||
    parsed.isTimeout ||
    (parsed.status != null && FORCE_STATUS_MESSAGE.has(parsed.status));

  // Keep safe, short validation messages from the API when available.
  if (
    !preferMapped &&
    parsed.safeMessage !== API_ERROR_FALLBACKS[parsed.messageKey]
  ) {
    return parsed.safeMessage;
  }

  try {
    const language =
      ((await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY))?.trim() as LanguageCode) ||
      DEFAULT_LANGUAGE;
    const dict = translations[language] || translations.en;
    return (
      dict[parsed.messageKey as keyof typeof dict] ||
      translations.en[parsed.messageKey] ||
      API_ERROR_FALLBACKS[parsed.messageKey as ApiErrorMessageKey]
    );
  } catch {
    return API_ERROR_FALLBACKS[parsed.messageKey];
  }
}

api.interceptors.request.use(async config => {
  try {
    const switched = await AsyncStorage.getItem('switchedUser');
    const stored = (await AsyncStorage.getItem('token')) || '';
    // While impersonating, the stored session token must win over the dev admin token.
    const token =
      switched === '1' && stored ? stored : TOKEN_FOR_TEST || stored || '';
    const language =
      (await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY))?.trim() || DEFAULT_LANGUAGE;

    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Accept-Language', language);
    } else {
      config.headers = {
        ...(config.headers as Record<string, string> | undefined),
        'Accept-Language': language,
      } as any;
    }

    if (token) {
      if (config.headers && typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = {
          ...(config.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        } as any;
      }
    }
  } catch (e) {
    // ignore token retrieval errors
  }
  return config;
});

function normalizeAxiosError(
  error: AxiosError,
  safeMessage: string,
  extras: Record<string, unknown>,
): Error {
  const normalized = new Error(safeMessage);
  normalized.name = error.name || 'ApiError';
  Object.assign(normalized, {
    code: error.code,
    config: error.config,
    request: error.request,
    response: error.response,
    status: error.response?.status,
    isAxiosError: true,
    isApiError: true,
    ...extras,
  });
  return normalized;
}

async function triggerUnauthorizedLogout(): Promise<void> {
  if (unauthorizedInFlight) {
    return;
  }
  unauthorizedInFlight = true;
  try {
    if (!TOKEN_FOR_TEST) {
      await AsyncStorage.removeItem('token');
    }
    if (unauthorizedHandler) {
      await unauthorizedHandler();
    }
  } catch (e) {
    console.warn('[API] Unauthorized handler failed', e);
  } finally {
    // Allow a later 401 (e.g. after re-login) to trigger again.
    setTimeout(() => {
      unauthorizedInFlight = false;
    }, 1500);
  }
}

function coerceArrayBufferJson(data: unknown): unknown {
  try {
    let bytes: Uint8Array | null = null;
    if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    if (!bytes || bytes.length === 0) {
      return data;
    }
    const text = new TextDecoder().decode(bytes).trim();
    if (!text.startsWith('{') && !text.startsWith('[')) {
      return data;
    }
    return JSON.parse(text);
  } catch {
    return data;
  }
}

api.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      logApiError(error);
      return Promise.reject(error);
    }

    if (error.config?.responseType === 'arraybuffer' && error.response?.data) {
      error.response.data = coerceArrayBufferJson(error.response.data);
    }

    // Log full technical details for developers first (before sanitizing).
    logApiError(error);

    const parsed = parseApiError(error);
    const localizedMessage = await resolveLocalizedApiMessage(parsed);
    const localizedParsed: ParsedApiError = {
      ...parsed,
      safeMessage: localizedMessage,
    };

    // Replace unsafe response bodies (HTML/proxy dumps) with a safe envelope.
    // Legacy screens reading `error.response.data.message` then get friendly text.
    if (error.response) {
      error.response.data = buildSafeResponseData(
        error.response.data,
        localizedParsed,
      );
    }

    if (parsed.shouldLogout) {
      void triggerUnauthorizedLogout();
    }

    return Promise.reject(
      normalizeAxiosError(error, localizedMessage, {
        messageKey: parsed.messageKey,
        validationErrors: parsed.validationErrors,
        kind: parsed.kind,
        isNetworkError: parsed.isNetworkError,
        isTimeout: parsed.isTimeout,
      }),
    );
  },
);

export default api;
