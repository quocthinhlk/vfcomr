import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {useThemedColors} from '../styles/theme';
import {useUiTokens} from '../styles/uiTokens';
import {useTranslation} from '../hooks/useTranslation';
import {COLORS} from '../constants/colors';
import {fs, ms, rs, ws} from '../utils/scale';
import {
  API_ERROR_FALLBACKS,
  getApiErrorMessage,
  parseApiError,
  type ApiErrorMessageKey,
} from '../utils/apiErrorHandler';
import type {TranslationKey} from '../translations/types';
import {
  AlertIcon,
  ClockIcon,
  RefreshIcon,
  ServerIcon,
  UiIconProps,
  WifiOffIcon,
} from './icons/UiIcons';

// Auto-retry backoff for network errors: 5s, 10s, 20s ... capped at 60s.
// Module-level so it survives the error view remounting after each failed try.
const AUTO_RETRY_BASE_MS = 5000;
const AUTO_RETRY_MAX_MS = 60000;
let autoRetryAttempts = 0;
let lastAutoRetryAt = 0;

type Variant = 'network' | 'timeout' | 'server' | 'generic';

type Props = {
  error?: unknown;
  message?: string;
  messageKey?: ApiErrorMessageKey;
  onRetry?: () => void | Promise<unknown>;
  retryLabel?: string;
  /** Force the visual variant; inferred from `error` / `message` otherwise. */
  variant?: Variant;
  /** Smaller, non-flex layout for use inside cards / sections. */
  compact?: boolean;
};

const VARIANT_BY_KEY: Partial<Record<ApiErrorMessageKey, Variant>> = {
  apiErrorNetwork: 'network',
  apiErrorTimeout: 'timeout',
  apiErrorServer: 'server',
};

const VARIANT_UI: Record<
  Variant,
  {icon: React.FC<UiIconProps>; title: TranslationKey; tone: 'neutral' | 'warning' | 'danger'}
> = {
  network: {icon: WifiOffIcon, title: 'noInternetConnection', tone: 'neutral'},
  timeout: {icon: ClockIcon, title: 'errorTitleTimeout', tone: 'warning'},
  server: {icon: ServerIcon, title: 'errorTitleServer', tone: 'danger'},
  generic: {icon: AlertIcon, title: 'errorTitleGeneric', tone: 'danger'},
};

/** Work out which illustration to show without changing what callers pass. */
function resolveVariant(
  t: (k: TranslationKey) => string,
  error: unknown,
  message: string | undefined,
  messageKey: ApiErrorMessageKey,
): Variant {
  if (error != null) {
    return VARIANT_BY_KEY[parseApiError(error).messageKey] ?? 'generic';
  }
  if (message) {
    for (const key of Object.keys(VARIANT_BY_KEY) as ApiErrorMessageKey[]) {
      if (message === t(key) || message === API_ERROR_FALLBACKS[key]) {
        return VARIANT_BY_KEY[key]!;
      }
    }
    return 'generic';
  }
  return VARIANT_BY_KEY[messageKey] ?? 'generic';
}

/**
 * Full-screen / inline friendly error state for failed API loads.
 * Never renders HTML or raw API payloads.
 */
export function ApiErrorState({
  error,
  message,
  messageKey = 'apiErrorUnexpected',
  onRetry,
  retryLabel,
  variant: variantProp,
  compact = false,
}: Props) {
  const C = useThemedColors();
  const T = useUiTokens();
  const {t} = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const displayMessage =
    message ||
    (error != null ? getApiErrorMessage(error, t, messageKey) : t(messageKey));
  const variant = variantProp ?? resolveVariant(t, error, message, messageKey);
  const ui = VARIANT_UI[variant];
  const Icon = ui.icon;
  const toneColor =
    ui.tone === 'neutral' ? T.brandText : ui.tone === 'warning' ? T.warningText : T.dangerText;
  const toneTint =
    ui.tone === 'neutral' ? T.brandTint : ui.tone === 'warning' ? T.warningTint : T.dangerTint;

  const handleRetry = async () => {
    if (!onRetry || retrying) {
      return;
    }
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      if (mounted.current) {
        setRetrying(false);
      }
    }
  };

  const hasRetry = !!onRetry;
  // Network errors recover by themselves:
  //  - immediately when NetInfo reports offline -> online,
  //  - when the app returns to the foreground (e.g. back from Settings),
  //  - on a backoff timer while online (server unreachable, or NetInfo
  //    missed the change, which is common on the iOS simulator).
  const retryRef = useRef(handleRetry);
  retryRef.current = handleRetry;
  useEffect(() => {
    if (variant !== 'network' || !hasRetry) {
      return;
    }
    let cancelled = false;
    let wasOffline = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isOnline = (s: NetInfoState) =>
      !!s.isConnected && s.isInternetReachable !== false;

    const retryNow = () => {
      if (!cancelled) {
        retryRef.current();
      }
    };

    // A long gap since the last try means the app recovered in between,
    // so a new outage starts again from the shortest delay.
    if (Date.now() - lastAutoRetryAt > AUTO_RETRY_MAX_MS * 2) {
      autoRetryAttempts = 0;
    }

    const schedule = () => {
      const delay = Math.min(
        AUTO_RETRY_BASE_MS * 2 ** autoRetryAttempts,
        AUTO_RETRY_MAX_MS,
      );
      timer = setTimeout(async () => {
        const s = await NetInfo.fetch();
        if (cancelled) {
          return;
        }
        if (isOnline(s)) {
          autoRetryAttempts += 1;
          lastAutoRetryAt = Date.now();
          retryNow();
        }
        schedule();
      }, delay);
    };

    const unsubscribeNet = NetInfo.addEventListener(s => {
      if (!isOnline(s)) {
        wasOffline = true;
      } else if (wasOffline) {
        wasOffline = false;
        autoRetryAttempts = 0;
        retryNow();
      }
    });

    const appStateSub = AppState.addEventListener('change', async next => {
      if (next !== 'active') {
        return;
      }
      const s = await NetInfo.fetch();
      if (!cancelled && isOnline(s)) {
        autoRetryAttempts = 0;
        retryNow();
      }
    });

    schedule();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribeNet();
      appStateSub.remove();
    };
    // Depend on whether a retry exists, not its identity: callers often pass a
    // new function each render, which would otherwise keep resetting the timer.
  }, [variant, hasRetry]);

  return (
    <View
      style={compact ? styles.containerCompact : styles.container}
      accessibilityRole="alert">
      <View style={styles.content}>
        <View
          style={[
            compact ? styles.haloCompact : styles.halo,
            {backgroundColor: toneTint},
          ]}>
          {compact ? (
            <Icon color={toneColor} size={ws(24)} />
          ) : (
            <View style={[styles.iconCircle, {backgroundColor: C.surface, borderColor: C.surfaceBorder}]}>
              <Icon color={toneColor} size={ws(34)} />
            </View>
          )}
        </View>

        <Text
          style={[styles.title, compact && styles.titleCompact, {color: C.textPrimary}]}
          accessibilityRole="header">
          {t(ui.title)}
        </Text>

        <Text
          style={[styles.message, compact && styles.messageCompact, {color: C.textSecondary}]}>
          {displayMessage}
        </Text>

        {onRetry ? (
          <Pressable
            onPress={() => {
              autoRetryAttempts = 0;
              handleRetry();
            }}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityState={{busy: retrying, disabled: retrying}}
            accessibilityLabel={retryLabel || t('tryAgain')}
            style={({pressed}) => [
              styles.retryButton,
              (pressed || retrying) && styles.retryPressed,
            ]}>
            {retrying ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <RefreshIcon color={COLORS.white} size={ws(18)} />
            )}
            <Text style={styles.retryText}>
              {retrying ? t('retrying') : retryLabel || t('tryAgain')}
            </Text>
          </Pressable>
        ) : null}

        {variant === 'network' && onRetry ? (
          <Text style={[styles.hint, {color: C.textSecondary}]}>
            {t('autoReconnectHint')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(24),
    // Sit slightly above the true centre, where the eye expects it.
    paddingBottom: ms(64),
  },
  containerCompact: {
    alignItems: 'center',
    paddingVertical: ms(16),
  },
  haloCompact: {
    width: ws(52),
    height: ws(52),
    borderRadius: ws(26),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(12),
  },
  titleCompact: {
    fontSize: fs(16),
    lineHeight: fs(22),
    marginBottom: ms(4),
  },
  messageCompact: {
    fontSize: fs(13),
    lineHeight: fs(19),
    marginBottom: ms(16),
  },
  content: {
    width: '100%',
    maxWidth: ws(340),
    alignItems: 'center',
  },
  halo: {
    width: ws(120),
    height: ws(120),
    borderRadius: ws(60),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(24),
  },
  iconCircle: {
    width: ws(76),
    height: ws(76),
    borderRadius: ws(38),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fs(20),
    fontWeight: '700',
    lineHeight: fs(26),
    textAlign: 'center',
    marginBottom: ms(8),
  },
  message: {
    fontSize: fs(15),
    lineHeight: fs(22),
    textAlign: 'center',
    marginBottom: ms(28),
  },
  retryButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: rs(12),
    backgroundColor: COLORS.mainColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    paddingHorizontal: ms(20),
  },
  retryPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: fs(15),
    fontWeight: '600',
  },
  hint: {
    marginTop: ms(14),
    fontSize: fs(13),
    lineHeight: fs(18),
    textAlign: 'center',
  },
});

export default ApiErrorState;
