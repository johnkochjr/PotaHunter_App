import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ColorScheme, defaultTheme, themes } from '../theme/colors';

interface ThemeContextType {
  theme: ColorScheme;
  themeName: string;
  setTheme: (themeName: string) => void;
  availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<string>('orange');
  const [theme, setThemeColors] = useState<ColorScheme>(defaultTheme);

  const setTheme = (name: string) => {
    if (themes[name]) {
      setThemeName(name);
      setThemeColors(themes[name]);
    }
  };

  const availableThemes = Object.keys(themes);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
