// App.tsx
import React from 'react';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import Navigation from './app/config/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './app/shared/context/LanguageContext';
import { ThemeProvider, useThemeMode } from './app/shared/context/ThemeContext';
import { enableScreens } from 'react-native-screens';
import { LogBox } from 'react-native';
import './app/shared/config/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

LogBox.ignoreAllLogs(true); // Tắt toàn bộ warning (yellow box)

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
