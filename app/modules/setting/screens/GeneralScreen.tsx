import React, {useCallback} from 'react';
import {View, ScrollView, Switch} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {useThemedColors} from '../../../shared/styles/theme';
import {ms, rs, fs, ws} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';

export default function GeneralScreen() {
  const {t} = useTranslation();
  const {theme, setTheme} = useThemeMode();
  const C = useThemedColors();
  const onToggleChange = useCallback(
    (checked: boolean) => {
      setTheme(checked ? 'dark' : 'light');
    },
    [setTheme],
  );

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('general')} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{padding: 0}}>
          <View
            style={{
              marginTop: ms(16),
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: rs(12),
              padding: ms(16),
            }}>
            <Text
              category="label"
              style={{marginBottom: ms(8), fontSize: fs(12), color: C.textSecondary}}>
              {t('theme')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={{color: C.textPrimary, fontSize: fs(14)}}>
                {theme === 'dark' ? t('darkMode') : t('lightMode')}
              </Text>
              <Switch
                style={{transform: [{scaleX: 0.9}, {scaleY: 0.9}]}}
                value={theme === 'dark'}
                onValueChange={onToggleChange}
                thumbColor={COLORS.white}
                trackColor={{
                  false: theme === 'dark' ? C.border : C.border,
                  true: COLORS.mainColor,
                }}
              />
            </View>
            <Text style={{marginTop: ms(8), color: C.textSecondary, fontSize: fs(12)}}>
              {t('themeDescription')}
            </Text>
          </View>
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}


