import React, {useEffect, useRef} from 'react';
import {
  Modal,
  View,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../styles/theme';
import {fs, ms, rs, hs} from '../utils/scale';

export type ActionItem = {
  label: string;
  onPress: () => void;
  type?: 'default' | 'danger';
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  actions: ActionItem[];
  onRequestClose: () => void;
};

export default function ActionSheetModal({
  visible,
  title,
  actions,
  onRequestClose,
}: Props) {
  const C = useThemedColors();
  const sheetTranslateY = useRef(new Animated.Value(hs(80))).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e: any, g: PanResponderGestureState) =>
        Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        dragY.setOffset(0);
      },
      onPanResponderMove: (_e: any, g: PanResponderGestureState) => {
        let dy = g.dy;
        const limit = -hs(20);
        if (dy < limit) {
          dy = limit;
        }
        dragY.setValue(dy);
      },
      onPanResponderRelease: (_e: any, g: PanResponderGestureState) => {
        const threshold = hs(120);
        if (g.dy > threshold) {
          // close sheet
          dragY.flattenOffset();
          Animated.timing(dragY, {
            toValue: hs(300),
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            onRequestClose();
          });
        } else {
          // snap back
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 70,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 70,
        }).start();
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(hs(120));
      backdropOpacity.setValue(0);
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 70,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // instant close behavior is handled by parent via visible=false and animationType="none"
      sheetTranslateY.setValue(hs(120));
      backdropOpacity.setValue(0);
      dragY.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onRequestClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onRequestClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {backgroundColor: C.overlay, opacity: backdropOpacity},
            ]}
          />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {backgroundColor: C.surface, borderColor: C.border},
            {transform: [{translateY: Animated.add(sheetTranslateY, dragY)}]},
          ]}>
          {/* <View {...panResponder.panHandlers} style={styles.dragArea}> */}
            {/* <View style={styles.sheetHandle} /> */}
          {/* </View> */}
          {!!title && (
            <Text
              style={[styles.title, {color: C.textPrimary}]}
              numberOfLines={1}>
              {title}
            </Text>
          )}
          {actions.map((a, idx) => (
            <TouchableOpacity
              key={`${a.label}-${idx}`}
              style={[
                styles.item,
                {borderTopColor: C.border},
                a.disabled && {opacity: 0.5},
              ]}
              onPress={() => {
                if (!a.disabled) {
                  a.onPress();
                }
              }}
              disabled={!!a.disabled}
            >
              <Text
                style={[
                  styles.itemText,
                  {color: a.type === 'danger' ? '#db2d2d' : C.textPrimary},
                ]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderTopLeftRadius: rs(12),
    borderTopRightRadius: rs(12),
    borderWidth: 1,
    paddingBottom: ms(10),
    paddingTop: ms(6),
    marginHorizontal: ms(8),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: rs(12),
    shadowOffset: {width: 0, height: -hs(2)},
    elevation: 8,
  },
  // dragArea: {
  //   paddingVertical: 8,
  // },
  // sheetHandle: {
  //   alignSelf: 'center', width: 60, height: 4, borderRadius: 2, backgroundColor: '#999', opacity: 0.5, marginBottom: 8,
  // },
  title: {
    fontSize: fs(14),
    fontWeight: '700',
    paddingHorizontal: ms(16),
    paddingTop: ms(6),
    paddingBottom: ms(10),
  },
  item: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
});


