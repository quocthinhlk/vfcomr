import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';
import {useThemedColors} from '../styles/theme';
import {fs, ms, rs, ws, hs} from '../utils/scale';
import AppInput from './AppInput';
import {useTranslation} from '../hooks/useTranslation';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const GRADIENT_SIZE = SCREEN_WIDTH * 0.85;
const HUE_SLIDER_HEIGHT = 30;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  height?: number;
  error?: boolean;
}

// Helper functions for color conversion
const hexToHsv = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  
  return [h, s, v];
};

const hsvToHex = (h: number, s: number, v: number): string => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};

const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const hex = hsvToHex(h, s, v);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  height,
  error = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [customHex, setCustomHex] = useState(value || '');
  const C = useThemedColors();
  const {t} = useTranslation();
  
  // Initialize HSV from hex value
  const getInitialHsv = (hex: string): [number, number, number] => {
    if (!hex || hex === '') return [0, 1, 1];
    try {
      return hexToHsv(hex);
    } catch {
      return [0, 1, 1];
    }
  };
  
  const [hsv, setHsv] = useState<[number, number, number]>(getInitialHsv(value || ''));
  
  useEffect(() => {
    if (value && value !== '') {
      setHsv(getInitialHsv(value));
      setCustomHex(value);
    }
  }, [value]);

  const updateColor = (newHsv: [number, number, number]) => {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv[0], newHsv[1], newHsv[2]);
    setCustomHex(hex);
    onChange(hex);
  };

  const handleGradientPress = (event: any, gradientSize: number) => {
    const {locationX, locationY} = event.nativeEvent;
    const saturation = Math.max(0, Math.min(1, locationX / gradientSize));
    const value = Math.max(0, Math.min(1, 1 - locationY / gradientSize));
    updateColor([hsv[0], saturation, value]);
  };

  const handleHuePress = (event: any, sliderWidth: number) => {
    const {locationX} = event.nativeEvent;
    const hue = Math.max(0, Math.min(360, (locationX / sliderWidth) * 360));
    updateColor([hue, hsv[1], hsv[2]]);
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(hex)) {
      const newHsv = hexToHsv(hex);
      setHsv(newHsv);
      onChange(hex);
    }
  };

  const handleApply = () => {
    if (customHex && customHex !== '') {
      onChange(customHex);
      setModalVisible(false);
    }
  };

  const displayValue = value || '';
  const previewColor = value || '#FFFFFF';
  const currentHueColor = hsvToHex(hsv[0], 1, 1);
  const [r, g, b] = hsvToRgb(hsv[0], hsv[1], hsv[2]);

  // PanResponder for gradient area
  const gradientPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleGradientPress(evt, GRADIENT_SIZE);
      },
      onPanResponderMove: (evt) => {
        handleGradientPress(evt, GRADIENT_SIZE);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // PanResponder for hue slider
  const huePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleHuePress(evt, GRADIENT_SIZE);
      },
      onPanResponderMove: (evt) => {
        handleHuePress(evt, GRADIENT_SIZE);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  return (
    <View>
      {label && (
        <Text style={[styles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.colorButton,
          {borderColor: error ? '#db2d2d' : C.inputBorder},
          height ? {height, paddingVertical: 0} : {},
        ]}
        onPress={() => {
          setCustomHex(value || '#FFFFFF');
          setModalVisible(true);
        }}>
        <View style={[styles.colorPreview, {backgroundColor: previewColor, borderColor: C.inputBorder}]} />
        <Text style={[styles.colorText, {color: C.textPrimary}]}>
          {displayValue}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, {backgroundColor: C.overlay}]}>
          <View style={[styles.modalContent, {backgroundColor: C.surface}]}>
            <View style={[styles.modalHeader, {borderBottomColor: C.surfaceBorder}]}>
              <Text style={[styles.modalTitle, {color: C.textPrimary}]}>
              {t('selectColor') || 'Select color'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}>
                <Text style={[styles.closeButtonText, {color: C.textPrimary}]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.colorPickerContainer}>
              {/* Color Preview and Gradient Area */}
              <View style={styles.mainColorArea}>
                <View style={[styles.colorPreviewBox, {backgroundColor: previewColor, borderColor: C.inputBorder}]} />
                
                {/* Saturation/Lightness Gradient */}
                <View 
                  style={[styles.gradientContainer, {borderColor: C.inputBorder}]}
                  {...gradientPanResponder.panHandlers}>
                  <View style={StyleSheet.absoluteFill}>
                    <Svg width={GRADIENT_SIZE} height={GRADIENT_SIZE}>
                      <Defs>
                        {/* Horizontal gradient (saturation: white to hue) */}
                        <LinearGradient id={`satGradient-${hsv[0]}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#ffffff" />
                          <Stop offset="100%" stopColor={currentHueColor} />
                        </LinearGradient>
                      </Defs>
                      {/* Base saturation gradient (horizontal) */}
                      <Rect width={GRADIENT_SIZE} height={GRADIENT_SIZE} fill={`url(#satGradient-${hsv[0]})`} />
                    </Svg>
                  </View>
                  
                  {/* Vertical gradient overlay for lightness (black overlay) */}
                  <View style={StyleSheet.absoluteFill}>
                    <Svg width={GRADIENT_SIZE} height={GRADIENT_SIZE}>
                      <Defs>
                        <LinearGradient id={`lightGradient-${hsv[0]}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="rgba(0,0,0,0)" stopOpacity="0" />
                          <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                        </LinearGradient>
                      </Defs>
                      <Rect width={GRADIENT_SIZE} height={GRADIENT_SIZE} fill={`url(#lightGradient-${hsv[0]})`} />
                    </Svg>
                  </View>
                  
                  {/* Indicator */}
                  <View
                    style={[
                      styles.gradientIndicator,
                      {
                        left: hsv[1] * GRADIENT_SIZE - 8,
                        top: (1 - hsv[2]) * GRADIENT_SIZE - 8,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Hue Slider */}
              <View style={[styles.hueSliderContainer, {borderColor: C.inputBorder}]} {...huePanResponder.panHandlers}>
                <Svg width={GRADIENT_SIZE} height={HUE_SLIDER_HEIGHT}>
                  <Defs>
                    <LinearGradient id="hueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#ff0000" />
                      <Stop offset="16.67%" stopColor="#ffff00" />
                      <Stop offset="33.33%" stopColor="#00ff00" />
                      <Stop offset="50%" stopColor="#00ffff" />
                      <Stop offset="66.67%" stopColor="#0000ff" />
                      <Stop offset="83.33%" stopColor="#ff00ff" />
                      <Stop offset="100%" stopColor="#ff0000" />
                    </LinearGradient>
                  </Defs>
                  <Rect width={GRADIENT_SIZE} height={HUE_SLIDER_HEIGHT} fill="url(#hueGradient)" rx={4} />
                </Svg>
                <View
                  style={[
                    styles.hueIndicator,
                    {
                      left: (hsv[0] / 360) * GRADIENT_SIZE - 8,
                    },
                  ]}
                />
              </View>

              {/* Color Values */}
              <View style={styles.colorValuesContainer}>
                <View style={styles.colorValueRow}>
                  <Text style={[styles.colorValueLabel, {color: C.textSecondary}]}>HEX</Text>
                  <View style={styles.colorValueInputRow}>
                    <AppInput
                      value={customHex}
                      onChangeText={handleCustomHexChange}
                      placeholder="#000000"
                      style={styles.colorValueInput}
                    />
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => {
                        // Copy to clipboard - would need Clipboard API
                      }}>
                      <Text style={[styles.copyButtonText, {color: C.textPrimary}]}>📋</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.colorValueRow}>
                  <Text style={[styles.colorValueLabel, {color: C.textSecondary}]}>RGB</Text>
                  <Text style={[styles.colorValueText, {color: C.textPrimary}]}>
                    {r}, {g}, {b}
                  </Text>
                </View>

                <View style={styles.colorValueRow}>
                  <Text style={[styles.colorValueLabel, {color: C.textSecondary}]}>HSV</Text>
                  <Text style={[styles.colorValueText, {color: C.textPrimary}]}>
                    {Math.round(hsv[0])}°, {Math.round(hsv[1] * 100)}%, {Math.round(hsv[2] * 100)}%
                  </Text>
                </View>

                <View style={styles.colorValueRow}>
                  <Text style={[styles.colorValueLabel, {color: C.textSecondary}]}>HSL</Text>
                  <Text style={[styles.colorValueText, {color: C.textPrimary}]}>
                    {Math.round(hsv[0])}°, {Math.round(hsv[1] * 100)}%, {Math.round(hsv[2] * 100)}%
                  </Text>
                </View>
              </View>

              {/* Apply Button */}
              <TouchableOpacity
                style={[styles.applyButton, {backgroundColor: C.textPrimary}]}
                onPress={handleApply}>
                <Text style={[styles.applyButtonText, {color: C.background}]}>
                {t('apply') || 'Apply'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rs(3),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    gap: ms(8),
  },
  colorPreview: {
    width: ws(30),
    height: hs(30),
    borderRadius: rs(4),
    borderWidth: 1,
  },
  colorText: {
    fontSize: fs(14),
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    paddingTop: ms(20),
    paddingBottom: ms(40),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingBottom: ms(16),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '700',
  },
  closeButton: {
    padding: ms(8),
  },
  closeButtonText: {
    fontSize: fs(24),
    fontWeight: '600',
  },
  colorPickerContainer: {
    paddingHorizontal: ms(20),
    paddingTop: ms(20),
  },
  mainColorArea: {
    flexDirection: 'row',
    marginBottom: ms(20),
    gap: ms(16),
  },
  colorPreviewBox: {
    width: ws(80),
    height: ws(80),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  gradientContainer: {
    flex: 1,
    height: GRADIENT_SIZE,
    borderRadius: rs(8),
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  gradientIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  hueSliderContainer: {
    marginBottom: ms(20),
    borderRadius: rs(8),
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    height: HUE_SLIDER_HEIGHT,
  },
  hueIndicator: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: HUE_SLIDER_HEIGHT + 8,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  colorValuesContainer: {
    marginBottom: ms(20),
    gap: ms(12),
  },
  colorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
  },
  colorValueLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    width: ws(50),
  },
  colorValueInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  colorValueInput: {
    flex: 1,
    fontSize: fs(14),
  },
  copyButton: {
    padding: ms(8),
  },
  copyButtonText: {
    fontSize: fs(18),
  },
  colorValueText: {
    flex: 1,
    fontSize: fs(14),
  },
  customColorSection: {
    paddingHorizontal: ms(20),
    paddingTop: ms(16),
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  customColorLabel: {
    fontSize: fs(14),
    marginBottom: ms(8),
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  colorPreviewSmall: {
    width: ws(40),
    height: hs(40),
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customColorInputContainer: {
    flex: 1,
  },
  customColorInput: {
    fontSize: fs(14),
  },
  applyButton: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
    borderRadius: rs(6),
  },
  applyButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
});

export default ColorPicker;

