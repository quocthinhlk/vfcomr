// app/shared/components/AppInput.tsx
import React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { fs, ws, ms, rs } from '../utils/scale';
import { useThemedColors } from '../styles/theme';
import { FORM_INPUT_HEIGHT } from '../styles/form';

type Props = TextInputProps & {
  error?: boolean;
  containerStyle?: ViewStyle;
};

export default function AppInput(props: Props) {
  const { style, error, containerStyle, ...rest } = props;
  const C = useThemedColors();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: C.inputBg,
        borderColor: error ? C.error || '#ff4444' : C.inputBorder,
      },
      containerStyle,
    ]}>
      <TextInput
        {...rest}
        allowFontScaling={false}
        placeholderTextColor={C.textSecondary}
        textAlignVertical={rest.multiline ? 'top' : 'center'}
        style={[
          styles.input,
          {
            color: C.inputText,
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: rs(3),
    paddingLeft: ms(6),
    paddingRight: ms(12),
    justifyContent: 'center',
  },

  input: {
    fontSize: fs(14),
    height: FORM_INPUT_HEIGHT,
    paddingVertical: ms(8),
  },
});