// shared/styles/global.ts
import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginVertical: 10,
  },
  button: {
    marginTop: 15,
    backgroundColor: COLORS.mainColor,
    borderRadius: 3,
    borderColor: COLORS.mainColor,
    width: '100%',
  },
  safeAreaView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  layout: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 5
  }
});