import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Toggle } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemeMode } from '../../../shared/context/ThemeContext';
import { useThemedColors } from '../../../shared/styles/theme';

export default function GeneralScreen() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeMode();
  const C = useThemedColors();
  const onToggleChange = useCallback((checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  }, [setTheme]);

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
        <Header title={t('general')} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 0 }}>
          <View style={{ marginTop: 16, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16 }}>
            <Text category="label" style={{ marginBottom: 8, color: C.textSecondary }}>{t('theme')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: C.textPrimary }}>{theme === 'dark' ? t('darkMode') : t('lightMode')}</Text>
              <Toggle checked={theme === 'dark'} onChange={onToggleChange} />
            </View>
            <Text style={{ marginTop: 8, color: C.textSecondary }}>
              {t('themeDescription')}
            </Text>
          </View>
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}


