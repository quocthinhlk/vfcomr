import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES } from '../../config/languages';

interface LanguageContextType {
  selectedLanguage: string;
  setLanguage: (languageCode: string) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Default to English

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem('appLanguage');
      if (storedLanguage) {
        setSelectedLanguage(storedLanguage);
      } else {
        // If no language is stored, set a default and save it
        await AsyncStorage.setItem('appLanguage', 'en');
      }
    } catch (error) {
      console.error('Error loading language from AsyncStorage:', error);
    }
  };

  const setLanguage = async (languageCode: string) => {
    try {
      await AsyncStorage.setItem('appLanguage', languageCode);
      setSelectedLanguage(languageCode);
      // Here you would typically also update your i18n library's locale
      // For example: i18n.changeLanguage(languageCode);
    } catch (error) {
      console.error('Error saving language to AsyncStorage:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 