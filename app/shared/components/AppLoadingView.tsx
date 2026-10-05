import React from 'react';
import {ActivityIndicator, Image, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useThemedColors} from '../styles/theme';
import {useTranslation} from '../hooks/useTranslation';
import {COLORS} from '../constants/colors';
import {fs, ms, ws} from '../utils/scale';

const LOGO = require('../../assets/images/logo.png');
// Source image is 874 x 614.
const LOGO_ASPECT = 874 / 614;

type Props = {
  /** Text under the spinner; defaults to `${t('loading')}...`. */
  message?: string;
};

/** Full-screen loading state: project logo, spinner and "Loading...". */
export const AppLoadingView: React.FC<Props> = ({message}) => {
  const C = useThemedColors();
  const {t} = useTranslation();
  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.content} accessibilityRole="progressbar">
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <ActivityIndicator size="large" color={COLORS.mainColor} />
        <Text style={[styles.text, {color: C.textPrimary}]}>
          {message ?? `${t('loading')}...`}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: ms(12),
  },
  logo: {
    width: ws(140),
    height: ws(140) / LOGO_ASPECT,
    marginBottom: ms(8),
  },
  text: {
    fontSize: fs(15),
  },
});

export default AppLoadingView;
