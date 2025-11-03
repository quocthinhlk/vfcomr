import { useState, useContext } from 'react';
import { Alert } from 'react-native';
import { login } from '../services/auth.service';
import { AuthContext } from '../../../config/navigation';

export function useLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await login({ username, password });
      console.log('API response:', response);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.log('Login error:', error);
      Alert.alert('Login Failed', error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    isLoading,
    showPassword,
    setShowPassword,
    handleLogin,
  };
} 