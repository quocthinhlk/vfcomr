import { useState, useContext } from 'react';
import axios from 'axios';
import { login } from '../services/auth.service';
import { AuthContext } from '../../../config/navigation';
import { requestNotificationPermissionAfterLogin } from '../../../shared/services/permissions.service';

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'loginFailed';
  }

  const backendMessage = error.response?.data?.message;
  const status = error.response?.status;

  if (
    backendMessage === 'sql: no rows in result set' ||
    status === 401 ||
    status === 404
  ) {
    return 'invalidCredentials';
  }

  return 'loginFailed';
}

export function useLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleLogin = async () => {
    // Clear previous error
    setErrorMessage('');
    
    if (!username || !password) {
      setErrorMessage('enterUsernameAndPassword');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login with username:', username);
      const response = await login({ username, password });
      console.log('Login successful, response:', response);
      setIsAuthenticated(true);
      void requestNotificationPermissionAfterLogin().catch(err =>
        console.warn('Post-login notification permission:', err),
      );
    } catch (error: unknown) {
      if (__DEV__) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const data = axios.isAxiosError(error) ? error.response?.data : undefined;
        console.log('Login failed for username:', username);
        console.log('Error status:', status);
        console.log('Error data:', data != null ? JSON.stringify(data) : undefined);
      }
      setErrorMessage(getLoginErrorMessage(error));
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
    errorMessage,
    handleLogin,
  };
} 