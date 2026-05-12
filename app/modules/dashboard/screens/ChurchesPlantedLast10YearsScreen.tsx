import React from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {Layout, Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';

export const ChurchesPlantedLast10YearsScreen = () => {
  const C = useThemedColors();

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title="Churches Planted (Last 10 Years)" />

        <View style={styles.content}>
          <View style={[styles.card, {backgroundColor: C.surface, borderColor: C.border}]}>
            <View style={[styles.iconWrap, {backgroundColor: C.border}]}>
              <Text style={[styles.iconText, {color: C.textPrimary}]}>🌱</Text>
            </View>

            <Text style={[styles.title, {color: C.textPrimary}]}>Feature under development</Text>
            <Text style={[styles.message, {color: C.textSecondary}]}>
              We're working on this feature and it will be available soon.
            </Text>
          </View>
        </View>
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 34,
    lineHeight: 38,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 340,
  },
});
