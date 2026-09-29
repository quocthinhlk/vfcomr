import React from 'react';
import {ActivityIndicator, StyleSheet, TouchableOpacity} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {COLORS} from '../../../shared/constants/colors';
import {fs, ms} from '../../../shared/utils/scale';

type Props = {
  saving: boolean;
  onPress: () => void;
};

export function ChartSaveButton({saving, onPress}: Props) {
  const {t} = useTranslation();
  const label = t('saveAsJpeg') || 'Save as JPEG';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={saving}
      style={[styles.btn, saving ? styles.disabled : null]}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {saving ? (
        <ActivityIndicator color={COLORS.mainColor} size="small" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: ms(2),
    minHeight: ms(24),
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: fs(13),
    fontWeight: '600',
    color: COLORS.mainColor,
  },
});
