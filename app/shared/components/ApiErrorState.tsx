import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useThemedColors} from '../styles/theme';
import {useTranslation} from '../hooks/useTranslation';
import {COLORS} from '../constants/colors';
import {fs, hs, ms, rs, ws} from '../utils/scale';
import {
  getApiErrorMessage,
  type ApiErrorMessageKey,
} from '../utils/apiErrorHandler';

type Props = {
  error?: unknown;
  message?: string;
  messageKey?: ApiErrorMessageKey;
  onRetry?: () => void;
  retryLabel?: string;
};

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
}: Props) {
  const C = useThemedColors();
  const {t} = useTranslation();

  const displayMessage =
    message ||
    (error != null ? getApiErrorMessage(error, t, messageKey) : t(messageKey));

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.content}>
        <View
          style={[
            styles.iconRing,
            {
              backgroundColor: C.surface || COLORS.white,
              borderColor: C.border || COLORS.lightGray,
            },
          ]}>
          <View style={styles.iconInner}>
            <Text style={styles.iconMark}>!</Text>
          </View>
        </View>

        <Text style={[styles.title, {color: C.textPrimary || COLORS.black}]}>
          {t('error')}
        </Text>

        <Text style={[styles.message, {color: C.textSecondary || COLORS.gray}]}>
          {displayMessage}
        </Text>

        {onRetry ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={retryLabel || t('tryAgain')}>
            <Text style={styles.retryText}>{retryLabel || t('tryAgain')}</Text>
          </TouchableOpacity>
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
    paddingHorizontal: ms(28),
    paddingVertical: ms(40),
  },
  content: {
    width: '100%',
    maxWidth: ws(320),
    alignItems: 'center',
  },
  iconRing: {
    width: ws(88),
    height: ws(88),
    borderRadius: ws(44),
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(22),
  },
  iconInner: {
    width: ws(56),
    height: ws(56),
    borderRadius: ws(28),
    backgroundColor: 'rgba(36, 120, 206, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMark: {
    color: COLORS.mainColor,
    fontSize: fs(28),
    fontWeight: '700',
    lineHeight: fs(32),
    includeFontPadding: false,
  },
  title: {
    fontSize: fs(20),
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: ms(10),
    textAlign: 'center',
  },
  message: {
    fontSize: fs(15),
    lineHeight: fs(22),
    textAlign: 'center',
    marginBottom: ms(28),
    paddingHorizontal: ms(4),
  },
  retryButton: {
    minWidth: ws(168),
    height: hs(44),
    paddingHorizontal: ms(28),
    borderRadius: rs(22),
    backgroundColor: COLORS.mainColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: COLORS.white,
    fontSize: fs(15),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default ApiErrorState;
