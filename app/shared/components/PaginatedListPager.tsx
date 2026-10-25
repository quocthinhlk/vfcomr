import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useThemedColors} from '../styles/theme';
import {ws} from '../utils/scale';

/*
 * Why React Native's Animated and not react-native-reanimated here:
 * on Android (RN 0.78, new architecture) a Reanimated-animated view on a screen
 * stops that screen's <Modal>s from ever receiving their window size. Every
 * Modal on the screen (action sheet, attribute key…) then lays out at 0×0: an
 * invisible full-screen dialog that swallows every tap, so the sheet "never
 * opens" and the list looks frozen until Back is pressed. Reproduced on an
 * emulator with the church list; with one page (carousel off) the same sheet
 * worked. Keep this carousel on RN Animated (native driver) + JS gesture
 * callbacks so no view here is driven by Reanimated.
 */

/** Above this, horizontal swipe is disabled to avoid huge native page counts. */
export const PAGINATED_LIST_PAGER_MAX_PAGES = 80;

const SWIPE_THRESHOLD_RATIO = 0.2;
const VELOCITY_THRESHOLD = 650;
const RUBBER_BAND = 0.25;
const MAX_OVERSHOOT = ws(40);
const COMMIT_DURATION_MS = 150;
const COMMIT_EASING = Easing.out(Easing.quad);

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
  pageWidth: Animated.Value;
  scrollX: Animated.Value;
  background: string;
  children: React.ReactNode;
};

/** A single page instance, positioned along the virtual track: x = page * width - scrollX. */
function CarouselPage({
  pageNumber,
  pageWidth,
  scrollX,
  background,
  children,
}: CarouselPageProps) {
  // Width and scroll are both animated values, updated in the same native
  // batch, so a page never jumps when the width arrives or changes.
  const translateX = useMemo(
    () => Animated.subtract(Animated.multiply(pageWidth, pageNumber), scrollX),
    [pageNumber, pageWidth, scrollX],
  );

  return (
    <Animated.View
      style={[styles.page, {backgroundColor: background, transform: [{translateX}]}]}
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

  // Neighbour pages are mounted only once the width is known.
  const [hasWidth, setHasWidth] = useState(false);
  // Track position in px: page p sits at p * width - scrollX.
  const pageWidth = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  // JS mirror of scrollX (the native value cannot be read synchronously).
  const scrollRef = useRef(0);
  const widthRef = useRef(0);
  const pageRef = useRef(page);
  pageRef.current = page;
  const totalRef = useRef(totalPages);
  totalRef.current = totalPages;
  const animatingRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(0);
  const prevPageRef = useRef(page);
  const swipeRef = useRef(false);

  const usePager =
    totalPages > 1 && totalPages <= PAGINATED_LIST_PAGER_MAX_PAGES;

  const setScroll = useCallback(
    (value: number) => {
      scrollRef.current = value;
      scrollX.setValue(value);
    },
    [scrollX],
  );

  const animateScrollTo = useCallback(
    (value: number) => {
      animatingRef.current = true;
      scrollRef.current = value;
      Animated.timing(scrollX, {
        toValue: value,
        duration: COMMIT_DURATION_MS,
        easing: COMMIT_EASING,
        useNativeDriver: true,
      }).start(() => {
        animatingRef.current = false;
      });
    },
    [scrollX],
  );

  // Move both values to the native driver once, so drag updates (setValue) are
  // applied natively too instead of re-rendering through the shadow tree.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageWidth, {
        toValue: widthRef.current,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(scrollX, {
        toValue: scrollRef.current,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pageWidth, scrollX]);

  const notifyChange = useCallback(
    (target: number) => {
      swipeRef.current = true;
      onPageChange(target);
    },
    [onPageChange],
  );

  // Snap to current page (no animation) on remount / filter reset.
  useEffect(() => {
    setScroll(widthRef.current > 0 ? pageRef.current * widthRef.current : 0);
    prevPageRef.current = pageRef.current;
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
    const w = widthRef.current;
    if (w > 0) {
      animateScrollTo(page * w);
    }
    prevPageRef.current = page;
  }, [page, animateScrollTo]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const w = event.nativeEvent.layout.width;
      if (w <= 0 || w === widthRef.current) {
        return;
      }
      widthRef.current = w;
      // Keep the current page in place when the width first arrives or changes.
      pageWidth.setValue(w);
      setScroll(pageRef.current * w);
      setHasWidth(true);
    },
    [pageWidth, setScroll],
  );

  // Callbacks run on the JS thread (runOnJS): nothing here is a Reanimated worklet.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onStart(() => {
          if (animatingRef.current || widthRef.current <= 0) {
            draggingRef.current = false;
            return;
          }
          draggingRef.current = true;
          dragStartRef.current = scrollRef.current;
        })
        .onUpdate(event => {
          if (!draggingRef.current) {
            return;
          }
          const w = widthRef.current;
          const minS = w; // page 1
          const maxS = totalRef.current * w; // last page
          let next = dragStartRef.current - event.translationX;
          if (next < minS) {
            const over = minS - next;
            next = minS - Math.min(over * RUBBER_BAND, MAX_OVERSHOOT);
          } else if (next > maxS) {
            const over = next - maxS;
            next = maxS + Math.min(over * RUBBER_BAND, MAX_OVERSHOOT);
          }
          setScroll(next);
        })
        .onEnd(event => {
          if (!draggingRef.current) {
            return;
          }
          draggingRef.current = false;
          const w = widthRef.current;
          if (w <= 0) {
            return;
          }
          const cur = pageRef.current;
          const max = totalRef.current;
          const diff = scrollRef.current - cur * w; // > 0 → moved toward next
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

          animateScrollTo(target * w);
          if (target !== cur) {
            notifyChange(target);
          }
        })
        .onFinalize(() => {
          // Cancelled mid-drag (e.g. the list took over): settle on the current page.
          if (draggingRef.current) {
            draggingRef.current = false;
            if (widthRef.current > 0) {
              animateScrollTo(pageRef.current * widthRef.current);
            }
          }
        }),
    [animateScrollTo, notifyChange, setScroll],
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

  // Window of pages kept mounted: previous / current / next (clamped). Until the
  // width is known only the current page is shown, so a neighbour can never sit
  // on top of it.
  const windowPages: number[] = [];
  if (hasWidth) {
    for (let p = page - 1; p <= page + 1; p++) {
      if (p >= 1 && p <= totalPages) {
        windowPages.push(p);
      }
    }
  } else {
    windowPages.push(page);
  }

  return (
    <View
      style={[styles.pager, {backgroundColor: C.background}, style]}
      onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.track} collapsable={false}>
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
        </View>
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
