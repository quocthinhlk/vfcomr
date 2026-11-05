import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useThemedColors} from '../styles/theme';
import {fs, ms, rs, ws} from '../utils/scale';
import AppInput from './AppInput';
import {useTranslation} from '../hooks/useTranslation';
import {COLORS} from '../constants/colors';

const HUE_HEIGHT = 28;
const THUMB = 18;

/** The web's swatches (event types). */
const DEFAULT_SWATCHES = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#FFFFFF',
  '#FF4D4F', '#FF7A45', '#FA8C16', '#F9A825', '#FADB14', '#A0D911', '#52C41A', '#19E7AD',
  '#13C2C2', '#1677FF', '#3E76C8', '#2F54EB', '#722ED1', '#BE19E7', '#EB2F96', '#F759AB',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  height?: number;
  error?: boolean;
  swatches?: string[];
  accessibilityLabel?: string;
}

type Hsv = [number, number, number];

/** "#abc" / "abc" / "#aabbcc" → "#AABBCC", or null. */
export function normalizeHexColor(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map(c => c + c).join('')}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw}`.toUpperCase();
  }
  return null;
}

export function hexToHsv(hex: string): Hsv | null {
  const n = normalizeHexColor(hex);
  if (!n) {
    return null;
  }
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return [h, max === 0 ? 0 : d / max, max];
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];
  if (hue < 60) {
    rgb = [c, x, 0];
  } else if (hue < 120) {
    rgb = [x, c, 0];
  } else if (hue < 180) {
    rgb = [0, c, x];
  } else if (hue < 240) {
    rgb = [0, x, c];
  } else if (hue < 300) {
    rgb = [x, 0, c];
  } else {
    rgb = [c, 0, x];
  }
  return `#${rgb
    .map(n => Math.round((n + m) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Drag handler over a box. The position comes from pageX/pageY minus the box's
 * page offset (taken at touch start): locationX is relative to whichever child
 * is touched (the thumb), which made the colour jump, mostly on Android.
 */
function useDrag(onMove: (x: number, y: number) => void, onActive: (active: boolean) => void) {
  const origin = useRef({x: 0, y: 0});
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const activeRef = useRef(onActive);
  activeRef.current = onActive;
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the drag when the finger moves vertically (no ScrollView takeover).
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const {pageX, pageY, locationX, locationY} = e.nativeEvent;
          origin.current = {x: pageX - locationX, y: pageY - locationY};
          activeRef.current(true);
          moveRef.current(locationX, locationY);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const {pageX, pageY} = e.nativeEvent;
          moveRef.current(pageX - origin.current.x, pageY - origin.current.y);
        },
        onPanResponderRelease: () => activeRef.current(false),
        onPanResponderTerminate: () => activeRef.current(false),
      }),
    [],
  );
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  height,
  error = false,
  swatches = DEFAULT_SWATCHES,
  accessibilityLabel,
}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  // Edits stay in a draft until Apply; closing (✕, Cancel, Back) keeps the
  // saved colour. Before, dragging changed the field at once and ✕ could not undo it.
  const [draft, setDraft] = useState<Hsv>([0, 1, 1]);
  const [hexText, setHexText] = useState('');
  const [planeWidth, setPlaneWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const savedHex = normalizeHexColor(value);
  const planeHeight = Math.round(Math.min(Math.max(planeWidth * 0.55, 120), 220));

  const openSheet = () => {
    const hsv = (savedHex && hexToHsv(savedHex)) || [0, 1, 1];
    setDraft(hsv as Hsv);
    setHexText(savedHex ?? '');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setDragging(false);
    }
  }, [open]);

  const setFromHsv = (hsv: Hsv) => {
    setDraft(hsv);
    setHexText(hsvToHex(...hsv));
  };

  const plane = useDrag(
    (x, y) => {
      if (!planeWidth) {
        return;
      }
      const [h] = draftRef.current; // latest hue, not the one at first render
      setFromHsv([h, clamp(x / planeWidth, 0, 1), clamp(1 - y / planeHeight, 0, 1)]);
    },
    setDragging,
  );
  const hue = useDrag(
    x => {
      if (!planeWidth) {
        return;
      }
      const [, s, v] = draftRef.current;
      setFromHsv([clamp(x / planeWidth, 0, 1) * 359.9, s, v]);
    },
    setDragging,
  );

  const onHexChange = (text: string) => {
    setHexText(text);
    const hsv = hexToHsv(text);
    if (hsv) {
      setDraft(hsv);
    }
  };

  const draftHex = hsvToHex(...draft);
  const hexValid = !!normalizeHexColor(hexText);
  const apply = () => {
    onChange(normalizeHexColor(hexText) ?? draftHex);
    setOpen(false);
  };

  const onPlaneLayout = (e: LayoutChangeEvent) =>
    setPlaneWidth(Math.round(e.nativeEvent.layout.width));
  const [r, g, b] = [1, 3, 5].map(i => parseInt(draftHex.slice(i, i + 2), 16));

  return (
    <View>
      {label ? (
        <Text style={[styles.label, {color: C.textSecondary}]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        style={[
          styles.field,
          {backgroundColor: C.inputBg, borderColor: error ? '#db2d2d' : C.inputBorder},
          height ? {height, paddingVertical: 0} : null,
        ]}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel || label || t('selectColor') || 'Select color'}${
          value ? `, ${value}` : ''
        }`}>
        <View
          style={[
            styles.fieldSwatch,
            {backgroundColor: savedHex ?? 'transparent', borderColor: C.inputBorder},
          ]}>
          {!savedHex && value ? <Text style={styles.badSwatch}>?</Text> : null}
        </View>
        <Text
          style={[styles.fieldText, {color: value ? C.textPrimary : C.textSecondary}]}
          numberOfLines={1}>
          {value || t('selectColor') || 'Select color'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, {backgroundColor: C.overlay}]}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel={t('cancel') || 'Cancel'}
          />
          <View style={[styles.sheet, {backgroundColor: C.surface}]}>
            <View style={[styles.header, {borderBottomColor: C.surfaceBorder}]}>
              <Text style={[styles.title, {color: C.textPrimary}]}>
                {label || t('selectColor') || 'Select color'}
              </Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('close') || 'Close'}>
                <Text style={[styles.close, {color: C.textPrimary}]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrolls on small phones: the old sheet had no scroll and the
                Apply button fell off the bottom of 720×1280 screens. */}
            <ScrollView
              scrollEnabled={!dragging}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}>
              <View style={styles.hexRow}>
                <View
                  style={[styles.preview, {backgroundColor: draftHex, borderColor: C.inputBorder}]}
                />
                <View style={styles.hexInput}>
                  <AppInput
                    value={hexText}
                    onChangeText={onHexChange}
                    placeholder="#000000"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={7}
                    error={!!hexText && !hexValid}
                    accessibilityLabel="HEX"
                  />
                </View>
                <Text style={[styles.rgb, {color: C.textSecondary}]}>
                  RGB {r}, {g}, {b}
                </Text>
              </View>

              <View style={styles.swatches}>
                {swatches.map(sw => {
                  const selected = draftHex === sw;
                  return (
                    <TouchableOpacity
                      key={sw}
                      onPress={() => {
                        const hsv = hexToHsv(sw);
                        if (hsv) {
                          setDraft(hsv);
                          setHexText(sw);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={sw}
                      accessibilityState={{selected}}
                      style={[
                        styles.swatch,
                        {backgroundColor: sw, borderColor: selected ? C.textPrimary : C.inputBorder},
                        selected && styles.swatchSelected,
                      ]}
                    />
                  );
                })}
              </View>

              <View
                style={[styles.plane, {height: planeHeight, borderColor: C.inputBorder}]}
                onLayout={onPlaneLayout}
                {...plane.panHandlers}>
                {planeWidth > 0 ? (
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <Svg width={planeWidth} height={planeHeight}>
                      <Defs>
                        <LinearGradient id="cpSat" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0" stopColor="#FFFFFF" />
                          <Stop offset="1" stopColor={hsvToHex(draft[0], 1, 1)} />
                        </LinearGradient>
                        <LinearGradient id="cpVal" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                          <Stop offset="1" stopColor="#000000" stopOpacity="1" />
                        </LinearGradient>
                      </Defs>
                      <Rect width={planeWidth} height={planeHeight} fill="url(#cpSat)" />
                      <Rect width={planeWidth} height={planeHeight} fill="url(#cpVal)" />
                    </Svg>
                    <View
                      style={[
                        styles.thumb,
                        {
                          left: draft[1] * planeWidth - THUMB / 2,
                          top: (1 - draft[2]) * planeHeight - THUMB / 2,
                          backgroundColor: draftHex,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>

              <View
                style={[styles.hue, {borderColor: C.inputBorder}]}
                accessibilityLabel="Hue"
                {...hue.panHandlers}>
                {planeWidth > 0 ? (
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <Svg width={planeWidth} height={HUE_HEIGHT}>
                      <Defs>
                        <LinearGradient id="cpHue" x1="0" y1="0" x2="1" y2="0">
                          {['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'].map(
                            (c, i) => (
                              <Stop key={i} offset={String(i / 6)} stopColor={c} />
                            ),
                          )}
                        </LinearGradient>
                      </Defs>
                      <Rect width={planeWidth} height={HUE_HEIGHT} fill="url(#cpHue)" />
                    </Svg>
                    <View
                      style={[styles.hueThumb, {left: (draft[0] / 360) * planeWidth - 4}]}
                    />
                  </View>
                ) : null}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, {borderColor: C.inputBorder}]}
                  onPress={() => setOpen(false)}
                  accessibilityRole="button">
                  <Text style={[styles.buttonText, {color: C.textPrimary}]}>
                    {t('cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.applyButton,
                    {opacity: hexText && !hexValid ? 0.5 : 1},
                  ]}
                  disabled={!!hexText && !hexValid}
                  onPress={apply}
                  accessibilityRole="button">
                  <Text style={[styles.buttonText, styles.applyText]}>{t('apply') || 'Apply'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    marginBottom: ms(4),
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rs(3),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    gap: ms(10),
  },
  fieldSwatch: {
    width: ws(26),
    height: ws(26),
    borderRadius: rs(4),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badSwatch: {
    fontSize: fs(12),
    color: '#db2d2d',
    fontWeight: '700',
  },
  fieldText: {
    flex: 1,
    fontSize: fs(14),
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
    flex: 1,
  },
  close: {
    fontSize: fs(20),
    fontWeight: '600',
  },
  body: {
    padding: ms(16),
    paddingBottom: ms(28),
    gap: ms(14),
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
  },
  preview: {
    width: ws(44),
    height: ws(44),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  hexInput: {
    width: ws(120),
  },
  rgb: {
    flex: 1,
    fontSize: fs(12),
    textAlign: 'right',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
  },
  swatch: {
    width: ws(30),
    height: ws(30),
    borderRadius: rs(6),
    borderWidth: 1,
  },
  swatchSelected: {
    borderWidth: 3,
  },
  plane: {
    width: '100%',
    borderRadius: rs(8),
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
  },
  hue: {
    width: '100%',
    height: HUE_HEIGHT,
    borderRadius: rs(6),
    borderWidth: 1,
    overflow: 'hidden',
  },
  hueThumb: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: HUE_HEIGHT,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(4),
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: ms(12),
    borderRadius: rs(6),
    borderWidth: 1,
  },
  applyButton: {
    backgroundColor: COLORS.mainColor,
    borderColor: COLORS.mainColor,
  },
  buttonText: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  applyText: {
    color: '#FFFFFF',
  },
});

export default ColorPicker;
