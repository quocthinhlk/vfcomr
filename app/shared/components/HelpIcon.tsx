import React, {useState} from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  ViewStyle,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {COLORS} from '../constants/colors';
import {useThemedColors} from '../styles/theme';
import {fs, hs, ms, rs} from '../utils/scale';

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
  hitSlopSize?: number;
};

export default function HelpIcon({
  onPress,
  title,
  message,
  size = 13,
  color = COLORS.mainColor,
  marginLeft = 10,
  offsetY = -2,
  backgroundColor = 'transparent',
  containerStyle,
  hitSlopSize = 0,
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
        hitSlop={
          hitSlopSize > 0
            ? {top: hitSlopSize, bottom: hitSlopSize, left: hitSlopSize, right: hitSlopSize}
            : undefined
        }
        style={[
          {marginLeft: ms(marginLeft), transform: [{translateY: ms(offsetY)}]},
          containerStyle,
        ]}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size,
            borderWidth: 0,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color,
              fontWeight: '700',
              fontSize: Math.max(fs(10), Math.round(size * 0.55)),
            }}
          >
            ⓘ
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
            onPress={() => setVisible(false)}>
            <TouchableOpacity
              activeOpacity={1}
              style={[helpIconStyles.card, { backgroundColor: C.surface }]}
              onPress={() => {}}
            >
              <View style={helpIconStyles.header}>
                <Text
                  style={[helpIconStyles.title, {color: C.textPrimary}]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={helpIconStyles.closeButton}
                >
                  <Text
                    style={[helpIconStyles.closeText, {color: C.textPrimary}]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={helpIconStyles.bodyContainer}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <Text
                    style={[helpIconStyles.body, {color: C.textSecondary}]}>
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
    paddingHorizontal: ms(20),
    paddingVertical: ms(24),
  },
  card: {
    width: '80%',
    maxWidth: 360,
    maxHeight: '70%',
    paddingHorizontal: ms(18),
    paddingVertical: ms(14),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: rs(16),
    shadowOffset: {width: 0, height: hs(8)},
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: ms(6),
    marginBottom: ms(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    flex: 1,
    fontSize: fs(12),
    fontWeight: '600',
    paddingRight: ms(8),
  },
  closeButton: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(2),
  },
  closeText: {
    fontSize: fs(14),
  },
  bodyContainer: {
    maxHeight: hs(220),
    paddingTop: ms(0),
  },
  body: {
    fontSize: fs(12),
    lineHeight: fs(18),
    textAlign: 'left',
  },
});


