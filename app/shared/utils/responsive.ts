import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width for scaling (using common Android phone width)
// You can adjust this base width based on your design target
const BASE_WIDTH = 360; // Common Android phone width (HD)
const BASE_HEIGHT = 640; // Common Android phone height (HD)

/**
 * Scale a size based on screen width (responsive like rem/em on web)
 * @param size - The size to scale (fontSize, padding, margin, etc.)
 * @returns Scaled size
 */
export const scale = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  // For Android HD screens, apply a reduction factor
  // For screens smaller than base, reduce more aggressively
  let adjustedScale = scaleFactor;
  
  if (Platform.OS === 'android') {
    // Reduce scale for HD and lower resolution screens
    if (SCREEN_WIDTH <= 480) {
      // HD and below screens: reduce by 15-20%
      adjustedScale = scaleFactor * 0.85;
    } else if (SCREEN_WIDTH <= 720) {
      // HD+ screens: reduce by 10%
      adjustedScale = scaleFactor * 0.9;
    }
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(size * adjustedScale));
};

/**
 * Scale a size based on screen height
 * @param size - The size to scale
 * @returns Scaled size
 */
export const verticalScale = (size: number): number => {
  const scaleFactor = SCREEN_HEIGHT / BASE_HEIGHT;
  let adjustedScale = scaleFactor;
  
  if (Platform.OS === 'android') {
    if (SCREEN_HEIGHT <= 800) {
      adjustedScale = scaleFactor * 0.85;
    } else if (SCREEN_HEIGHT <= 1280) {
      adjustedScale = scaleFactor * 0.9;
    }
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(size * adjustedScale));
};

/**
 * Moderate scale - less aggressive scaling for values that need subtle adjustments
 * @param size - The size to scale
 * @param factor - Scaling factor (0-1), default 0.5
 * @returns Scaled size
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  let adjustedScale = scaleFactor;
  
  if (Platform.OS === 'android') {
    if (SCREEN_WIDTH <= 480) {
      adjustedScale = scaleFactor * 0.85;
    } else if (SCREEN_WIDTH <= 720) {
      adjustedScale = scaleFactor * 0.9;
    }
  }
  
  return size + (adjustedScale * size - size) * factor;
};

// Helper to get current screen dimensions
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scale: SCREEN_WIDTH / BASE_WIDTH,
});

// Helper to check if device is HD or lower
export const isLowResolutionDevice = (): boolean => {
  return Platform.OS === 'android' && SCREEN_WIDTH <= 720;
};

