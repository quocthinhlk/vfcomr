import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms, rs} from '../../../shared/utils/scale';

export default function AddNewResourceScreen() {
  const C = useThemedColors();
  const {t} = useTranslation();

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('addNewResource')} />
        <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.inputBorder}]}>
          <Text style={[styles.title, {color: C.textPrimary}]}>{t('addNewResource')}</Text>
          <Text style={[styles.subtitle, {color: C.textSecondary}]}>
            {t('addNewResourceDescription')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  card: {
    marginTop: ms(10),
    borderWidth: 1,
    borderRadius: rs(8),
    padding: ms(14),
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
    marginBottom: ms(8),
  },
  subtitle: {
    fontSize: fs(14),
  },
});
