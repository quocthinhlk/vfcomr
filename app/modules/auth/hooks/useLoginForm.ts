import { useState, useContext } from 'react';
import { login } from '../services/auth.service';
import { AuthContext } from '../../../config/navigation';

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
    } catch (error: any) {
      // Debug logging
      if (error && typeof error === 'object') {
        console.log('Login failed for username:', username);
        console.log('Error status:', error.response?.status);
        console.log('Error data:', JSON.stringify(error.response?.data));
        
        // Check for specific error messages
        const backendMessage = error.response?.data?.message || error.message;
        
        if (backendMessage === 'sql: no rows in result set' || 
            error.response?.status === 401 ||
            error.response?.status === 404) {
          setErrorMessage('invalidCredentials');
        } else {
          setErrorMessage('loginFailed');
        }
      } else {
        setErrorMessage('loginFailed');
      }
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