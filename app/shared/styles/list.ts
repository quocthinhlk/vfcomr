import { StyleSheet } from 'react-native';
import { ThemeColors, ThemeMode } from './theme';
import { COLORS } from '../constants/colors';

export const getListStyles = (C: ThemeColors, theme: ThemeMode) => {
  const borderW = theme === 'light' ? 1 : StyleSheet.hairlineWidth;
  return {
    itemCard: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: borderW,
      borderColor: C.inputBorder,
      backgroundColor: C.surface,
      shadowColor: '#000',
      shadowOpacity: 0.08,
    } as const,
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
    } as const,
    avatarWrap: {
      marginRight: 12,
    } as const,
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: borderW,
      borderColor: C.inputBorder,
      backgroundColor: C.inputBg,
    } as const,
    avatarText: {
      fontWeight: '700',
      color: C.textPrimary,
    } as const,
    chevron: {
      fontSize: 22,
      lineHeight: 22,
      marginTop: 6,
      color: C.textSecondary,
    } as const,
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: borderW,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 10,
      height: 40,
      marginTop: 6,
      borderColor: C.inputBorder,
      backgroundColor: C.inputBg,
    } as const,
    searchIcon: {
      fontSize: 16,
      marginRight: 6,
      color: C.textSecondary,
    } as const,
    searchInput: {
      flex: 1,
      height: 40,
      color: C.inputText,
    } as const,

    // Pagination styles
    pageNumbersContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    } as const,
    pageNumber: {
      borderRadius: 16,
      borderWidth: borderW,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      marginLeft: 8,
      backgroundColor: C.surface,
      borderColor: C.inputBorder,
    } as const,
    pageNumberActive: {
      backgroundColor: COLORS.mainColor,
      borderColor: COLORS.mainColor,
    } as const,
    pageNumberDisabled: {
      opacity: 0.5,
    } as const,
    pageNumberText: {
      color: C.textPrimary,
      fontWeight: '600',
    } as const,
    pageNumberTextActive: {
      color: '#fff',
    } as const,

    // Swipe actions (right side) reusable styles
    swipeRightActions: {
      justifyContent: 'center',
      alignItems: 'flex-end',
      height: '100%',
      alignSelf: 'stretch',
    } as const,
    swipeDeleteButton: {
      minWidth: 96,
      paddingHorizontal: 14,
      paddingVertical: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.dangerColor,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
      marginVertical: 0,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      height: '100%',
      alignSelf: 'stretch',
    } as const,
    swipeDeleteIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    } as const,
    swipeDeleteText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
      marginTop: 6,
    } as const,
  };
};


