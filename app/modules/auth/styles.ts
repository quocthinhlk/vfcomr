import { StyleSheet } from 'react-native';
import {COLORS} from '../../shared/constants/colors';
import {fs, ws, hs, ms} from '../../shared/utils/scale';

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(20),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: ms(40),
  },
  logo: {
    width: ws(220),
    height: ws(100),
  },
  title: {
    marginTop: ms(20),
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    right: ms(12),
    top: ms(5),
    height: hs(24),
    width: ws(24),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  passwordToggleIcon: {
    width: ws(20),
    height: hs(20),
  },
  subTitle: {
    paddingTop: ms(10),
    textAlign: 'center',
    fontSize: fs(15)
  },
  forgotPassword: {
    width: '100%',
  },
  forgotPasswordTxt: {
    paddingTop: ms(15),
    textAlign: 'right',
    color: COLORS.mainColor,
    fontWeight: '600',
    fontSize: fs(15),
  },
  errorText: {
    fontSize: fs(12),
    lineHeight: fs(16),
    textAlign: 'center',
    fontWeight: '400',
  },
});

