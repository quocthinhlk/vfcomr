import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { fs, ws, hs, ms, rs } from '../utils/scale';

// Form input height config - shared across AppInput and ElementDropdown
export const FORM_INPUT_HEIGHT = ms(35);

export const formStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: ms(20),
    backgroundColor: '#fff',
  },

  row: {
    flexDirection: 'row',
    gap: ms(12),
    marginBottom: ms(12),
  },

  rowTight: {
    flexDirection: 'row',
    gap: ms(8),
    marginBottom: ms(8),
  },

  // Row with space-between, useful for label + switch, etc.
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(12),
    marginBottom: ms(4),
  },

  // Generic row for button groups inside forms
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: ms(12),
    marginTop: ms(16),
  },

  input: {
    flex: 1,
    marginBottom: ms(15),
  },

  // Base text input style for React Native TextInput fields
  textField: {
    height: FORM_INPUT_HEIGHT,
    borderWidth: 1,
    borderRadius: rs(3),
    paddingLeft: ms(6),
  },

  select: {
    flex: 1,
    marginBottom: ms(15),
  },

  inputTextStyle: {
    fontSize: fs(12),
    paddingVertical: 0,
  },

  title: {
    marginBottom: ms(16),
    fontWeight: 'bold',
  },

  backButton: {
    marginBottom: ms(12),
    fontSize: fs(14),
  },

  label: {
    fontWeight: 'bold',
    marginBottom: ms(4),
    fontSize: fs(12),
  },

  subLabel: {
    color: '#8f9bb3',
    fontWeight: 'normal',
    marginBottom: ms(4),
    fontSize: fs(11),
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: rs(8),
    marginTop: ms(4),
  },

  dropdown: {
    borderColor: '#ccc',
    borderRadius: rs(8),
    height: ms(32),
  },

  dropdownContainer: {
    borderColor: '#ccc',
  },

  dropdownInput: {
    marginBottom: 0,
    zIndex: 1000,
  },

  filePickerButton: {
    borderRadius: rs(3),
    borderColor: '#e4e9f3',
    borderWidth: 1,
    padding: ms(10),
    backgroundColor: '#f8f9fc',
    marginBottom: ms(15),
  },

  filePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  avatarSquare: {
    width: Platform.OS === 'ios' ? ws(150) : ws(130),
    height: Platform.OS === 'ios' ? ws(150) : ws(130),
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: rs(8),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarClose: {
    position: 'absolute',
    top: ms(6),
    right: ms(6),
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: rs(10),
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
  },

  avatarPlus: {
    fontSize: fs(42),
    color: '#bbb',
    lineHeight: fs(42),
  },

  avatarHint: {
    fontSize: fs(12),
    color: '#8f9bb3',
    marginTop: ms(4),
  },

  addChildButton: {
    backgroundColor: COLORS.mainColor,
    borderRadius: rs(3),
    borderColor: COLORS.mainColor,
    width: ws(120),
    height: hs(40),
    fontSize: fs(10),
    marginTop: ms(8),
  },

  addChildButtonText: {
    fontSize: fs(7),
    fontWeight: '500',
  },

  // Phone input container style
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FORM_INPUT_HEIGHT,
    paddingHorizontal: ms(8),
    borderWidth: 1,
    borderRadius: rs(6),
  },

  // Phone input calling code text
  phoneCallingCodeText: {
    marginLeft: ms(8),
    fontSize: fs(14),
  },

  // Phone input text field
  phoneInputText: {
    flex: 1,
    marginLeft: ms(8),
    fontSize: fs(16),
  },
});


