import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View, type LayoutChangeEvent, type ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import {useThemedColors} from '../styles/theme';
import {ws} from '../utils/scale';

/** Above this, horizontal swipe is disabled to avoid huge native page counts. */
export const PAGINATED_LIST_PAGER_MAX_PAGES = 80;

const SWIPE_THRESHOLD_RATIO = 0.2;
const VELOCITY_THRESHOLD = 650;
const RUBBER_BAND = 0.25;
const MAX_OVERSHOOT = ws(40);
const COMMIT_DURATION_MS = 150;

const COMMIT_TIMING = {
  duration: COMMIT_DURATION_MS,
  easing: Easing.out(Easing.quad),
};

export type PaginatedListPagerProps = {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  /**
   * Renders the page for a given (1-based) page number. The pager keeps the
   * previous/current/next pages mounted simultaneously and only moves them with the
   * gesture — so adjacent pages are real, pre-rendered instances (no remount on commit).
   */
  renderPage?: (pageNumber: number) => React.ReactNode;
  /** Legacy single-page child (used when `renderPage` is not provided). */
  children?: React.ReactElement;
  style?: ViewStyle;
  /**
   * When this value changes (e.g. search/filter reset), the carousel snaps to the
   * current page without animating.
   */
  pagerRemountKey?: string | number;
};

type CarouselPageProps = {
  pageNumber: number;
  pageWidth: SharedValue<number>;
  scrollX: SharedValue<number>;
  background: string;
  children: React.ReactNode;
};

/** A single page instance, positioned along the virtual track via shared values. */
function CarouselPage({
  pageNumber,
  pageWidth,
  scrollX,
  background,
  children,
}: CarouselPageProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: pageNumber * pageWidth.value - scrollX.value}],
  }));

  return (
    <Animated.View
      style={[styles.page, {backgroundColor: background}, animatedStyle]}
      collapsable={false}>
      {children}
    </Animated.View>
  );
}

type CarouselPagerProps = Required<
  Pick<PaginatedListPagerProps, 'page' | 'totalPages' | 'onPageChange' | 'renderPage'>
> &
  Pick<PaginatedListPagerProps, 'style' | 'pagerRemountKey'>;

/**
 * True windowed carousel: keeps prev/current/next pages mounted and slides them as a
 * single virtual track (transform only) so dragging reveals the real adjacent page in
 * real time. Committing a swipe only updates `page` (and shifts the window) — the page
 * instances are keyed by page number and reused, never remounted.
 */
function CarouselPager({
  page,
  totalPages,
  onPageChange,
  renderPage,
  style,
  pagerRemountKey = '',
}: CarouselPagerProps) {
  const C = useThemedColors();

  const pageWidth = useSharedValue(0);
  const scrollX = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const pageShared = useSharedValue(page);
  const totalShared = useSharedValue(totalPages);

  const widthReadyRef = useRef(false);
  const prevPageRef = useRef(page);
  const swipeRef = useRef(false);

  const usePager =
    totalPages > 1 && totalPages <= PAGINATED_LIST_PAGER_MAX_PAGES;

  useEffect(() => {
    pageShared.value = page;
  }, [page, pageShared]);
  useEffect(() => {
    totalShared.value = totalPages;
  }, [totalPages, totalShared]);

  const notifyChange = useCallback(
    (target: number) => {
      swipeRef.current = true;
      onPageChange(target);
    },
    [onPageChange],
  );

  // Snap to current page (no animation) on remount / filter reset.
  useEffect(() => {
    const w = pageWidth.value;
    scrollX.value = w > 0 ? pageShared.value * w : 0;
    prevPageRef.current = pageShared.value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagerRemountKey]);

  // Animate to a page change that did NOT come from a swipe (pagination buttons, etc.).
  useEffect(() => {
    if (prevPageRef.current === page) {
      return;
    }
    if (swipeRef.current) {
      swipeRef.current = false;
      prevPageRef.current = page;
      return;
    }
    const w = pageWidth.value;
    if (w > 0) {
      scrollX.value = withTiming(page * w, COMMIT_TIMING);
    }
    prevPageRef.current = page;
  }, [page, scrollX, pageWidth]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const w = event.nativeEvent.layout.width;
      pageWidth.value = w;
      if (w > 0 && !widthReadyRef.current) {
        widthReadyRef.current = true;
        scrollX.value = pageShared.value * w;
      }
    },
    [pageShared, pageWidth, scrollX],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onStart(() => {
          if (isAnimating.value) {
            return;
          }
          startScroll.value = scrollX.value;
        })
        .onUpdate(event => {
          if (isAnimating.value) {
            return;
          }
          const w = pageWidth.value || 1;
          const max = totalShared.value;
          let next = startScroll.value - event.translationX;
          const minS = w; // page 1
          const maxS = max * w; // last page
          if (next < minS) {
            const over = minS - next;
            next = minS - Math.min(over * RUBBER_BAND, MAX_OVERSHOOT);
          } else if (next > maxS) {
            const over = next - maxS;
            next = maxS + Math.min(over * RUBBER_BAND, MAX_OVERSHOOT);
          }
          scrollX.value = next;
        })
        .onEnd(event => {
          if (isAnimating.value) {
            return;
          }
          const w = pageWidth.value;
          if (w <= 0) {
            return;
          }
          const cur = pageShared.value;
          const max = totalShared.value;
          const diff = scrollX.value - cur * w; // > 0 → moved toward next
          const threshold = w * SWIPE_THRESHOLD_RATIO;

          let target = cur;
          if ((diff > threshold || event.velocityX < -VELOCITY_THRESHOLD) && cur < max) {
            target = cur + 1;
          } else if (
            (diff < -threshold || event.velocityX > VELOCITY_THRESHOLD) &&
            cur > 1
          ) {
            target = cur - 1;
          }

          isAnimating.value = true;
          scrollX.value = withTiming(target * w, COMMIT_TIMING, finished => {
            if (finished) {
              isAnimating.value = false;
            }
          });
          if (target !== cur) {
            runOnJS(notifyChange)(target);
          }
        }),
    [
      isAnimating,
      notifyChange,
      pageShared,
      pageWidth,
      scrollX,
      startScroll,
      totalShared,
    ],
  );

  if (!usePager) {
    return (
      <View
        style={[styles.pager, {backgroundColor: C.background}, style]}
        onLayout={onLayout}>
        {renderPage(page)}
      </View>
    );
  }

  // Window of pages kept mounted: previous / current / next (clamped).
  const windowPages: number[] = [];
  for (let p = page - 1; p <= page + 1; p++) {
    if (p >= 1 && p <= totalPages) {
      windowPages.push(p);
    }
  }

  return (
    <View
      style={[styles.pager, {backgroundColor: C.background}, style]}
      onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.track} collapsable={false}>
          {windowPages.map(pn => (
            <CarouselPage
              key={pn}
              pageNumber={pn}
              pageWidth={pageWidth}
              scrollX={scrollX}
              background={C.background}>
              {renderPage(pn)}
            </CarouselPage>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * Wraps a vertically scrolling list so users can swipe horizontally between pages.
 *
 * Pass `renderPage` to get the real windowed carousel (recommended). The legacy
 * single-`children` form is kept for callers that have not migrated yet.
 */
export function PaginatedListPager(props: PaginatedListPagerProps) {
  if (props.renderPage) {
    return (
      <CarouselPager
        page={props.page}
        totalPages={props.totalPages}
        onPageChange={props.onPageChange}
        renderPage={props.renderPage}
        style={props.style}
        pagerRemountKey={props.pagerRemountKey}
      />
    );
  }
  return <>{props.children}</>;
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    minHeight: 0,
  },
  page: {
    ...StyleSheet.absoluteFillObject,
  },
});
