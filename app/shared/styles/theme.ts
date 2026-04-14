import { useThemeMode } from '../context/ThemeContext';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string; // screen background
  surface: string;    // cards, panels
  surfaceBorder: string; // border for cards/surfaces
  textPrimary: string;
  textSecondary: string;
  border: string;
  inputBg: string;
  inputText: string;
  inputBorder: string;
  overlay: string;
  bgSelectedOption: string; // background for selected option in dropdown
  error?: string; // error color (optional for backward compatibility)
};

export const THEME: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#fff',
    surface: '#fff',
    surfaceBorder: '#eee',
    textPrimary: '#111',
    textSecondary: '#666',
    border: '#ddd',
    inputBg: '#f9f9f9',
    inputText: '#000',
    inputBorder: '#ddd',
    overlay: 'rgba(0,0,0,0.3)',
    bgSelectedOption: '#f0f0f0',
    error: '#ff4444',
  },
  dark: {
    background: '#000',
    surface: '#0d0d0d',
    surfaceBorder: '#333',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    border: '#333',
    inputBg: '#0d0d0d',
    inputText: '#fff',
    inputBorder: '#333',
    overlay: 'rgba(0,0,0,0.6)',
    bgSelectedOption: '#242323',
    error: '#ff4444',
  }
};

export const useThemedColors = (): ThemeColors => {
  const { theme } = useThemeMode();
  return THEME[theme];
};


