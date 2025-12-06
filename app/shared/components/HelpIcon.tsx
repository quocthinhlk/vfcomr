import React, { useState } from 'react';
import { TouchableOpacity, View, Text, ViewStyle, Modal, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../shared/constants/colors';
import { useThemedColors } from '../styles/theme';

type Props = {
  onPress?: () => void;
  /**
   * Optional title to show in a built-in help popup.
   * If provided together with `message`, HelpIcon will show a modal instead of using Alert.
   */
  title?: string;
  /**
   * Optional body text to show in the built-in help popup.
   */
  message?: string;
  size?: number;
  color?: string;
  marginLeft?: number;
  offsetY?: number;
  backgroundColor?: string;
  containerStyle?: ViewStyle;
};

export default function HelpIcon({
  onPress,
  title,
  message,
  size = 16,
  color = COLORS.mainColor,
  marginLeft = 10,
  offsetY = 0,
  backgroundColor = 'rgba(53,99,233,0.12)',
  containerStyle,
}: Props) {
  const C = useThemedColors();
  const [visible, setVisible] = useState(false);

  const hasPopupContent = !!title && !!message;

  const handlePress = () => {
    if (hasPopupContent) {
      setVisible(true);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={[{ marginLeft, transform: [{ translateY: offsetY }] }, containerStyle]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size,
            borderWidth: 1,
            borderColor: color,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color,
              fontWeight: '700',
              fontSize: Math.max(10, Math.round(size * 0.55)),
            }}
          >
            i
          </Text>
        </View>
      </TouchableOpacity>

      {hasPopupContent && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={helpIconStyles.backdrop}
            onPress={() => setVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[helpIconStyles.card, { backgroundColor: C.surface }]}
              onPress={() => {}}
            >
              <View style={helpIconStyles.header}>
                <Text
                  style={[helpIconStyles.title, { color: C.textPrimary }]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={helpIconStyles.closeButton}
                >
                  <Text style={[helpIconStyles.closeText, { color: C.textPrimary }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={helpIconStyles.bodyContainer}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <Text style={[helpIconStyles.body, { color: C.textSecondary }]}>
                    {message}
                  </Text>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const helpIconStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '80%',
    maxWidth: 360,
    maxHeight: '70%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    paddingRight: 8,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  closeText: {
    fontSize: 14,
  },
  bodyContainer: {
    maxHeight: 220,
    paddingTop: 2,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'left',
  },
});


