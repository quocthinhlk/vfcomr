import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useThemedColors} from '../styles/theme';
import {fs, ms, rs, ws, hs} from '../utils/scale';
import AppInput from './AppInput';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const COMMON_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#800000',
  '#008000', '#000080', '#808000', '#800080', '#008080',
  '#C0C0C0', '#FF8080', '#80FF80', '#8080FF', '#FFFF80',
  '#FF80FF', '#80FFFF', '#C0504D', '#E6B8B7', '#D9D9D9',
  '#0000FF', '#ADD8E6', '#FFA500', '#FFC0CB', '#A52A2A',
  '#FFD700', '#4B0082', '#32CD32', '#FF1493', '#00CED1',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [customHex, setCustomHex] = useState(value || '#FFFFFF');
  const C = useThemedColors();

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomHex(color);
    setModalVisible(false);
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    // Validate hex color format
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(hex)) {
      onChange(hex);
    }
  };

  const handleApplyCustomHex = () => {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(customHex)) {
      onChange(customHex);
      setModalVisible(false);
    }
  };

  return (
    <View>
      {label && (
        <Text style={[styles.label, {color: C.textSecondary, marginBottom: ms(4)}]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.colorButton, {borderColor: C.inputBorder}]}
        onPress={() => {
          setCustomHex(value || '#FFFFFF');
          setModalVisible(true);
        }}>
        <View style={[styles.colorPreview, {backgroundColor: value || '#FFFFFF'}]} />
        <Text style={[styles.colorText, {color: C.textPrimary}]}>
          {value || '#FFFFFF'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: C.surface}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: C.textPrimary}]}>
                Select Color
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}>
                <Text style={[styles.closeButtonText, {color: C.textPrimary}]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.colorGridContainer}>
              <View style={styles.colorGrid}>
                {COMMON_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorItem,
                      {backgroundColor: color},
                      value === color && styles.selectedColor,
                    ]}
                    onPress={() => handleColorSelect(color)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.customColorSection}>
              <Text style={[styles.customColorLabel, {color: C.textSecondary}]}>
                Or enter hex color:
              </Text>
              <View style={styles.customColorRow}>
                <View style={[styles.colorPreviewSmall, {backgroundColor: customHex}]} />
                <View style={styles.customColorInputContainer}>
                  <AppInput
                    value={customHex}
                    onChangeText={handleCustomHexChange}
                    placeholder="#FFFFFF"
                    style={styles.customColorInput}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.applyButton, {backgroundColor: C.textPrimary}]}
                  onPress={handleApplyCustomHex}>
                  <Text style={[styles.applyButtonText, {color: C.background}]}>
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
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
    borderColor: '#ddd',
  },
  colorText: {
    fontSize: fs(14),
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    paddingTop: ms(20),
    paddingBottom: ms(40),
    maxHeight: hs(500),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingBottom: ms(16),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  colorGridContainer: {
    maxHeight: hs(300),
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: ms(16),
    gap: ms(12),
  },
  colorItem: {
    width: ws(50),
    height: hs(50),
    borderRadius: rs(8),
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#007AFF',
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

