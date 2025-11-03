import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';

interface PlaceholderScreenProps {
  screenName: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  screenName,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.text}>{screenName} Screen</Text>
        <Text style={styles.subText}>This is a placeholder screen.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: 100
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#666',
  },
});