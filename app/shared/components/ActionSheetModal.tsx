import React, { useEffect, useRef } from 'react';
import { Modal, View, TouchableWithoutFeedback, StyleSheet, Animated, Easing, TouchableOpacity, PanResponder, PanResponderGestureState } from 'react-native';
import { Text } from '@ui-kitten/components';
import { useThemedColors } from '../styles/theme';

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

export default function ActionSheetModal({ visible, title, actions, onRequestClose }: Props) {
  const C = useThemedColors();
  const sheetTranslateY = useRef(new Animated.Value(80)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e: any, g: PanResponderGestureState) => Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        dragY.setOffset(0);
      },
      onPanResponderMove: (_e: any, g: PanResponderGestureState) => {
        let dy = g.dy;
        if (dy < -20) dy = -20;
        dragY.setValue(dy);
      },
      onPanResponderRelease: (_e: any, g: PanResponderGestureState) => {
        const threshold = 120;
        if (g.dy > threshold) {
          // close sheet
          dragY.flattenOffset();
          Animated.timing(dragY, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => {
            dragY.setValue(0);
            onRequestClose();
          });
        } else {
          // snap back
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }).start();
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(120);
      backdropOpacity.setValue(0);
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      // instant close behavior is handled by parent via visible=false and animationType="none"
      sheetTranslateY.setValue(120);
      backdropOpacity.setValue(0);
      dragY.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onRequestClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onRequestClose}>
          <Animated.View style={[styles.backdrop, { backgroundColor: C.overlay, opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { backgroundColor: C.surface, borderColor: C.border }, { transform: [{ translateY: Animated.add(sheetTranslateY, dragY) }] }]}> 
          {/* <View {...panResponder.panHandlers} style={styles.dragArea}> */}
            {/* <View style={styles.sheetHandle} /> */}
          {/* </View> */}
          {!!title && (
            <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>{title}</Text>
          )}
          {actions.map((a, idx) => (
            <TouchableOpacity
              key={`${a.label}-${idx}`}
              style={[styles.item, { borderTopColor: C.border }, a.disabled && { opacity: 0.5 }]}
              onPress={() => { if (!a.disabled) a.onPress(); }}
              disabled={!!a.disabled}
            >
              <Text style={[styles.itemText, { color: a.type === 'danger' ? '#db2d2d' : C.textPrimary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 10,
    paddingTop: 6,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  // dragArea: {
  //   paddingVertical: 8,
  // },
  // sheetHandle: {
  //   alignSelf: 'center', width: 60, height: 4, borderRadius: 2, backgroundColor: '#999', opacity: 0.5, marginBottom: 8,
  // },
  title: {
    fontSize: 17, fontWeight: '700', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
  },
  item: {
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 16, fontWeight: '600',
  },
});


