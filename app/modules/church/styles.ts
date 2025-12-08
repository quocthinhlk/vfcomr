import { StyleSheet } from 'react-native';
import { COLORS } from '../../shared/constants/colors';

export const churchStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 15,
    },
    input: {
        flex: 1,
    },
    inputTextStyle: {
        fontSize: 14,
    },
    title: {
        marginBottom: 16,
        fontWeight: 'bold',
    },
    backButton: {
        marginBottom: 12,
        fontSize: 14,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginTop: 4,
    },
    dropdown: {
        borderColor: '#ccc',
        borderRadius: 8,
        height: 48,
    },
    dropdownContainer: {
        borderColor: '#ccc',
    },
    dropdownInput: {
        marginBottom: 0,
        zIndex: 1000,
    },
    label: {
        color: '#8f9bb3',
        fontWeight: 'bold',
        marginBottom: 4,
        fontSize: 11,
    },
    subLabel: {
        color: '#8f9bb3',
        fontWeight: 'normal',
        marginBottom: 4,
        fontSize: 11,
    },
    filePickerButton: {
        borderRadius: 3,
        borderColor: '#e4e9f3',
        borderWidth: 1,
        padding: 10,
        backgroundColor: '#f8f9fc',
    },
    filePickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarSquare: {
        width: 150,
        height: 150,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
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
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    avatarPlus: {
        fontSize: 42,
        color: '#bbb',
        lineHeight: 42,
    },
    addChildButton: {
        backgroundColor: COLORS.mainColor,
        borderRadius: 3,
        borderColor: COLORS.mainColor,
        width: 120,
        height: 40,
        fontSize: 10,
        marginTop: 8,
    },
    addChildButtonText: {
        fontSize: 7,
        fontWeight: '500',
    },
});

