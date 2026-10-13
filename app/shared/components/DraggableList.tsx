import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, View, ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';

type Props<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Called once on drop when the position changed. */
  onReorder: (from: number, to: number) => void;
  enabled?: boolean;
  /** Lets the parent disable its ScrollView while an item is being dragged. */
  onDragStateChange?: (dragging: boolean) => void;
  /** Extra style for the lifted row (e.g. a background so the shadow reads). */
  draggingStyle?: ViewStyle;
};

const LONG_PRESS_MS = 350;
const SHIFT_MS = 150;

/**
 * Plain (non-virtualized) list whose rows can be reordered by long-pressing
 * and dragging up/down. Meant for short lists inside a ScrollView.
 */
export function DraggableList<T>({
  items,
  keyExtractor,
  renderItem,
  onReorder,
  enabled = true,
  onDragStateChange,
  draggingStyle,
}: Props<T>) {
  const offsets = useRef(new Map<string, Animated.Value>()).current;
  const heights = useRef(new Map<string, number>()).current;
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const drag = useRef<{from: number; to: number} | null>(null);

  const keys = useMemo(() => items.map(keyExtractor), [items, keyExtractor]);
  const keysRef = useRef(keys);
  keysRef.current = keys;

  const offsetOf = (key: string) => {
    let value = offsets.get(key);
    if (!value) {
      value = new Animated.Value(0);
      offsets.set(key, value);
    }
    return value;
  };

  // After the parent re-renders in the new order, drop every temporary offset
  // before paint so rows do not jump.
  const order = keys.join('|');
  useLayoutEffect(() => {
    offsets.forEach(value => value.setValue(0));
  }, [order, offsets]);

  const shiftTo = (key: string, toValue: number) => {
    Animated.timing(offsetOf(key), {
      toValue,
      duration: SHIFT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const targetIndex = (from: number, dy: number) => {
    const list = keysRef.current;
    let top = 0;
    const mids: number[] = [];
    list.forEach(key => {
      const h = heights.get(key) ?? 0;
      mids.push(top + h / 2);
      top += h;
    });
    const center = mids[from] + dy;
    let to = 0;
    mids.forEach((mid, j) => {
      if (j !== from && mid < center) {
        to += 1;
      }
    });
    return to;
  };

  const applyShifts = (from: number, to: number) => {
    const list = keysRef.current;
    const draggedH = heights.get(list[from]) ?? 0;
    list.forEach((key, j) => {
      if (j === from) {
        return;
      }
      let shift = 0;
      if (from < to && j > from && j <= to) {
        shift = -draggedH;
      } else if (from > to && j >= to && j < from) {
        shift = draggedH;
      }
      shiftTo(key, shift);
    });
  };

  const finish = () => {
    const state = drag.current;
    drag.current = null;
    setDraggingKey(null);
    onDragStateChange?.(false);
    if (!state) {
      return;
    }
    if (state.to !== state.from) {
      onReorder(state.from, state.to);
    } else {
      keysRef.current.forEach(key => shiftTo(key, 0));
    }
  };

  const makeGesture = (key: string) =>
    Gesture.Pan()
      .enabled(enabled && items.length > 1)
      .activateAfterLongPress(LONG_PRESS_MS)
      .runOnJS(true)
      .onStart(() => {
        const from = keysRef.current.indexOf(key);
        if (from < 0) {
          return;
        }
        drag.current = {from, to: from};
        setDraggingKey(key);
        onDragStateChange?.(true);
      })
      .onUpdate(e => {
        const state = drag.current;
        if (!state) {
          return;
        }
        offsetOf(key).setValue(e.translationY);
        const to = targetIndex(state.from, e.translationY);
        if (to !== state.to) {
          state.to = to;
          applyShifts(state.from, to);
        }
      })
      .onFinalize(finish);

  return (
    <>
      {items.map((item, index) => {
        const key = keys[index];
        const dragging = draggingKey === key;
        return (
          <GestureDetector key={key} gesture={makeGesture(key)}>
            <Animated.View
              collapsable={false}
              onLayout={e => heights.set(key, e.nativeEvent.layout.height)}
              style={[
                {transform: [{translateY: offsetOf(key)}]},
                dragging && [styles.dragging, draggingStyle],
              ]}>
              <View pointerEvents={dragging ? 'none' : 'auto'}>{renderItem(item, index)}</View>
            </Animated.View>
          </GestureDetector>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  dragging: {
    zIndex: 10,
    elevation: 6,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
});

export default DraggableList;
