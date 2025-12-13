import React, { useState } from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { SpotsListScreen } from './src/screens/SpotsListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Screen = 'spots' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('spots');

  return (
    <ThemeProvider>
      <SettingsProvider>
        {currentScreen === 'spots' ? (
          <SpotsListScreen onOpenSettings={() => setCurrentScreen('settings')} />
        ) : (
          <SettingsScreen onBack={() => setCurrentScreen('spots')} />
        )}
      </SettingsProvider>
    </ThemeProvider>
  );
}
