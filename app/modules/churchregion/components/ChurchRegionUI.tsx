import React from 'react';
import {Image, StyleSheet, TouchableOpacity} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../../../shared/styles/theme';
import {formStyles} from '../../../shared/styles/form';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {FormField} from '../../../shared/components/crud';

type LogoFieldProps = {
  /** Image to preview (newly picked or existing), or null for the "+" tile. */
  imageUri: string | null;
  onPick: () => void;
  onClear: () => void;
};

/** Square logo picker with a ✗ to remove the current image. */
export const ChurchRegionLogoField: React.FC<LogoFieldProps> = ({
  imageUri,
  onPick,
  onClear,
}) => {
  const {t} = useTranslation();
  const C = useThemedColors();
  return (
    <FormField label={t('logo')}>
      <TouchableOpacity
        onPress={onPick}
        accessibilityRole="button"
        accessibilityLabel={t('logo')}
        style={
          [
            formStyles.avatarSquare as any,
            {backgroundColor: C.inputBg, borderColor: C.inputBorder},
          ] as any
        }>
        {imageUri ? (
          <>
            <Image
              source={{uri: imageUri}}
              style={formStyles.avatarImage as any}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={onClear}
              style={formStyles.avatarClose as any}>
              <Text style={styles.closeText}>✗</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text
            style={[formStyles.avatarPlus as any, {color: C.textSecondary}] as any}>
            +
          </Text>
        )}
      </TouchableOpacity>
    </FormField>
  );
};

const styles = StyleSheet.create({
  closeText: {
    color: '#fff',
  },
});
