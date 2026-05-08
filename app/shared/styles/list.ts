import {StyleSheet} from 'react-native';
import {ThemeColors, ThemeMode} from './theme';
import {COLORS} from '../constants/colors';
import {fs, ws, hs, ms, rs} from '../utils/scale';

export const getListStyles = (C: ThemeColors, theme: ThemeMode) => {
  const borderW = theme === 'light' ? 1 : StyleSheet.hairlineWidth;
  return {
    itemCard: {
      borderRadius: rs(12),
      padding: ms(12),
      marginBottom: ms(10),
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
      paddingVertical: ms(2),
    } as const,
    avatarWrap: {
      marginRight: ms(12),
    } as const,
    avatar: {
      width: ws(40),
      height: ws(40),
      borderRadius: rs(20),
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
    /** Rectangular list thumbnail (e.g. church photo) */
    avatarPhotoWrap: {
      width: ws(48),
      height: hs(36),
      overflow: 'hidden',
      borderWidth: borderW,
      borderColor: C.inputBorder,
      backgroundColor: C.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    } as const,
    avatarPhoto: {
      width: '100%',
      height: '100%',
    } as const,
    chevron: {
      fontSize: fs(22),
      lineHeight: fs(22),
      marginTop: ms(6),
      color: C.textSecondary,
    } as const,
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: borderW,
      borderRadius: rs(6),
      marginBottom: ms(10),
      height: ws(35),
      marginTop: ms(6),
      borderColor: C.inputBorder,
      backgroundColor: C.inputBg,
    } as const,
    searchIcon: {
      fontSize: fs(12),
      marginRight: ms(4),
      marginLeft: ms(4),
      color: C.textSecondary,
    } as const,
    searchInput: {
      flex: 1,
      // height: ws(35),
      fontSize: fs(12),
      color: C.inputText,
    } as const,

    // Pagination styles
    pageNumbersContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    } as const,
    pageNumber: {
      width: ws(25),
      height: ws(25),
      borderRadius: rs(3),
      borderWidth: borderW,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: ms(8),
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
      fontSize: fs(11),
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
      minWidth: ws(96),
      paddingHorizontal: ms(14),
      paddingVertical: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.dangerColor,
      borderTopLeftRadius: rs(12),
      borderBottomLeftRadius: rs(12),
      marginVertical: 0,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: rs(6),
      shadowOffset: {width: 0, height: hs(2)},
      elevation: 3,
      height: '100%',
      alignSelf: 'stretch',
    } as const,
    swipeDeleteIconWrap: {
      width: ws(32),
      height: ws(32),
      borderRadius: rs(16),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    } as const,
    swipeDeleteText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: fs(12),
      marginTop: ms(6),
    } as const,
  };
};


