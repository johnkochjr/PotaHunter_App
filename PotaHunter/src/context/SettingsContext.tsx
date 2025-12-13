import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HRDSettings {
  ipAddress: string;
  port: number;
  enabled: boolean;
  myCallsign: string;
}

interface SettingsContextType {
  hrdSettings: HRDSettings;
  updateHRDSettings: (settings: Partial<HRDSettings>) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_HRD_SETTINGS: HRDSettings = {
  ipAddress: '127.0.0.1',
  port: 7810,  // HRD Relay server port (relay forwards to HRD on 7809)
  enabled: false,
  myCallsign: '',
};

const STORAGE_KEY = '@PotaHunter:settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [hrdSettings, setHRDSettings] = useState<HRDSettings>(DEFAULT_HRD_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHRDSettings({
          ...DEFAULT_HRD_SETTINGS,
          ...parsed.hrdSettings,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (settings: HRDSettings) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ hrdSettings: settings })
      );
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updateHRDSettings = async (updates: Partial<HRDSettings>) => {
    const newSettings = { ...hrdSettings, ...updates };
    setHRDSettings(newSettings);
    await saveSettings(newSettings);
  };

  return (
    <SettingsContext.Provider value={{ hrdSettings, updateHRDSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
