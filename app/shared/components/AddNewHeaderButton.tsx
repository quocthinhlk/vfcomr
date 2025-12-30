import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {COLORS} from '../constants/colors';
import {fs, ms, rs, ws} from '../utils/scale';
import {FORM_INPUT_HEIGHT} from '../styles/form';

type Props = {
  /** Tên route để điều hướng, ví dụ: 'AddUser' */
  name: string;
  /** Text hiển thị cho nút, ví dụ: t('addNew') */
  text: string;
  /** Ký tự prefix, mặc định là '+' */
  prefix?: string;
  /** Tham số điều hướng, ví dụ: { id: userId } */
  params?: Record<string, any>;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function AddNewHeaderButton({
  name,
  text,
  prefix = '+',
  params,
  style,
  textStyle,
}: Props) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (name) {
      if (params) {
        navigation.navigate(name as never, params as never);
      } else {
        navigation.navigate(name as never);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      activeOpacity={0.8}
      onPress={handlePress}>
      <Text style={[styles.text, textStyle]}>
        {prefix ? `${prefix} ${text}` : text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.mainColor,
    paddingHorizontal: ms(10),
    borderRadius: rs(3),
    marginTop: ms(6),
    height: ws(28),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: fs(12),
  },
});


