import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet} from 'react-native';
import {Button, Layout, Text} from '@ui-kitten/components';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BackButton} from '../../../shared/components/BackButton';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import type {RootStackParamList} from '../../../config/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={globalStyles.safeAreaView}>
      <Header />
      <Layout style={globalStyles.layout}>
        <BackButton title="Settings" />
        <ScrollView contentContainerStyle={styles.body}>
          <Text category="s1" style={styles.lead}>
            App settings and preferences.
          </Text>
          <Button
            appearance="outline"
            style={styles.btn}
            onPress={() => navigation.navigate('PermissionExamples')}>
            Permission examples (diagnostics)
          </Button>
          <Text appearance="hint" category="c1" style={styles.hint}>
            Opens a sample screen to check camera, photos, location, and notification
            permissions. Use only when testing — production users rarely need this entry.
          </Text>
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  body: {padding: 16, paddingBottom: 32},
  lead: {marginBottom: 16},
  btn: {marginBottom: 12},
  hint: {marginTop: 4},
});
