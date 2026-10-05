import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Header} from '../Header';
import ApiErrorState from '../ApiErrorState';
import {globalStyles} from '../../styles/global';
import {useThemedColors} from '../../styles/theme';
import {COLORS} from '../../constants/colors';
import {ms} from '../../utils/scale';

type Props = {
  title: string;
  /** Show the hamburger menu in the header (list screens). Defaults to false. */
  showMenu?: boolean;
  onBackPress?: () => void;
  /** Wrap children in a ScrollView (forms, detail, delete). Defaults to false. */
  scroll?: boolean;
  /** Replace the content with a centred spinner. */
  loading?: boolean;
  /** Initial load failed: show a recoverable error state instead of the content. */
  error?: unknown;
  onRetry?: () => void | Promise<unknown>;
  children?: React.ReactNode;
};

/** Safe area + header + 16pt side gutters shared by every CRUD screen. */
export const ScreenContainer: React.FC<Props> = ({
  title,
  showMenu = false,
  onBackPress,
  scroll = false,
  loading = false,
  error,
  onRetry,
  children,
}) => {
  const C = useThemedColors();
  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.screen, {backgroundColor: C.background}]}>
        <Header title={title} showMenu={showMenu} onBackPress={onBackPress} />
        {loading ? (
          <CenteredLoader />
        ) : error ? (
          <ApiErrorState error={error} onRetry={onRetry} />
        ) : scroll ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          children
        )}
      </View>
    </SafeAreaView>
  );
};

export const CenteredLoader: React.FC = () => (
  <View style={styles.loader}>
    <ActivityIndicator color={COLORS.mainColor} />
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: ms(12),
    paddingBottom: ms(32),
  },
  loader: {
    paddingVertical: ms(48),
    alignItems: 'center',
  },
});
