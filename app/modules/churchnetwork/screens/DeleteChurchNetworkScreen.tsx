import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteChurchNetwork,
  getChurchNetworkById,
} from '../services/churchnetwork.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {fs, ms, ws} from '../../../shared/utils/scale';
import {returnToList} from '../../../shared/utils/returnToList';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {
  AlertIcon,
  getNetworkTokens,
  networkStyles,
} from '../components/ChurchNetworkUI';

export const DeleteChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const T = getNetworkTokens(theme);

  useEffect(() => {
    let mounted = true;
    if (churchNetworkId) {
      getChurchNetworkById(churchNetworkId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setName(res?.data?.name || 'this church network');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [churchNetworkId]);

  const onConfirm = async () => {
    if (!churchNetworkId) return;
    try {
      setSubmitting(true);
      setErrorMessage('');
      await deleteChurchNetwork(churchNetworkId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchNetwork')} ${t('success')}`);
      returnToList(navigation);
    } catch (e: any) {
      const detail = e?.response?.data?.errors?.detail;
      setErrorMessage(
        (typeof detail === 'string' && detail.trim()) || getApiErrorMessage(e, t),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const [before, after] = t('deleteChurchNetworkMessage').split('{name}');

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[networkStyles.screen, {backgroundColor: C.background}]}>
        <Header title={`${t('delete')} ${t('churchNetwork')}`} showMenu={false} />

        <View style={styles.content}>
          <View style={[styles.iconWrap, {backgroundColor: T.dangerTint}]}>
            <AlertIcon color={T.dangerText} />
          </View>
          <Text
            style={[styles.title, {color: C.textPrimary}]}
            accessibilityRole="header">
            {t('deleteChurchNetworkTitle')}
          </Text>
          <Text style={[styles.message, {color: C.textSecondary}]}>
            {before}
            <Text style={[styles.name, {color: C.textPrimary}]}>
              {name || '…'}
            </Text>
            {after}
          </Text>

          {errorMessage ? (
            <View style={[styles.errorBox, {backgroundColor: T.dangerTint}]}>
              <Text style={[styles.errorText, {color: T.dangerText}]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Cancel first (safe default), Delete on the trailing side. */}
          <View style={styles.buttons}>
            <CancelButton
              label={t('cancel')}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            />
            <DeleteButton
              label={submitting ? t('deleting') : t('delete')}
              onPress={onConfirm}
              disabled={submitting || !churchNetworkId}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    marginTop: ms(24),
    alignItems: 'center',
  },
  iconWrap: {
    width: ws(56),
    height: ws(56),
    borderRadius: ws(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ms(14),
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: ms(8),
    fontSize: fs(14),
    lineHeight: fs(21),
    textAlign: 'center',
  },
  name: {
    fontWeight: '700',
  },
  errorBox: {
    marginTop: ms(16),
    alignSelf: 'stretch',
    borderRadius: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
  },
  errorText: {
    fontSize: fs(13),
    lineHeight: fs(18),
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(24),
    alignSelf: 'stretch',
  },
});

export default DeleteChurchNetworkScreen;
