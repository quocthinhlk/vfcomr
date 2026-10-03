import {COLORS} from '../constants/colors';
import {ThemeMode} from './theme';
import {useThemeMode} from '../context/ThemeContext';

/**
 * Semantic colour tokens for the shared CRUD UI (list cards, badges, detail,
 * delete confirmation, action sheet). Change a value here and every screen
 * that uses the shared components follows.
 */
export const getUiTokens = (theme: ThemeMode) =>
  theme === 'light'
    ? {
        sheetBg: '#FFFFFF',
        pressedBg: '#F2F4F7',
        brandText: COLORS.mainColor,
        brandTint: 'rgba(36,120,206,0.10)',
        successText: '#15803D',
        successTint: '#DCFCE7',
        warningText: '#B45309',
        warningTint: '#FEF3C7',
        dangerText: COLORS.dangerColor,
        dangerTint: '#FDECEE',
        neutralText: '#475467',
        neutralTint: '#F2F4F7',
        shadowOpacity: 0.06,
        backdropOpacity: 0.35,
      }
    : {
        sheetBg: '#151517',
        pressedBg: '#1C1C1E',
        brandText: '#6AA9EA',
        brandTint: 'rgba(106,169,234,0.16)',
        successText: '#4ADE80',
        successTint: 'rgba(74,222,128,0.14)',
        warningText: '#FBBF24',
        warningTint: 'rgba(251,191,36,0.14)',
        dangerText: '#FF6B78',
        dangerTint: 'rgba(255,107,120,0.14)',
        neutralText: '#C8CDD5',
        neutralTint: 'rgba(255,255,255,0.08)',
        shadowOpacity: 0,
        backdropOpacity: 0.6,
      };

export type UiTokens = ReturnType<typeof getUiTokens>;

export const useUiTokens = (): UiTokens => {
  const {theme} = useThemeMode();
  return getUiTokens(theme);
};
