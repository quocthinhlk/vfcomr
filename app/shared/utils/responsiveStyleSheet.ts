import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { scale, verticalScale, moderateScale } from './responsive';

type Style = ViewStyle | TextStyle | ImageStyle;

/**
 * Create a StyleSheet with responsive scaling automatically applied
 * This will scale fontSize, width, height, padding, margin, borderRadius, borderWidth
 * For Android HD screens, sizes will be reduced by 10-15%
 * 
 * Usage:
 * const styles = responsiveStyleSheet.create({
 *   container: {
 *     fontSize: 14,      // Will be scaled
 *     padding: 16,       // Will be scaled
 *     marginTop: 20,     // Will be scaled
 *     borderRadius: 8,   // Will be scaled
 *     borderWidth: 1,    // Will be scaled (less aggressive)
 *   }
 * });
 */
export const responsiveStyleSheet = {
  create: <T extends Record<string, Style>>(styles: T): T => {
    const scaledStyles = {} as T;

    for (const key in styles) {
      const style = styles[key];
      const scaledStyle: any = { ...style };

      // Scale fontSize
      if (typeof style.fontSize === 'number') {
        scaledStyle.fontSize = scale(style.fontSize);
      }

      // Scale lineHeight if it's a number
      if (typeof style.lineHeight === 'number') {
        scaledStyle.lineHeight = scale(style.lineHeight);
      }

      // Scale dimensions
      if (typeof style.width === 'number') {
        scaledStyle.width = scale(style.width);
      }
      if (typeof style.height === 'number') {
        scaledStyle.height = scale(style.height);
      }
      if (typeof style.minWidth === 'number') {
        scaledStyle.minWidth = scale(style.minWidth);
      }
      if (typeof style.minHeight === 'number') {
        scaledStyle.minHeight = scale(style.minHeight);
      }
      if (typeof style.maxWidth === 'number') {
        scaledStyle.maxWidth = scale(style.maxWidth);
      }
      if (typeof style.maxHeight === 'number') {
        scaledStyle.maxHeight = scale(style.maxHeight);
      }

      // Scale padding (use moderateScale for less aggressive scaling)
      if (typeof style.padding === 'number') {
        scaledStyle.padding = moderateScale(style.padding);
      }
      if (typeof style.paddingTop === 'number') {
        scaledStyle.paddingTop = verticalScale(style.paddingTop);
      }
      if (typeof style.paddingBottom === 'number') {
        scaledStyle.paddingBottom = verticalScale(style.paddingBottom);
      }
      if (typeof style.paddingLeft === 'number') {
        scaledStyle.paddingLeft = scale(style.paddingLeft);
      }
      if (typeof style.paddingRight === 'number') {
        scaledStyle.paddingRight = scale(style.paddingRight);
      }
      if (typeof style.paddingHorizontal === 'number') {
        scaledStyle.paddingHorizontal = scale(style.paddingHorizontal);
      }
      if (typeof style.paddingVertical === 'number') {
        scaledStyle.paddingVertical = verticalScale(style.paddingVertical);
      }

      // Scale margin (use moderateScale for less aggressive scaling)
      if (typeof style.margin === 'number') {
        scaledStyle.margin = moderateScale(style.margin);
      }
      if (typeof style.marginTop === 'number') {
        scaledStyle.marginTop = verticalScale(style.marginTop);
      }
      if (typeof style.marginBottom === 'number') {
        scaledStyle.marginBottom = verticalScale(style.marginBottom);
      }
      if (typeof style.marginLeft === 'number') {
        scaledStyle.marginLeft = scale(style.marginLeft);
      }
      if (typeof style.marginRight === 'number') {
        scaledStyle.marginRight = scale(style.marginRight);
      }
      if (typeof style.marginHorizontal === 'number') {
        scaledStyle.marginHorizontal = scale(style.marginHorizontal);
      }
      if (typeof style.marginVertical === 'number') {
        scaledStyle.marginVertical = verticalScale(style.marginVertical);
      }

      // Scale border properties (use moderateScale for subtle scaling)
      if (typeof style.borderRadius === 'number') {
        scaledStyle.borderRadius = moderateScale(style.borderRadius, 0.7);
      }
      if (typeof style.borderWidth === 'number') {
        scaledStyle.borderWidth = moderateScale(style.borderWidth, 0.5);
      }

      // Scale gap (if using flexbox gap)
      if (typeof (style as any).gap === 'number') {
        (scaledStyle as any).gap = moderateScale((style as any).gap);
      }

      scaledStyles[key] = scaledStyle;
    }

    return StyleSheet.create(scaledStyles);
  },
};

// Re-export scale functions for manual use when needed
export { scale, verticalScale, moderateScale };

