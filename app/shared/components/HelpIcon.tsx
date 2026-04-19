import React, {useState, useRef, useCallback} from 'react';
import {
  Pressable,
  View,
  Text,
  ViewStyle,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {useThemedColors} from '../styles/theme';
import {fs, hs, ms, rs} from '../utils/scale';

type Props = {
  onPress?: () => void;
  title?: string;
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
  size = 15,
  marginLeft = 6,
  offsetY = 0,
  containerStyle,
  hitSlopSize = 12,
}: Props) {
  const C = useThemedColors();
  const [visible, setVisible] = useState(false);
  const iconColor = C.textSecondary || '#8a8f98';

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  // Button press scale
  const btnScale = useRef(new Animated.Value(1)).current;

  const hasPopupContent = !!title && !!message;

  const openPopup = useCallback(() => {
    setVisible(true);
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 18,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const closePopup = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [scaleAnim, opacityAnim]);

  const handlePress = () => {
    if (hasPopupContent) {
      openPopup();
    } else if (onPress) {
      onPress();
    }
  };

  const onPressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.82,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={{top: hitSlopSize, bottom: hitSlopSize, left: hitSlopSize, right: hitSlopSize}}
        style={[
          {marginLeft: ms(marginLeft), transform: [{translateY: ms(offsetY)}]},
          containerStyle,
        ]}
      >
        <Animated.View
          style={[
            helpStyles.iconCircle,
            {
              backgroundColor: 'transparent',
              transform: [{scale: btnScale}],
            },
          ]}
        >
          <Text style={[helpStyles.iconText, {color: iconColor, fontSize: fs(size)}]}>
            ⓘ
          </Text>
        </Animated.View>
      </Pressable>

      {hasPopupContent && (
        <Modal
          visible={visible}
          transparent
          animationType="none"
          onRequestClose={closePopup}
          statusBarTranslucent
        >
          <Pressable style={helpStyles.backdrop} onPress={closePopup}>
            <Animated.View
              style={[
                helpStyles.card,
                {
                  backgroundColor: C.surface,
                  transform: [{scale: scaleAnim}],
                  opacity: opacityAnim,
                },
              ]}
            >
              <Pressable onPress={() => {}}>
                {/* Header */}
                <View style={[helpStyles.header, {borderBottomColor: C.border}]}>
                  <Text
                    style={[helpStyles.title, {color: C.textPrimary}]}
                    numberOfLines={2}
                  >
                    {title}
                  </Text>
                  <TouchableOpacity
                    onPress={closePopup}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    style={helpStyles.closeBtn}
                  >
                    <Text style={[helpStyles.closeText, {color: C.textSecondary}]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={helpStyles.bodyWrap}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <Text style={[helpStyles.body, {color: C.textSecondary}]}>
                      {message}
                    </Text>
                  </ScrollView>
                </View>

              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const helpStyles = StyleSheet.create({
  iconCircle: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,20,40,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(24),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: rs(14),
    paddingHorizontal: ms(18),
    paddingTop: ms(16),
    paddingBottom: ms(12),
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: rs(20),
    shadowOffset: {width: 0, height: hs(8)},
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: ms(10),
    marginBottom: ms(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '700',
    paddingRight: ms(8),
  },
  closeBtn: {
    width: ms(28),
    height: ms(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: fs(16),
    fontWeight: '500',
  },
  bodyWrap: {
    maxHeight: hs(200),
  },
  body: {
    fontSize: fs(13),
    lineHeight: fs(20),
  },
});
