// shared/styles/global.ts
import {StyleSheet} from 'react-native';
import {COLORS} from '../constants/colors';
import {ms, rs} from '../utils/scale';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginVertical: ms(10),
  },
  button: {
    marginTop: ms(15),
    backgroundColor: COLORS.mainColor,
    borderRadius: rs(3),
    borderColor: COLORS.mainColor,
    width: '100%',
  },
  backButton: {
    marginTop: ms(15),
    backgroundColor: COLORS.gray,
    borderRadius: rs(3),
    borderColor: COLORS.mainColor,
    width: '100%',
  },
  mainButton: {
    marginTop: ms(15),
    backgroundColor: COLORS.mainColor,
    borderRadius: rs(3),
    borderColor: COLORS.mainColor,
    width: '100%',
  },
  safeAreaView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  layout: {
    flex: 1,
    paddingHorizontal: ms(15),
    paddingBottom: ms(15),
    paddingTop: ms(5),
  },
});