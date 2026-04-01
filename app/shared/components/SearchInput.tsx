import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import {useThemedColors} from '../styles/theme';
import {useThemeMode} from '../context/ThemeContext';
import {getListStyles} from '../styles/list';
import {fs, ms, rs, ws} from '../utils/scale';
import {useTranslation} from '../hooks/useTranslation';
import {COLORS} from '../constants/colors';

const DEBOUNCE_MS = 380;

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  containerStyle?: ViewStyle;
  showClearButton?: boolean;
  autoFocus?: boolean;
  debounce?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  containerStyle,
  showClearButton = true,
  autoFocus = false,
  debounce = true,
}) => {
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const L = getListStyles(C, theme);
  const {t} = useTranslation();

  // Internal display value — updates instantly so typing feels immediate
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Sync if parent clears the value programmatically
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitChange = useCallback(
    (text: string) => {
      onChangeText(text);
    },
    [onChangeText],
  );

  const handleChangeText = (text: string) => {
    setInputValue(text);
    if (!debounce) {
      commitChange(text);
      return;
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      commitChange(text);
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setInputValue('');
    commitChange('');
  };

  const handleSubmit = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    // Commit immediately on keyboard submit
    commitChange(inputValue);
    onSubmitEditing?.();
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.inputBorder, COLORS.mainColor],
  });

  return (
    <Animated.View
      style={[
        L.searchContainer as any,
        {borderColor},
        containerStyle,
      ]}>
      <Text style={[styles.searchIcon, {color: isFocused ? COLORS.mainColor : C.textSecondary}]}>
        ⌕
      </Text>
      <TextInput
        style={[L.searchInput as any, styles.input]}
        placeholder={placeholder || t('search') || 'Search...'}
        placeholderTextColor={C.textSecondary}
        value={inputValue}
        onChangeText={handleChangeText}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {showClearButton && inputValue.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <View style={[styles.clearCircle, {backgroundColor: C.textSecondary + '33'}]}>
            <Text style={[styles.clearIcon, {color: C.textSecondary}]}>✕</Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  searchIcon: {
    fontSize: fs(20),
    marginLeft: ms(8),
    marginRight: ms(2),
    lineHeight: fs(24),
  },
  input: {
    paddingVertical: ms(6),
  },
  clearButton: {
    paddingHorizontal: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCircle: {
    width: ws(18),
    height: ws(18),
    borderRadius: rs(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    fontSize: fs(10),
    fontWeight: '700',
    lineHeight: fs(13),
  },
});

export default SearchInput;
