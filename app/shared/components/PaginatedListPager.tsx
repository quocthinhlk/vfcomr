import React, {useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet, type ViewStyle} from 'react-native';
import PagerView, {type PagerViewOnPageSelectedEvent} from 'react-native-pager-view';

/** Above this, horizontal swipe is disabled to avoid huge native page counts. */
export const PAGINATED_LIST_PAGER_MAX_PAGES = 80;

export type PaginatedListPagerProps = {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  children: React.ReactElement;
  style?: ViewStyle;
  /**
   * When this value changes (e.g. year filter), the pager snaps back to the middle slot
   * without remounting the whole tree on every keystroke.
   */
  pagerRemountKey?: string | number;
};

/**
 * Wraps a vertically scrolling list so users can swipe horizontally to go to the
 * previous/next page (in addition to pagination controls). Uses a 3-slot pattern so
 * the list stays in the center page and the pager resets to the middle after each
 * navigation, avoiding empty off-screen pages during the gesture.
 */
export function PaginatedListPager({
  page,
  totalPages,
  onPageChange,
  children,
  style,
  pagerRemountKey = '',
}: PaginatedListPagerProps) {
  const pagerRef = useRef<PagerView>(null);
  const pageRef = useRef(page);
  const totalPagesRef = useRef(totalPages);
  const syncingRef = useRef(false);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  const usePager =
    totalPages > 1 && totalPages <= PAGINATED_LIST_PAGER_MAX_PAGES;

  const snapToMiddle = useCallback(() => {
    syncingRef.current = true;
    pagerRef.current?.setPageWithoutAnimation?.(1);
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (!usePager) {
      return;
    }
    snapToMiddle();
  }, [page, totalPages, pagerRemountKey, usePager, snapToMiddle]);

  const onPageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      if (!usePager || syncingRef.current) {
        return;
      }
      const pos = e.nativeEvent.position;
      const cur = pageRef.current;
      const max = totalPagesRef.current;
      if (pos === 0 && cur > 1) {
        onPageChange(cur - 1);
      } else if (pos === 2 && cur < max) {
        onPageChange(cur + 1);
      }
    },
    [usePager, onPageChange],
  );

  if (!usePager) {
    return <>{children}</>;
  }

  return (
    <PagerView
      ref={pagerRef}
      style={[styles.pager, style]}
      initialPage={1}
      onPageSelected={onPageSelected}
      scrollEnabled
      overdrag={false}>
      <View key="pager-prev" style={styles.page} collapsable={false} />
      <View key="pager-current" style={styles.page} collapsable={false}>
        {children}
      </View>
      <View key="pager-next" style={styles.page} collapsable={false} />
    </PagerView>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
