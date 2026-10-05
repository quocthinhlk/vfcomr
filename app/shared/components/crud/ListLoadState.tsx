import React from 'react';
import ApiErrorState from '../ApiErrorState';
import {CenteredLoader} from './ScreenContainer';

type Props = {
  /** Initial load in progress (no items yet). */
  loading?: boolean;
  /** Last load error; when set (and not loading) the error state replaces the empty state. */
  error?: unknown;
  onRetry?: () => void | Promise<unknown>;
  /** What to show when the load succeeded but returned nothing (usually <ListEmptyState />). */
  children?: React.ReactNode;
};

/**
 * Use as a FlatList `ListEmptyComponent`: spinner while loading, a recoverable
 * error (offline / server) when the load failed, otherwise the empty state.
 * A failed load must never look like "no data".
 */
export const ListLoadState: React.FC<Props> = ({loading, error, onRetry, children}) => {
  if (loading) {
    return <CenteredLoader />;
  }
  if (error) {
    return <ApiErrorState error={error} onRetry={onRetry} />;
  }
  return <>{children}</>;
};
