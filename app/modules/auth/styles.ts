import { StyleSheet } from 'react-native';
import {COLORS} from '../../shared/constants/colors';

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 85,
  },
  title: {
    marginTop: 20,
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: 20,
    zIndex: 1,
  },
  passwordToggleIcon: {
    width: 20,
    height: 20,
  },
  subTitle: {
    padding: 20,
    textAlign: 'center',
    fontSize: 15
  },
  forgotPassword: {
    width: '100%',
  },
  forgotPasswordTxt: {
    paddingTop: 15,
    textAlign: 'right',
    color: COLORS.mainColor,
    fontWeight: 'bold',
  },
});

