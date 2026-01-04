import React from 'react';
import {View, TextInput, Text, TouchableOpacity, StyleSheet, ViewStyle, TextInputProps} from 'react-native';
import {useThemedColors} from '../styles/theme';
import {useThemeMode} from '../context/ThemeContext';
import {getListStyles} from '../styles/list';
import {fs, ms} from '../utils/scale';
import {useTranslation} from '../hooks/useTranslation';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  containerStyle?: ViewStyle;
  showClearButton?: boolean;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  containerStyle,
  showClearButton = true,
  autoFocus = false,
}) => {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();

  return (
    <View style={[L.searchContainer as any, containerStyle]}>
      <Text style={L.searchIcon as any}>🔎</Text>
      <TextInput
        style={L.searchInput as any}
        placeholder={placeholder || t('search') || 'Search...'}
        placeholderTextColor={C.textSecondary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
      />
      {showClearButton && value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={styles.clearButton}>
          <Text style={[styles.clearIcon, {color: C.textSecondary}]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  clearButton: {
    padding: ms(4),
    marginRight: ms(4),
  },
  clearIcon: {
    fontSize: fs(14),
    fontWeight: '600',
  },
});

export default SearchInput;

