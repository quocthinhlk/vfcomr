import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  View,
  type FlatListProps,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {ms, ws} from '../utils/scale';
import {useThemedColors} from '../styles/theme';

const SCROLLBAR_WIDTH = ws(5);
const SCROLLBAR_MIN_THUMB = ms(52);
const SCROLLBAR_INSET = ms(3);

type Props<T> = FlatListProps<T> & {
  scrollbarWidth?: number;
};

export function FlatListWithVerticalScrollbar<T>({
  style,
  onScroll,
  onContentSizeChange,
  onLayout,
  scrollbarWidth = SCROLLBAR_WIDTH,
  ...rest
}: Props<T>) {
  const C = useThemedColors();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);

  const {thumbHeight, maxScroll, maxThumbTravel, visible} = useMemo(() => {
    if (layoutHeight <= 0 || contentHeight <= layoutHeight) {
      return {thumbHeight: 0, maxScroll: 0, maxThumbTravel: 0, visible: false};
    }
    const thumb = Math.max(
      (layoutHeight / contentHeight) * layoutHeight,
      SCROLLBAR_MIN_THUMB,
    );
    const max = contentHeight - layoutHeight;
    const travel = layoutHeight - thumb;
    return {thumbHeight: thumb, maxScroll: max, maxThumbTravel: travel, visible: true};
  }, [contentHeight, layoutHeight]);

  const thumbTranslateY = scrollY.interpolate({
    inputRange: [0, Math.max(maxScroll, 1)],
    outputRange: [0, maxThumbTravel],
    extrapolate: 'clamp',
  });

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [onScroll, scrollY],
  );

  const wrapStyle = StyleSheet.flatten(style) as StyleProp<ViewStyle>;

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <FlatList
        {...rest}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onContentSizeChange={(w, h) => {
          setContentHeight(h);
          onContentSizeChange?.(w, h);
        }}
        onLayout={e => {
          setLayoutHeight(e.nativeEvent.layout.height);
          onLayout?.(e);
        }}
      />
      {visible ? (
        <View
          style={[
            styles.track,
            {
              width: scrollbarWidth,
              right: SCROLLBAR_INSET,
              backgroundColor: C.inputBorder,
            },
          ]}
          pointerEvents="none">
          <Animated.View
            style={[
              styles.thumb,
              {
                width: scrollbarWidth,
                height: thumbHeight,
                backgroundColor: C.textSecondary,
                transform: [{translateY: thumbTranslateY}],
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
  },
  track: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: ms(4),
    opacity: 0.35,
    overflow: 'hidden',
  },
  thumb: {
    borderRadius: ms(4),
    opacity: 0.85,
  },
});
