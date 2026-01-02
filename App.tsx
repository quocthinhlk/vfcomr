// App.tsx
import React from 'react';
import * as eva from '@eva-design/eva';
import {
  ApplicationProvider,
} from '@ui-kitten/components';
import {
  Text as RNText,
  TextInput as RNTextInput,
  PixelRatio,
} from 'react-native';
import Navigation from './app/config/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './app/shared/context/LanguageContext';
import { ThemeProvider, useThemeMode } from './app/shared/context/ThemeContext';
import { enableScreens } from 'react-native-screens';
import { LogBox } from 'react-native';
import './app/shared/config/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/* ================================
   1. TẮT FONT SCALING TOÀN APP
================================ */

// React Native core
const disableFontScaling = () => {
  const AnyRNText: any = RNText;
  if (AnyRNText.defaultProps == null) {
    AnyRNText.defaultProps = {};
  }
  AnyRNText.defaultProps.allowFontScaling = false;

  const AnyRNTextInput: any = RNTextInput;
  if (AnyRNTextInput.defaultProps == null) {
    AnyRNTextInput.defaultProps = {};
  }
  AnyRNTextInput.defaultProps.allowFontScaling = false;
};

disableFontScaling();

/* ================================
   2. NORMALIZE FONT ANDROID (HD)
================================ */

// Giảm scale font Android HD để gần iOS
const fontScale = PixelRatio.getFontScale();
if (fontScale > 1) {
  PixelRatio.getFontScale = () => 1;
}

/* ================================
   APP SETUP
================================ */

LogBox.ignoreAllLogs(true);
enableScreens();

function AppInner() {
  const { theme } = useThemeMode();

  return (
    <ApplicationProvider
      {...eva}
      theme={theme === 'dark' ? eva.dark : eva.light}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageProvider>
            <Navigation />
          </LanguageProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ApplicationProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}