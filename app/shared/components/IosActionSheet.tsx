import React from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import Modal from 'react-native-modal';
import {Text} from '@ui-kitten/components';
import {fs, ms, rs} from '../utils/scale';

export type IosActionSheetItem = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

type Props = {
  visible: boolean;
  items: IosActionSheetItem[];
  onClose: () => void;
  cancelLabel?: string;
};

export default function IosActionSheet({
  visible,
  items,
  onClose,
  cancelLabel = 'Cancel',
}: Props) {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.3}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      coverScreen
      style={styles.modal}
      statusBarTranslucent
      propagateSwipe
    >
      <View style={styles.root} pointerEvents="box-none">
        <View style={styles.group}>
          {items.map((item, idx) => {
            const isDanger = item.variant === 'danger';
            return (
              <Pressable
                key={`${item.label}-${idx}`}
                onPress={() => {
                  if (item.disabled) return;
                  onClose();
                  requestAnimationFrame(() => item.onPress());
                }}
                style={({pressed}) => [
                  styles.item,
                  idx > 0 && styles.itemDivider,
                  item.disabled && styles.itemDisabled,
                  pressed && !item.disabled && styles.itemPressed,
                ]}
              >
                <Text
                  style={[
                    styles.itemText,
                    isDanger ? styles.itemDanger : styles.itemDefault,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.cancelWrap}>
          <Pressable
            onPress={onClose}
            style={({pressed}) => [styles.cancel, pressed && styles.itemPressed]}
          >
            <Text style={[styles.itemText, styles.itemDefault, styles.cancelText]}>
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  root: {
    paddingHorizontal: ms(12),
    paddingBottom: Platform.OS === 'ios' ? ms(18) : ms(12),
  },
  group: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: rs(14),
    overflow: 'hidden',
  },
  item: {
    paddingVertical: ms(14),
    paddingHorizontal: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
  },
  itemText: {
    fontSize: fs(18),
    fontWeight: '500',
  },
  itemDefault: {
    color: '#007AFF',
  },
  itemDanger: {
    color: '#FF3B30',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemPressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cancelWrap: {
    marginTop: ms(10),
  },
  cancel: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: rs(14),
    paddingVertical: ms(14),
    paddingHorizontal: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontWeight: '600',
  },
});

