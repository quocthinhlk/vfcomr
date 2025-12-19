import { Dimensions, PixelRatio, Platform } from 'react-native';

// Design size (iPhone X)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// CONFIG SIZE SCALING
// Android global font scale adjust
// Reduce all Android fonts (0.88–0.95 looks good)
const ANDROID_FONT_ADJUST = 0.9; // Global font scale adjust

// Clamp font scale (production-safe)
const FONT_MIN_SCALE = 0.7; // Minimum font scale
const FONT_MAX_SCALE = 1.05; // Maximum font scale

// Padding / margin moderate scale factor
const MODERATE_SCALE_FACTOR = 0.4;

// Extra shrink for very small screens
const SMALL_SCREEN_WIDTH = 360;  // Common Android phone width (HD)
const SMALL_SCREEN_FONT_ADJUST = 0.88; // Extra shrink for very small screens

/* ======================================================
   INTERNAL
====================================================== */

const { width, height } = Dimensions.get('window');

const widthScale = width / BASE_WIDTH;
const heightScale = height / BASE_HEIGHT;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/* ======================================================
   INTERNAL
====================================================== */

export function fs(size: number) {
  // iOS keeps the original design
  if (Platform.OS === 'ios') {
    return size;
  }

  let scale = widthScale * ANDROID_FONT_ADJUST;

  // Very small Android screens → reduce further
  if (width < SMALL_SCREEN_WIDTH) {
    scale = widthScale * SMALL_SCREEN_FONT_ADJUST;
  }

  const scaled = size * scale;

  return PixelRatio.roundToNearestPixel(
    clamp(
      scaled,
      size * FONT_MIN_SCALE,
      size * FONT_MAX_SCALE
    )
  );
}

/* ======================================================
   WIDTH SCALE (ws)
====================================================== */

export function ws(size: number) {
  return PixelRatio.roundToNearestPixel(size * widthScale);
}

/* ======================================================
   HEIGHT SCALE (hs)
====================================================== */

export function hs(size: number) {
  return PixelRatio.roundToNearestPixel(size * heightScale);
}

/* ======================================================
   MODERATE SCALE (ms) – padding / margin
====================================================== */

export function ms(size: number, factor = MODERATE_SCALE_FACTOR) {
  const scaled = size * widthScale;
  return PixelRatio.roundToNearestPixel(
    size + (scaled - size) * factor
  );
}

/* ======================================================
   RADIUS SCALE (rs)
====================================================== */

export function rs(size: number) {
  return PixelRatio.roundToNearestPixel(size * widthScale);
}

/* ======================================================
   DEBUG (OPTIONAL)
====================================================== */

export const __SCALE_DEBUG__ = {
  width,
  height,
  widthScale,
  heightScale,
};