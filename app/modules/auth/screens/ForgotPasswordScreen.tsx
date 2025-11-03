//
//  ForgotPasswordScreen.tsx
//  
//
//  Created by Trương Quốc Thịnh on 21/6/25.
//

import React, { useState, useContext } from 'react';
import { View, Alert, SafeAreaView, ScrollView } from 'react-native';
import { Button, Input, Text, Layout } from '@ui-kitten/components';
import { globalStyles } from '../../../shared/styles/global';
import { authStyles } from '../styles';
import { forgotPassword } from '../services/auth.service';
import { BackButton } from '../../../shared/components/BackButton';
import { AuthContext } from '../../../config/navigation'; // Required if navigation is conditional based on auth state
import { useNavigation } from '@react-navigation/native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert('Success', 'Password reset link sent to your email!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Layout style={authStyles.container}>
        <BackButton />
        <Text category="h1" style={authStyles.title}>Forgot Password</Text>
        <Text style={{ marginBottom: 20 }}>Enter your email to receive a password reset link.</Text>

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={globalStyles.input}
        />

        <Button
          onPress={handleForgotPassword}
          disabled={isLoading}
          style={globalStyles.button}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </Layout>
    </SafeAreaView>
  );
}

