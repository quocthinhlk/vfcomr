import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { Layout, Text } from '@ui-kitten/components';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function RationalisingScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={globalStyles.safeAreaView}>
      <Layout style={globalStyles.layout}>
        <Header title={t('rationalisingTownNames')} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          <View>
            <Text category="s1">{t('rationalisingTownNames')}</Text>
          </View>
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}


