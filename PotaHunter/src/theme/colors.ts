// Color scheme definitions for PotaHunter
// Each theme has primary, secondary, background, surface, text, and accent colors

export interface ColorScheme {
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  hunted: string;      // Color for hunted parks indicator
  notHunted: string;   // Color for not-yet-hunted parks
}

export const orangeTheme: ColorScheme = {
  name: 'Orange',
  primary: '#F57C00',
  primaryLight: '#FFB74D',
  primaryDark: '#E65100',
  secondary: '#455A64',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  hunted: '#4CAF50',
  notHunted: '#BDBDBD',
};

export const blueTheme: ColorScheme = {
  name: 'Blue',
  primary: '#1976D2',
  primaryLight: '#64B5F6',
  primaryDark: '#0D47A1',
  secondary: '#455A64',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  hunted: '#4CAF50',
  notHunted: '#BDBDBD',
};

export const greenTheme: ColorScheme = {
  name: 'Green',
  primary: '#388E3C',
  primaryLight: '#81C784',
  primaryDark: '#1B5E20',
  secondary: '#455A64',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  hunted: '#1976D2',
  notHunted: '#BDBDBD',
};

export const purpleTheme: ColorScheme = {
  name: 'Purple',
  primary: '#7B1FA2',
  primaryLight: '#BA68C8',
  primaryDark: '#4A148C',
  secondary: '#455A64',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  hunted: '#4CAF50',
  notHunted: '#BDBDBD',
};

export const darkTheme: ColorScheme = {
  name: 'Dark',
  primary: '#FF9800',
  primaryLight: '#FFB74D',
  primaryDark: '#F57C00',
  secondary: '#78909C',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textOnPrimary: '#000000',
  border: '#333333',
  success: '#66BB6A',
  warning: '#FFCA28',
  error: '#EF5350',
  hunted: '#66BB6A',
  notHunted: '#616161',
};

export const themes: Record<string, ColorScheme> = {
  orange: orangeTheme,
  blue: blueTheme,
  green: greenTheme,
  purple: purpleTheme,
  dark: darkTheme,
};

export const defaultTheme = orangeTheme;
