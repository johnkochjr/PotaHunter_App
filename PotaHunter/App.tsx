import React, { useState } from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { SpotsListScreen } from './src/screens/SpotsListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { InternalLogsScreen } from './src/screens/InternalLogsScreen';

type Screen = 'spots' | 'settings' | 'logs';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('spots');

  return (
    <ThemeProvider>
      <SettingsProvider>
        {currentScreen === 'spots' ? (
          <SpotsListScreen onOpenSettings={() => setCurrentScreen('settings')} />
        ) : currentScreen === 'settings' ? (
          <SettingsScreen 
            onBack={() => setCurrentScreen('spots')} 
            onOpenLogs={() => setCurrentScreen('logs')}
          />
        ) : (
          <InternalLogsScreen onBack={() => setCurrentScreen('settings')} />
        )}
      </SettingsProvider>
    </ThemeProvider>
  );
}
