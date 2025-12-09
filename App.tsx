// App.tsx
import React from 'react';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry, Text as UIKittenText, Input as UIKittenInput } from '@ui-kitten/components';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import Navigation from './app/config/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './app/shared/context/LanguageContext';
import { ThemeProvider, useThemeMode } from './app/shared/context/ThemeContext';
import { enableScreens } from 'react-native-screens';
import { LogBox } from 'react-native';
import './app/shared/config/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Turn off allowFontScaling for the entire app for Text and TextInput (React Native core)
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

// Add this for UI Kitten Text & Input (in case you are not using the default React Native Text directly)
const AnyUIKittenText: any = UIKittenText;
if (AnyUIKittenText.defaultProps == null) {
  AnyUIKittenText.defaultProps = {};
}
AnyUIKittenText.defaultProps.allowFontScaling = false;

const AnyUIKittenInput: any = UIKittenInput;
if (AnyUIKittenInput.defaultProps == null) {
  AnyUIKittenInput.defaultProps = {};
}
AnyUIKittenInput.defaultProps.allowFontScaling = false;

LogBox.ignoreAllLogs(true); // Disable all warnings (yellow box)

enableScreens();

function AppInner() {
  const { theme } = useThemeMode();
  return (
    <ApplicationProvider {...eva} theme={theme === 'dark' ? eva.dark : eva.light}>
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
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </>
  );
}
