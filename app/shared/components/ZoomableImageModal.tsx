import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  StatusBar,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler,
  type PanGestureHandlerStateChangeEvent,
  type PinchGestureHandlerStateChangeEvent,
  type TapGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import {fs, hs, ms} from '../utils/scale';

type Props = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  backdropColor?: string;
  headerRight?: React.ReactNode;
  overlay?: React.ReactNode;
  maxZoom?: number; // hard cap while pinching (over-zoom)
  snapZoom?: number; // rubber-band snap back to this after pinch if exceeded
  minZoomForTapReset?: number; // when >= this, single tap resets to 1x
};

const DEFAULT_MAX_ZOOM = 4;
const DEFAULT_SNAP_ZOOM = 3;
const DEFAULT_TAP_RESET_ZOOM = 3;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function ZoomableImageModal({
  visible,
  uri,
  onClose,
  backdropColor = 'rgba(0,0,0,0.95)',
  headerRight,
  overlay,
  maxZoom = DEFAULT_MAX_ZOOM,
  snapZoom = DEFAULT_SNAP_ZOOM,
  minZoomForTapReset = DEFAULT_TAP_RESET_ZOOM,
}: Props) {
  const insets = useSafeAreaInsets();
  const doubleTapRef = useRef<TapGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const clampedPanX = useRef(new Animated.Value(0)).current;
  const clampedPanY = useRef(new Animated.Value(0)).current;

  const lastScaleRef = useRef(1);
  const lastTranslateRef = useRef({x: 0, y: 0});
  const lastTapRef = useRef({x: 0, y: 0});
  const clampedPanRef = useRef({x: 0, y: 0});

  const [container, setContainer] = useState({w: 0, h: 0});
  const [img, setImg] = useState<{w: number; h: number} | null>(null);

  // Derived animated scale: base scale * pinchScale
  const composedScale = useMemo(() => Animated.multiply(scale, pinchScale), [scale, pinchScale]);

  // Load image intrinsic size for bounds clamping (contain mode).
  useEffect(() => {
    let mounted = true;
    if (!uri || !visible) {
      return;
    }
    Image.getSize(
      uri,
      (w, h) => {
        if (!mounted) return;
        if (w > 0 && h > 0) setImg({w, h});
      },
      () => {
        if (!mounted) return;
        setImg(null);
      },
    );
    return () => {
      mounted = false;
    };
  }, [uri, visible]);

  const getContainBaseSize = () => {
    const cw = container.w;
    const ch = container.h;
    const iw = img?.w ?? 0;
    const ih = img?.h ?? 0;
    if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) {
      return {w: cw, h: ch};
    }
    const r = Math.min(cw / iw, ch / ih);
    return {w: iw * r, h: ih * r};
  };

  const clampTranslateForScale = (nextScale: number, x: number, y: number) => {
    const base = getContainBaseSize();
    const cw = container.w;
    const ch = container.h;
    const scaledW = base.w * nextScale;
    const scaledH = base.h * nextScale;
    const maxX = Math.max(0, (scaledW - cw) / 2);
    const maxY = Math.max(0, (scaledH - ch) / 2);
    return {x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY)};
  };

  const animateTo = (
    nextScale: number,
    nextX: number,
    nextY: number,
    opts?: {duration?: number; easing?: (value: number) => number},
  ) => {
    // Stop any in-flight animations to avoid "jumpiness" on rapid double-taps.
    scale.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();

    const duration = opts?.duration ?? 220;
    const easing = opts?.easing ?? Easing.inOut(Easing.cubic);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: nextScale,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: nextX,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: nextY,
        duration,
        easing,
        useNativeDriver: true,
      }),
    ]).start(() => {
      lastScaleRef.current = nextScale;
      lastTranslateRef.current = {x: nextX, y: nextY};
    });
  };

  const reset = () => {
    pinchScale.setValue(1);
    panX.setValue(0);
    panY.setValue(0);
    clampedPanX.setValue(0);
    clampedPanY.setValue(0);
    clampedPanRef.current = {x: 0, y: 0};
    animateTo(1, 0, 0, {duration: 210, easing: Easing.out(Easing.cubic)});
  };

  // Reset state whenever modal opens/closes.
  useEffect(() => {
    if (visible) {
      reset();
      setImg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onSingleTapStateChange = (e: TapGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.state !== State.END) return;
    const currentScale = lastScaleRef.current;
    if (currentScale >= minZoomForTapReset) {
      reset();
      return;
    }
    // No-op when not zoomed: only the ✕ button closes the modal.
  };

  const onDoubleTapStateChange = (e: TapGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.state !== State.END) return;
    const {x, y} = e.nativeEvent;
    lastTapRef.current = {x, y};
    const currentScale = lastScaleRef.current;
    if (currentScale >= snapZoom) {
      reset();
      return;
    }
    // Zoom to snapZoom. Keep translation clamped. (Tap-to-zoom focal behavior can be added later.)
    const clamped = clampTranslateForScale(snapZoom, lastTranslateRef.current.x, lastTranslateRef.current.y);
    animateTo(snapZoom, clamped.x, clamped.y, {duration: 240, easing: Easing.out(Easing.cubic)});
  };

  const onPinchStateChange = (e: PinchGestureHandlerStateChangeEvent) => {
    const s = e.nativeEvent.scale ?? 1;
    const next = clamp(lastScaleRef.current * s, 1, maxZoom);
    if (e.nativeEvent.oldState === State.ACTIVE) {
      // Commit end-of-gesture scale and persist it (no snap-to-fixed-scale).
      pinchScale.setValue(1);
      const committed = clamp(next, 1, maxZoom);
      const clamped = clampTranslateForScale(
        committed,
        lastTranslateRef.current.x,
        lastTranslateRef.current.y,
      );
      // No animation on release: keep exact final pinch scale.
      scale.stopAnimation();
      translateX.stopAnimation();
      translateY.stopAnimation();
      scale.setValue(committed);
      translateX.setValue(clamped.x);
      translateY.setValue(clamped.y);
      lastScaleRef.current = committed;
      lastTranslateRef.current = {x: clamped.x, y: clamped.y};
    }
  };

  const onPinchGestureEvent = Animated.event(
    [{nativeEvent: {scale: pinchScale}}],
    // Keep pinch on native driver for smoothness.
    {useNativeDriver: true},
  );

  const onPanStateChange = (e: PanGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState !== State.ACTIVE) return;
    if (lastScaleRef.current <= 1) {
      // Ignore pan when not zoomed
      panX.setValue(0);
      panY.setValue(0);
      clampedPanX.setValue(0);
      clampedPanY.setValue(0);
      clampedPanRef.current = {x: 0, y: 0};
      translateX.setValue(0);
      translateY.setValue(0);
      lastTranslateRef.current = {x: 0, y: 0};
      return;
    }
    const dx = clampedPanRef.current.x;
    const dy = clampedPanRef.current.y;
    const nextX = lastTranslateRef.current.x + dx;
    const nextY = lastTranslateRef.current.y + dy;
    const clamped = clampTranslateForScale(lastScaleRef.current, nextX, nextY);
    translateX.setValue(clamped.x);
    translateY.setValue(clamped.y);
    panX.setValue(0);
    panY.setValue(0);
    clampedPanX.setValue(0);
    clampedPanY.setValue(0);
    clampedPanRef.current = {x: 0, y: 0};
    lastTranslateRef.current = {x: clamped.x, y: clamped.y};
  };

  const onPanGestureEvent = Animated.event(
    [{nativeEvent: {translationX: panX, translationY: panY}}],
    // Native driver + nested gesture handlers can warn:
    // "Nesting touch handlers with native animated driver is not supported yet"
    {useNativeDriver: false},
  );

  // Apply pan continuously with clamping based on lastScale.
  useEffect(() => {
    const subX = panX.addListener(({value}) => {
      const nextX = lastTranslateRef.current.x + value;
      const clamped = clampTranslateForScale(
        lastScaleRef.current,
        nextX,
        lastTranslateRef.current.y,
      );
      const dx = clamped.x - lastTranslateRef.current.x;
      clampedPanRef.current.x = dx;
      clampedPanX.setValue(dx);
    });
    const subY = panY.addListener(({value}) => {
      const nextY = lastTranslateRef.current.y + value;
      const clamped = clampTranslateForScale(
        lastScaleRef.current,
        lastTranslateRef.current.x,
        nextY,
      );
      const dy = clamped.y - lastTranslateRef.current.y;
      clampedPanRef.current.y = dy;
      clampedPanY.setValue(dy);
    });
    return () => {
      panX.removeListener(subX);
      panY.removeListener(subY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.w, container.h, img?.w, img?.h]);

  const animatedStyle = useMemo(
    () => ({
      transform: [
        {translateX: Animated.add(translateX, clampedPanX)},
        {translateY: Animated.add(translateY, clampedPanY)},
        {scale: composedScale},
      ],
    }),
    [clampedPanX, clampedPanY, composedScale, translateX, translateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, {backgroundColor: backdropColor}]}>
        <View
          style={styles.content}
          onLayout={e => {
            const {width, height} = e.nativeEvent.layout;
            setContainer({w: width, h: height});
          }}
        >
          <TapGestureHandler
            ref={doubleTapRef}
            numberOfTaps={2}
            maxDelayMs={220}
            onHandlerStateChange={onDoubleTapStateChange}
          >
            <TapGestureHandler
              waitFor={doubleTapRef}
              numberOfTaps={1}
              onHandlerStateChange={onSingleTapStateChange}
            >
              <PanGestureHandler
                ref={panRef}
                simultaneousHandlers={[pinchRef]}
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onPanStateChange}
                enabled
              >
                <Animated.View style={StyleSheet.absoluteFill}>
                  <PinchGestureHandler
                    ref={pinchRef}
                    simultaneousHandlers={[panRef]}
                    onGestureEvent={onPinchGestureEvent}
                    onHandlerStateChange={onPinchStateChange}
                  >
                    <Animated.View style={styles.imageWrap}>
                      {uri ? (
                        <Animated.Image
                          source={{uri}}
                          style={[styles.image, animatedStyle]}
                          resizeMode="contain"
                        />
                      ) : null}
                    </Animated.View>
                  </PinchGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </TapGestureHandler>
          </TapGestureHandler>
        </View>

        {/* Header overlays content so image stays visually centered */}
        <View
          style={[
            styles.safeHeader,
            {
              paddingTop:
                Platform.OS === 'android'
                  ? Math.max(insets.top, StatusBar.currentHeight || 0)
                  : insets.top,
            },
          ]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <RNText style={styles.closeText}>✕</RNText>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              {React.isValidElement(headerRight) &&
              typeof (headerRight as any)?.props?.onPress === 'function' ? (
                <TouchableOpacity
                  onPress={(headerRight as any).props.onPress}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  style={styles.headerMenuBtn}
                >
                  <RNText style={styles.headerMenuDots}>⋯</RNText>
                </TouchableOpacity>
              ) : (
                headerRight
              )}
            </View>
          </View>
        </View>

        {overlay ? (
          <View pointerEvents="box-none" style={styles.overlay}>
            {overlay}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1},
  safeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: ms(12),
    zIndex: 1000,
    elevation: 1000,
  },
  headerRow: {
    height: hs(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    height: hs(40),
    justifyContent: 'center',
    transform: [{scale: 1.5}],
  },
  closeText: {color: '#fff', fontSize: fs(18), fontWeight: '700'},
  headerMenuBtn: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMenuDots: {
    color: '#fff',
    fontSize: fs(22),
    fontWeight: '700',
    lineHeight: fs(26),
  },
  headerRight: {
    minHeight: hs(40),
    justifyContent: 'center',
    alignItems: 'flex-end',
    transform: [{scale: 1.5}],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  content: {flex: 1, zIndex: 0},
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

